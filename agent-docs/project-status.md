# Handsome Voltius project status

Last updated: 2026-07-25

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

- 166 test files passed;
- 824 tests passed;
- TypeScript check passed;
- zero-error ESLint check passed;
- Vite production build passed;
- Rust `cargo check` passed;
- `git diff --check` passed.

Latest locally built test package:

- Path:
  `target/release/bundle/deb/Voltius_0.12.0_amd64.deb`
- SHA-256:
  `deca6ac4c12ee5ee2bfa7b0ac829f283844cd2649949096629a39eff7e4d6dc3`
- This package includes the accepted Known Hosts and Keychain polish,
  WebKitGTK click fix, fixed dark navy desktop shell, edge-to-edge Gruvbox
  terminal workspace, selective directory-merge fix, opt-in tmux/screen
  behavior, flat host distro/service icons, and the visible session/workspace
  restore control. It also includes the verified WebKitGTK repaint fix for
  split workspaces returning from another terminal tab.

Tauri successfully creates the `.deb`, then exits with a signing error because
the upstream public updater key exists but no private release-signing key is
configured. This does not invalidate the already-created local `.deb`.

## Recent completed checkpoints

The current verified checkpoint contains:

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

### 1. Handsome Voltius rebranding and ownership

Remove the remaining upstream product branding before a release:

- rename the visible product, application/window titles, package/bundle
  metadata, desktop entry, and generated installer from Voltius to Handsome
  Voltius;
- replace or remove links to the Voltius maintainer's GitHub profile,
  repository, website, documentation, blog, Ko-fi, donation, support, and
  issue pages;
- replace repository, homepage, update, and support endpoints with this fork's
  owner-controlled destinations;
- replace or remove upstream logos and branding in the About screen, settings,
  splash/loading surfaces, icons, static assets, README, and package metadata;
- remove upstream updater/signing coupling or configure the fork's own update
  endpoint and signing keys before publishing releases;
- preserve the upstream license, copyright notices, and required attribution.

Before implementation, collect the exact owner name, repository URL, website,
support/donation link, and update policy. Do not guess replacement destinations.

### 2. Focused remaining desktop-surface cleanup

This is a polish pass, not a new application-wide redesign. Work on one surface
at a time and preserve existing functionality.

Priority order:

1. Settings layout, density, labels, and control consistency
2. Snippets and port-forwarding surfaces
3. Shared dialogs, menus, notifications, and right-side panels

Hosts, groups, folders, vault navigation, Keychain, Known Hosts, and their
shared distro/service/icon treatment have been visually accepted for the
current milestone.

For each surface:

- remove unnecessary padding and oversized controls;
- use consistent compact row heights, typography, icons, borders, and focus
  states;
- remove browser-native alerts and broken/dead controls;
- preserve keyboard behavior and accessibility labels;
- run targeted tests and inspect the real Debian Tauri application before
  moving to the next surface.

### 3. Encrypted Gist sync round-trip

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

### 4. Final regression and cleanup

- Repeat the main local shell, SSH, tabs, splits, rename, shortcuts, exit,
  reconnect, workspace restore, theme, and SFTP tests.
- Check keyboard-only navigation and visible focus.
- Check the desktop at common Debian display sizes and scaling.
- Confirm no terminal session or scrollback is lost during theme changes.
- Confirm no new browser alerts or console errors appear in normal workflows.
- Run the full automated verification suite.
- Update this status document and README if behavior changed.
- Commit and push the final verified source checkpoint.

### 5. Deferred work

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

## Resume instructions

When resuming:

1. Read this document.
2. Inspect `git status`, `git log`, and the current source diff.
3. Treat current repository state and executed checks as authoritative.
4. Do not resurrect the deleted Termius UI-recreation or Termius database
   bridge plans.
5. Continue with the first incomplete item under **Pending work**.
