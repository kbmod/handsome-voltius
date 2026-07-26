export function formatKnownHostEndpoint(host: string, port: number): string {
  const bareHost = host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
  return port === 22 ? bareHost : `[${bareHost}]:${port}`;
}
