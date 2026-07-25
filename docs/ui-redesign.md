# UI redesign visual review harness

## Purpose and security boundary

The visual-review harness is development infrastructure for reproducing desktop UI states without credentials, remote hosts, network requests, or production authentication changes. It uses deterministic local fixture data and self-contained presentational markup; it does not mock, bypass, or weaken the production authentication and security services.

The harness is gated at the top of `App` by both Vite's compile-time `import.meta.env.DEV` value and the `visual-review=1` query parameter. Production builds replace `import.meta.env.DEV` with `false`, allowing the complete review branch and its page module to be removed by tree-shaking. The global Tailwind source scan excludes `src/dev`; the lazily loaded review page imports its own Tailwind stylesheet, so the development harness remains fully styled without contributing selectors or a CSS asset to production. A production build must therefore continue through the normal application composition even if that query parameter is supplied.

## Launch

Start the Vite development server:

```sh
corepack pnpm dev
```

Open:

```text
http://localhost:1420/?visual-review=1
```

Without the query parameter, the normal application starts. The harness adds no routing library and requires no environment flag.

## Fixture inventory and controls

The sticky review bar provides native keyboard-reachable controls for:

- **Surface:** Desktop, Terminal, SFTP, and shared Controls.
- **Theme presentation:** `Handsome Dark` and `Handsome Light`. These are review-only labels and are not persisted product theme presets.
- **Fixture state:** options scoped to the active surface.

Included fixtures:

- Desktop shell with vault rail, session sidebar, active/inactive tabs, and secondary navigation.
- Terminal connected, connecting, error, split-pane, search-open, and status-bar states.
- SFTP local/remote panes with directories, regular and hidden files, long names, multi-selection, empty/loading/error/drop-target states, conflict dialog, active/completed transfers, and editor tabs.
- Shared primary, secondary, ghost, danger, and disabled buttons; input; select; toggle; context menu; modal; tooltip; empty state; and toast.

All names, paths, terminal lines, transfer progress values, and file metadata are local constants. The fixtures contain no secrets and make no external calls.

## Screenshot review

Planned desktop screenshot sizes:

- 1440 × 900
- 1920 × 1080

`screenshots/` is ignored by Git and is intended for local review output only.

> **Required approval environment:** Browser screenshots are useful for rapid iteration, but final visual approval must occur in the real Tauri/WebKitGTK application. Browser-only approval is not sufficient because rendering, font metrics, compositing, and native webview behavior can differ.
