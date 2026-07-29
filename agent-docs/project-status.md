# Handsome Voltius project status

Last updated: 2026-07-26

This is the only active handoff and status document for this fork. Older
redesign, Termius-recreation, and Termius-database bridge plans were removed
because they no longer describe the project.

## Project goal

Handsome Voltius is a personal-use fork of Voltius focused on a polished,
compact Linux desktop experience, specifically Debian/WebKitGTK.

The project is not attempting to recreate all of Termius or modify Termius's
private data. It retains Voltius's existing SSH, SFTP, vault, keychain, and
end-to-end encrypted GitHub Gist sync features, while using Termius as a visual
and workflow reference for the terminal workspace.

The core product requirements are:

- reliable `xterm-256color` local and SSH terminals;
- a Termius-like tabbed and split workspace flow;
- an accurate Gruvbox Dark terminal appearance;
- a denser, cleaner Debian desktop UI;
- encrypted Gist sync for hosts, groups, credentials, keys, known hosts,
  settings, shortcuts, and terminal themes;
- no paid service or proprietary Termius integration.

## Important product decisions

- Debian/WebKitGTK is the primary and currently verified desktop target.
- Gruvbox Dark is the only bundled terminal theme.
- The desktop shell uses a fixed Termius-inspired dark navy palette rather than
  inheriting colors from the active terminal theme.
- Custom themes remain supported, but they affect terminal colors and terminal
  font settings only. They must not recolor application chrome.
- Ordinary SSH sessions open the configured login shell directly.
- Remote tmux/screen persistence is optional and disabled by default.
- Workspace layout restore remains available independently of remote
  tmux/screen persistence.
- Session and workspace restore can be disabled together from Settings >
  Hosts > Startup. When disabled, the app starts in Vaults without reopening
  terminal tabs or split layouts.
- Releases are not being published while the project is in progress.
- Generated `.deb` files and other build artifacts must not be committed or
  pushed.
- Starting with the next local package, rename the generated Debian artifact
  to use underscores rather than spaces:
  `Handsome_Voltius_<version>_amd64.deb`.
- Keep the current development version at `0.12.0`. After all planned work and
  final acceptance are complete, bump the final build to `0.12.1` before
  packaging.
- Real acceptance testing happens in the installed Tauri/WebKitGTK
  application, not only in a browser fixture.

## Completed and verified work

### Fork identity and documentation

- Reframed the README around a personal Debian-focused Voltius fork.
- Added the work-in-progress notice and revised project description.
- Documented the Gruvbox Dark default and custom terminal-theme workflow.
- Removed the upstream fork's hosted release expectations; no fork releases or
  remote release tags are being maintained.
- Added frontend lint/build/test configuration and CI coverage.

Relevant pushed commits:

- `337ef75 docs: describe Linux-focused UI fork`
- `2847dfd feat: polish Debian desktop workspace`
- `78bfb24 fix: merge SFTP directories and opt in persistence`
- `6c61f58 style: flatten host distro icons`

### Handsome Voltius identity and ownership

- Renamed the visible product, window title, JavaScript package, Rust package,
  Debian package, and generated desktop metadata to Handsome Voltius.
- Replaced the upstream logo with the fork's navy, Gruvbox-green, and
  off-white terminal-prompt mark and regenerated the platform icon sets.
- Pointed repository, issue, changelog, About, and package links at
  `kbmod/handsome-voltius`.
- Removed the upstream Ko-fi, social, blog, pricing, marketplace, maintainer
  contact, and hosted-release publishing links and scripts.
- Added the fork owner's Buy Me a Coffee and X links to the About page,
  repository README, and package support metadata where applicable.
- Removed the upstream automatic updater UI, commands, runtime, dependency,
  endpoint, signing configuration, and generated updater artifacts. Local
  packages are installed manually while the project is in progress.
- New encrypted sync Gists use the Handsome Voltius name while discovery still
  accepts existing Gists carrying the old Voltius description.
- Preserved legacy internal `voltius` storage, event, import, and encryption
  identifiers plus the `com.voltius.app` bundle identifier so existing vaults,
  settings, WebKit data, Android integrations, and encrypted backups continue
  to load.
- Retained the optional upstream account integration under the explicit
  **Legacy Voltius Cloud** label. Its API, terms, privacy, and billing links
  remain only where that external service functionally requires them.
- Preserved the upstream license, copyright notices, and attribution.

### Desktop shell and navigation

- Reworked the desktop title bar and terminal tab strip into a denser,
  Termius-inspired layout.
- Moved Hosts, Keychain, SFTP, settings, and related primary navigation into a
  compact left-side list.
- Reduced excessive top and left padding.
- Tightened oversized icons, controls, pane headers, sidebars, and general
  spacing.
