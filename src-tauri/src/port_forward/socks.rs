use crate::port_forward::ForwardError;
use russh::ChannelMsg;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

#[derive(Debug)]
pub(crate) enum SocksTunnelStatus {
    Active,
    Error(String),
}

/// Bind a local SOCKS5 listener and spawn an accept loop.
/// Returns `(bound_local_port, bytes_transferred_counter)`.
pub async fn create_socks_tunnel(
    handle: Arc<russh::client::Handle<crate::ssh::client::SshClient>>,
    local_port: u16,
    cancel: CancellationToken,
    status_tx: mpsc::UnboundedSender<SocksTunnelStatus>,
) -> Result<(u16, Arc<AtomicU64>), ForwardError> {
    let mut listener = None;
    let mut bound_port = local_port;

    for offset in 0..5u16 {
        let try_port = local_port.saturating_add(offset);
        if let Ok(l) = crate::port_forward::bind::bind_loopback(try_port).await {
            bound_port = try_port;
            listener = Some(l);
            break;
        }
    }

    let listener = listener.ok_or(ForwardError::PortInUse(local_port, 5))?;
    let cancel2 = cancel.clone();
    let bytes = Arc::new(AtomicU64::new(0));
    let bytes_accept = Arc::clone(&bytes);

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = cancel2.cancelled() => break,
                result = listener.accept() => {
                    let Ok((tcp_stream, _)) = result else { break };
                    tokio::spawn(socks_bridge(
                        Arc::clone(&handle),
                        tcp_stream,
                        bound_port,
                        cancel2.clone(),
                        Arc::clone(&bytes_accept),
                        status_tx.clone(),
                    ));
                }
            }
        }
    });

    Ok((bound_port, bytes))
}

async fn socks_bridge(
    handle: Arc<russh::client::Handle<crate::ssh::client::SshClient>>,
    mut tcp: TcpStream,
    local_port: u16,
    cancel: CancellationToken,
    bytes: Arc<AtomicU64>,
    status_tx: mpsc::UnboundedSender<SocksTunnelStatus>,
) {
    let (target_host, target_port) = match negotiate_socks5(&mut tcp).await {
        Ok(t) => t,
        Err(_) => return,
    };

    let ch = match handle
        .channel_open_direct_tcpip(
            &target_host,
            target_port as u32,
            "127.0.0.1",
            local_port as u32,
        )
        .await
    {
        Ok(c) => c,
        Err(error) => {
            let message =
                format!("SOCKS5 connection to {target_host}:{target_port} failed: {error}");
            let _ = status_tx.send(SocksTunnelStatus::Error(message));
            let reply = match error {
                russh::Error::ChannelOpenFailure(
                    russh::ChannelOpenFailure::AdministrativelyProhibited,
                ) => 0x02,
                russh::Error::ChannelOpenFailure(russh::ChannelOpenFailure::ResourceShortage) => {
                    0x01
                }
                _ => 0x04,
            };
            let _ = tcp.write_all(&socks5_reply(reply)).await;
            return;
        }
    };
    let _ = status_tx.send(SocksTunnelStatus::Active);

    // Send SOCKS5 success reply: bound address 0.0.0.0:0
    if tcp.write_all(&socks5_reply(0x00)).await.is_err() {
        return;
    }

    let (mut ch_read, ch_write) = ch.split();
    let mut ch_writer = ch_write.make_writer();
    let (mut tcp_r, mut tcp_w) = tokio::io::split(tcp);

    let c1 = cancel.clone();
    let bytes_up = Arc::clone(&bytes);
    let tcp_to_ssh = tokio::spawn(async move {
        let mut buf = [0u8; 65536];
        loop {
            tokio::select! {
                _ = c1.cancelled() => break,
                result = tcp_r.read(&mut buf) => {
                    match result {
                        Ok(0) | Err(_) => break,
                        Ok(n) => {
                            if ch_writer.write_all(&buf[..n]).await.is_err() { break; }
                            bytes_up.fetch_add(n as u64, Ordering::Relaxed);
                        }
                    }
                }
            }
        }
    });

    let c2 = cancel.clone();
    let bytes_down = Arc::clone(&bytes);
    let ssh_to_tcp = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = c2.cancelled() => break,
                msg = ch_read.wait() => match msg {
                    Some(ChannelMsg::Data { data }) => {
                        if tcp_w.write_all(&data).await.is_err() { break; }
                        bytes_down.fetch_add(data.len() as u64, Ordering::Relaxed);
                    }
                    Some(ChannelMsg::Eof) | Some(ChannelMsg::Close) | None => break,
                    _ => {}
                }
            }
        }
    });

    let _ = tokio::join!(tcp_to_ssh, ssh_to_tcp);
}

