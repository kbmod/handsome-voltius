> [!WARNING]
> **Work in progress.** Handsome Voltius is a personal-use project and is not
> currently a finished or supported release. It targets Debian/WebKitGTK.

<div align="center">
  <img src="src-tauri/icons/128x128.png" alt="Handsome Voltius logo" width="96" />
  <h1>Handsome Voltius</h1>
  <p><strong>A polished Debian-focused SSH and SFTP desktop client.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/status-work_in_progress-f59e0b" alt="Work in progress" />
    <img src="https://img.shields.io/badge/built_with-Rust-dea584?logo=rust" alt="Rust" />
    <img src="https://img.shields.io/badge/UI-Tauri-24c8db?logo=tauri" alt="Tauri" />
    <img src="https://img.shields.io/github/license/kbmod/handsome-voltius" alt="License" />
  </p>
</div>

## About

Handsome Voltius is a personal-use fork of the open-source
[Voltius project](https://github.com/VoltiusApp/voltius). It retains the
existing Rust/Tauri SSH, SFTP, encrypted vault, import/export, plugin, and
end-to-end encrypted GitHub Gist sync foundations while providing a denser,
more coherent desktop interface for Debian Linux.

Termius is used only as a visual and workflow reference. This project is not
affiliated with Termius and does not access Termius cloud services or private
application data.

Current highlights include:

- `xterm-256color` local and SSH terminals;
- tabbed and split workspaces with rename, reorder, broadcast, and restore;
- Gruvbox Dark terminal rendering and a fixed Termius-inspired navy shell;
- compact Hosts, Keychain, Known Hosts, and SFTP surfaces;
- reliable Debian/WebKitGTK click, focus, resize, and repaint behavior;
- encrypted GitHub Gist sync without a paid account;
- optional remote tmux/screen persistence, disabled by default.

## Terminal themes

Gruvbox Dark is the only bundled terminal theme. The application shell uses a
fixed palette; custom themes change only xterm colors and terminal font
settings.

Create a compatible theme from **Settings → Appearance → New Custom Theme**.
Start from Gruvbox Dark, give it a unique name, and configure:

- foreground, background, cursor, and selection colors;
- all normal and bright ANSI colors;
- terminal font family and font size.

Theme changes hot-apply to open terminals. Exported
`.voltius-theme.json` files retain the legacy format name for compatibility,
and custom themes remain part of the encrypted Gist sync payload.

## Installation

There are no published package repositories, signed releases, or automatic
updates for this in-progress fork. Build and install the Debian package
locally:

```bash
npm install
npm run tauri -- build --bundles deb \
  --config '{"build":{"beforeBuildCommand":"npm run build"}}'
sudo apt install --reinstall target/release/bundle/deb/Handsome_Voltius_*_amd64.deb
```

The build requires the standard Tauri 2 Linux development dependencies,
including WebKitGTK.

## Development

```bash
npm install
npm run tauri dev
```

Run the verification suite:

```bash
npm test
npx tsc --noEmit
npm run lint -- --quiet
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

## Sync and data compatibility

GitHub Gist sync encrypts the complete payload before upload. Existing Gists,
vault data, settings, import/export files, plugin storage, event names, and
keychain entries continue using their legacy `voltius` identifiers so current
installations can upgrade without losing data.

The Tauri bundle identifier also remains `com.voltius.app` for this milestone
because changing it without migration would create a separate application data
and WebKit storage location. This identifier is an internal compatibility
detail, not visible product branding.

The optional upstream cloud/team integration remains available as
**Legacy Voltius Cloud** for compatibility. GitHub Gist sync does not require
or use that service.

## Project links

- Source: <https://github.com/kbmod/handsome-voltius>
- Issues: <https://github.com/kbmod/handsome-voltius/issues>
- Support: <https://buymeacoffee.com/kbmod>
- X: <https://x.com/stillbooting>

## License and attribution

Handsome Voltius remains licensed under the upstream AGPLv3 license for the
core application; plugins retain their applicable licenses. Original Voltius
copyright, license, and attribution are preserved. See [LICENSE](LICENSE) and
the repository history.