- Added bundled Linux-friendly fonts and improved Debian/WebKitGTK text
  rendering.
- Added a real new-tab page rather than the old small popup-only flow.
- Fixed the new-tab page requiring two clicks before becoming active.
- Removed the stateful ripple mutation that caused WebKitGTK to discard clicks
  on New Tab, split-button arrows, and other controls; verified New Tab and the
  New Key menu respond on every click in the installed Debian application.
- Implemented and verified the requested keyboard shortcuts with terminal
  focus.
- Added tab renaming.
- Replaced glossy, beveled distro/service icon tiles with flat brand-color
  tiles, crisp white glyphs, a subtle edge, and slightly larger glyph sizing.
- Applied the flat host-icon treatment consistently across Recent Hosts, vault
  host rows, the Hosts page, host pickers, SFTP selectors, and connection
  editing.
- Visually verified the revised Debian and Ubuntu host icons in the installed
  Debian application.
- Separated the fixed Termius-inspired dark navy desktop shell from Gruvbox
  terminal rendering.

### Terminal appearance and capability

- Local and SSH PTYs request `xterm-256color`.
- Verified `$TERM=xterm-256color` and `tput colors` returns `256`.
- Gruvbox Dark terminal foreground, background, normal ANSI colors, bright ANSI
  colors, selection, and cursor behavior were matched against the supplied
  Termius references.
- Corrected terminal font family, size, line height, letter spacing, and
  padding for Debian rendering.
- Corrected the focused blinking block cursor and inactive outline cursor.
- Replaced the loud yellow active terminal border/tab color with the muted
  Gruvbox off-white treatment.
- Moved tab close controls to the left side.
- Added muted unread-output dots to inactive terminal tabs.
- Prevented active-terminal output from incorrectly producing an unread dot.
- Applied terminal theme changes live to already-open terminals.
- Kept application chrome colors independent from custom terminal colors.
- Retained custom theme creation/import/export and encrypted sync
  compatibility while removing other bundled presets.
- Applied the active terminal background to the complete workspace beneath the
  title bar, including the terminal's internal text inset.
- Removed the desktop terminal status strip so a single terminal uses the full
  height below the title bar; split-pane headers and dividers remain available.

### Keychain identities and keys

- Moved New Key to the left side of the toolbar and kept search, layout, and
  sort controls aligned on the right.
- Reworked grid cards into compact flat rows based on the supplied Termius
  reference while preserving edit, delete, context-menu, selection, vault,
  export, tag, and sync behavior.
- Kept list mode's richer metadata while applying the same clean blue key and
  identity tiles in both list and grid layouts.
- Detect missing crypto types from existing saved key material, allowing legacy
  and imported keys to show labels such as `ED25519` without a no-op edit.
- Persist detected crypto metadata immediately for future imported keys.
- Portaled the New Key menu above desktop stacking contexts so it no longer
  renders behind the left navigation.
- Verified the Keychain creation menu, key and identity editing, hover actions,
  context menus, layout controls, and metadata in the installed Debian
  application.

### Known Hosts

- Reworked the toolbar into the accepted compact layout with selection actions
  on the left and search, view, and sort controls on the right.
- Tightened the page heading, count, grid/list spacing, and empty state.
- Reworked grid entries into compact Termius-like one-row cards with flat blue
  fingerprint tiles.
- Preserved richer fingerprint and endpoint metadata in list mode.
- Omit the default SSH port from endpoints while retaining nonstandard ports.
- Preserved selection, context-menu, delete confirmation, vault, grid/list,
  search, and sort behavior.
- Verified the Known Hosts surface in the installed Debian application.

### Settings

- Tightened the desktop Settings modal, header, navigation rail, section
  spacing, cards, rows, controls, and corner radii.
- Removed narrow section caps so Settings content uses the available panel
  width instead of leaving a large empty strip.
- Kept the density layer scoped to desktop Settings so mobile layouts remain
  unchanged.
- Added visible keyboard focus to navigation, links, close controls, selects,
  and reset actions.
- Added navigation state and select/reset accessibility attributes.
- Verified Settings navigation, scrolling, layout density, and existing
  controls in the installed Debian application.

### Workspace and session behavior

- Fixed mixed local/SSH split-workspace restoration.
- Fixed restored local panes that appeared connected but had no prompt or
  cursor.
- Fixed local shells not closing when the user typed `exit`.
- Fixed intentional SSH `exit` from triggering an unwanted reconnect.
- Fixed complex pane reordering that could leave a terminal visually present
  but dead.
- Fixed WebKitGTK leaving every pane canvas blank after switching from a split
  workspace to a standalone terminal tab and back; all visible panes are now
  refitted and repainted after the workspace returns.
- Verified many terminals across mixed horizontal and vertical arrangements
  without reproducing the dead-pane bug.