/// Perform SOCKS5 handshake; return (target_host, target_port) on success.
async fn negotiate_socks5<S>(tcp: &mut S) -> Result<(String, u16), ()>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    // --- Auth negotiation ---
    let mut header = [0u8; 2];
    tcp.read_exact(&mut header).await.map_err(|_| ())?;
    let ver = header[0];
    let nmethods = header[1] as usize;
    if ver != 0x05 {
        return Err(());
    }
    let mut methods = vec![0u8; nmethods];
    tcp.read_exact(&mut methods).await.map_err(|_| ())?;

    if !methods.contains(&0x00) {
        // No acceptable auth method
        let _ = tcp.write_all(&[0x05, 0xFF]).await;
        return Err(());
    }
    // Accept no-auth
    tcp.write_all(&[0x05, 0x00]).await.map_err(|_| ())?;

    // --- CONNECT request ---
    let mut req = [0u8; 4];
    tcp.read_exact(&mut req).await.map_err(|_| ())?;
    if req[0] != 0x05 {
        return Err(());
    }
    let cmd = req[1];
    let atyp = req[3];

    if cmd != 0x01 {
        // Command not supported
        let _ = tcp.write_all(&socks5_reply(0x07)).await;
        return Err(());
    }

    let host = match atyp {
        0x01 => {
            // IPv4
            let mut addr = [0u8; 4];
            tcp.read_exact(&mut addr).await.map_err(|_| ())?;
            format!("{}.{}.{}.{}", addr[0], addr[1], addr[2], addr[3])
        }
        0x03 => {
            // Domain
            let mut len = [0u8; 1];
            tcp.read_exact(&mut len).await.map_err(|_| ())?;
            let mut domain = vec![0u8; len[0] as usize];
            tcp.read_exact(&mut domain).await.map_err(|_| ())?;
            String::from_utf8(domain).map_err(|_| ())?
        }
        0x04 => {
            // IPv6
            let mut addr = [0u8; 16];
            tcp.read_exact(&mut addr).await.map_err(|_| ())?;
            std::net::Ipv6Addr::from(addr).to_string()
        }
        _ => {
            let _ = tcp.write_all(&socks5_reply(0x08)).await;
            return Err(());
        }
    };

    let mut port_bytes = [0u8; 2];
    tcp.read_exact(&mut port_bytes).await.map_err(|_| ())?;
    let port = u16::from_be_bytes(port_bytes);

    Ok((host, port))
}

fn socks5_reply(rep: u8) -> [u8; 10] {
    // VER REP RSV ATYP BND.ADDR(4 bytes IPv4 0.0.0.0) BND.PORT(2 bytes 0)
    [0x05, rep, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stream_pair() -> (tokio::io::DuplexStream, tokio::io::DuplexStream) {
        tokio::io::duplex(256)
    }

    #[tokio::test]
    async fn negotiates_domain_target_and_remote_dns() {
        let (mut client, mut server) = stream_pair();
        let domain = b"example.com";
        let mut request = vec![0x05, 0x01, 0x00, 0x05, 0x01, 0x00, 0x03, domain.len() as u8];
        request.extend_from_slice(domain);
        request.extend_from_slice(&443u16.to_be_bytes());
        client.write_all(&request).await.unwrap();

        let target = negotiate_socks5(&mut server).await.unwrap();
        assert_eq!(target, ("example.com".to_string(), 443));

        let mut auth_reply = [0u8; 2];
        client.read_exact(&mut auth_reply).await.unwrap();
        assert_eq!(auth_reply, [0x05, 0x00]);
    }

    #[tokio::test]
    async fn formats_ipv6_without_uri_brackets_for_ssh() {
        let (mut client, mut server) = stream_pair();
        let address: std::net::Ipv6Addr = "2001:db8::1".parse().unwrap();
        let mut request = vec![0x05, 0x01, 0x00, 0x05, 0x01, 0x00, 0x04];
        request.extend_from_slice(&address.octets());
        request.extend_from_slice(&80u16.to_be_bytes());
        client.write_all(&request).await.unwrap();

        let target = negotiate_socks5(&mut server).await.unwrap();
        assert_eq!(target, ("2001:db8::1".to_string(), 80));
    }
}