- Verified split workspaces return with every prompt and existing buffer
  immediately visible without clicking individual panes.
- Preserved rename, focus, split, reorder, and shortcut behavior.
- Changed remote tmux/screen persistence from automatic to explicit opt-in.
- Re-evaluate the current global/per-host persistence setting during workspace
  restore so an old snapshot cannot silently reactivate tmux.
- Verified new ordinary SSH sessions no longer show the Voltius
  tmux/screen-injection message.

### SFTP workspace and transfers

- Polished the two-pane SFTP workspace and reduced wasted space.
- Added compact back/forward navigation next to the current path.
- Replaced repeated automatic reconnect attempts with explicit Retry and
  Choose Host actions.
- Added retry handling for directory-load failures.
- Reworked the transfer queue into a docked tray with explicit
  expand/collapse behavior.
- Added transfer status, progress, cancellation, and clear-completed controls.
- Replaced browser alerts in the tested SFTP paths with in-app notifications.
- Verified the SFTP error notification path in the installed application.
- Verified transfers across the tested local and remote endpoint combinations.
- Verified file hashes after transfer.
- Fixed same-named directory merge conflicts:
  - destination directories are treated as merge containers;
  - only colliding child files prompt;
  - Skip preserves the existing child but still transfers unique siblings;
  - nested and empty directories are retained;
  - selective merges avoid whole-directory tar extraction so per-file choices
    are honored.
- Verified both file-versus-directory and directory-versus-file conflicts:
  - Skip leaves the destination unchanged;
  - Overwrite safely replaces the destination with the source type.

### Verification completed for the current source

Latest automated result:

- 173 test files passed;
- 839 tests passed;
- 7 targeted Rust port-forwarding tests passed, covering domain and IPv6
  SOCKS5 negotiation, the waiting-state wire contract, local listener
  lifecycle, and bind behavior;
- TypeScript check passed;
- zero-error ESLint check passed;
- Vite production build passed;
- Rust `cargo check` passed;
- `git diff --check` passed.

Latest locally built test package:

- Path:
  `target/release/bundle/deb/Handsome_Voltius_0.12.0_amd64.deb`
- SHA-256:
  `dcd2bc6bdfed393551928a20162571599e57c209150f86e231c6a03b878153a4`
- Debian package name: `handsome-voltius`
- This package includes the accepted terminal, workspace, SFTP, Known Hosts,
  Keychain, Settings, Snippets, port-forwarding, and Handsome Voltius identity
  work.
- The Snippets and port-forwarding desktop polish is installed-app verified:
  - create controls are aligned left while search, layout, and sort remain on
    the right;
  - the Snippet folder menu is portaled above desktop stacking contexts and
    has single-click regression coverage;
  - Snippet, forwarding-rule, and active-tunnel cards are flatter and denser;
  - Snippet command previews no longer use the oversized faux terminal frame;
  - user-triggered active-tunnel failures use in-app error notifications.
- The accepted slice also corrects its installed-app findings:
  - the New Tab close control is back on the left;
  - multiple script steps wait for the prior shell prompt before injecting the
    next command, rather than queueing every command into the PTY immediately;
  - multi-step script execution reports a clear error when Shell Integration is
    disabled and no reliable command-completion boundary is available;
  - dynamic forwarding shows the exact local SOCKS5 endpoint and passes
    bracket-free IPv6 literals to the SSH direct-TCP channel.
  - per-request SOCKS5 channel failures now replace the misleading active state
    with the actual SSH error and return to active after a later successful
    request.
  - forwarding failures now show one concise in-app notification, write the
    complete tunnel context and SSH error to the rotating application log, and
    retain only a compact error status in forwarding cards.
  - dynamic SOCKS tunnels begin in an amber **Waiting for traffic** state
    after the local listener opens, become Active only after the SSH server
    accepts a real proxied request, and become Error when that request is
    rejected.
  - native SSH close events now tear down the closed session's forwarding
    listeners before UI exit/reconnect handling, so the requested local port is
    released and the same rule can move cleanly to another server.
  - the terminal right-side panel is now strictly terminal-scoped: navigating
    to Vaults, Hosts, Keychain, Port Forwarding, or any other application
    surface closes its state and prevents the terminal panel from rendering.
- The build exits successfully without updater signing because this
  in-progress fork no longer generates or publishes updater artifacts.

## Recent completed checkpoints

The current verified checkpoint contains:

- compact Snippets and port-forwarding toolbars, cards, and menus;
- sequential multi-step snippet execution using real shell prompt boundaries;
- functional dynamic SOCKS5 forwarding with remote DNS and IPv6 handling;
- honest Waiting, Active, and Error tunnel lifecycle states;
- concise forwarding notifications with full errors in application logs;
- immediate forwarding-listener teardown when the owning SSH connection closes;
- terminal-only right-panel scope across application navigation;
- focused Keychain list/grid polish and blue identity/key tiles;
- deterministic crypto-type metadata for existing and future imports;
- single-click WebKitGTK controls through removal of stateful ripple rendering;
- a fixed Termius-inspired navy application shell independent of terminal
  themes;
- a top-level New Key dropdown that clears the navigation sidebar;
- an edge-to-edge terminal-theme workspace without the bottom status strip;
- regression coverage for the Keychain menu, imported key detection, shell
  isolation, terminal background, and click handling.

Commit `6c61f58` is pushed to `origin/main` and contains:

- flat brand-color tiles for distro and service icons;
- removal of host-icon gradients, highlights, and colored glow;
- slightly larger host glyphs and adjusted corner radius;
- a brighter flat Debian brand color;
- consistent rendering in shared avatar consumers and connection icon pickers;
- a regression test keeping branded tiles flat and neutral object tiles
  separate.

Commit `78bfb24` is also pushed to `origin/main` and contains:

- selective SFTP directory merge planning and tests;
- typed local/remote path-stat helpers;
- safe file/directory type-conflict replacement;
- persistent SSH multiplexer default changed to off;
- workspace restore persistence re-evaluation;
- README and English settings copy for optional persistent sessions;
- regression tests for directory merging and the persistence default.

The source checkpoint is complete. Generated files under `target/` and local
`.deb` packages are not pushed. This status document is committed with the
verified checkpoint so the next session starts from current repository truth.

## Pending work

### 1. Focused remaining desktop-surface cleanup

This is a polish pass, not a new application-wide redesign. Work on one surface
at a time and preserve existing functionality.

The next surface is shared dialogs, menus, notifications, and right-side
panels.

Hosts, groups, folders, vault navigation, Keychain, Known Hosts, and their
shared distro/service/icon treatment have been visually accepted for the
current milestone. Desktop Settings, Snippets, and port forwarding have also
been accepted.

For each surface:

- remove unnecessary padding and oversized controls;
- use consistent compact row heights, typography, icons, borders, and focus
  states;
- remove browser-native alerts and broken/dead controls;
- preserve keyboard behavior and accessibility labels;
- run targeted tests and inspect the real Debian Tauri application before
  moving to the next surface.

### 2. Encrypted Gist sync round-trip

Perform a clean two-profile or two-installation round-trip and verify that the
encrypted payload restores:

- hosts and connection groups/folders;
- identities, credentials, and private/public keys;
- known-host entries;
- relevant application and terminal settings;
- shortcuts;
- selected custom terminal theme and rendering fields.

Acceptance requirements:

- the Gist contains ciphertext rather than readable secrets;
- a wrong passphrase cannot decrypt or partially import data;
- deletions propagate rather than resurrecting stale records;
- changing or syncing a terminal theme does not recolor desktop chrome;
- no data is lost when syncing between a fresh profile and the existing
  profile.

### 3. Final regression and cleanup

- Repeat the main local shell, SSH, tabs, splits, rename, shortcuts, exit,
  reconnect, workspace restore, theme, and SFTP tests.
- Check keyboard-only navigation and visible focus.
- Check the desktop at common Debian display sizes and scaling.
- Confirm no terminal session or scrollback is lost during theme changes.
- Confirm no new browser alerts or console errors appear in normal workflows.
- Run the full automated verification suite.
- Update this status document and README if behavior changed.
- Commit and push the final verified source checkpoint.

### 4. Deferred work

These are intentionally outside the current personal Debian milestone:

- publishing signed releases or updater artifacts;
- full Windows and macOS validation;
- Android/mobile redesign;
- proprietary Termius cloud, billing, AI, autocomplete, or service
  integrations;
- writing directly into Termius's private LevelDB or application data;
- pixel-for-pixel recreation of every Termius screen.

## Standard verification commands

Run from the repository root:

```bash
npm test
npx tsc --noEmit
npm run lint -- --quiet
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

Build a local Debian package:

```bash
npm run tauri -- build --bundles deb \
  --config '{"build":{"beforeBuildCommand":"npm run build"}}'
```

The explicit `beforeBuildCommand` override is used on this machine because the
Tauri configuration names `pnpm`, while the current non-interactive shell has
`npm` but no `pnpm` executable on its PATH.

After Tauri builds the package, give the local artifact an underscore-only
filename such as `Handsome_Voltius_0.12.0_amd64.deb`. Do not change the visible
product name to achieve this.

## Resume instructions

When resuming:

1. Read this document.
2. Inspect `git status`, `git log`, and the current source diff.
3. Treat current repository state and executed checks as authoritative.
4. Do not resurrect the deleted Termius UI-recreation or Termius database
   bridge plans.
5. Continue with the first incomplete item under **Pending work**.
