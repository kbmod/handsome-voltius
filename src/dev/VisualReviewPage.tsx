import { useState, type CSSProperties, type ReactNode } from "react";
import "./visualReview.css";
import {
  visualFixtures,
  type FileFixture,
  type FixtureState,
  type TerminalStateFixture,
  type VisualSurfaceId,
  type VisualThemeId,
} from "./visualFixtures";

type ReviewStyle = CSSProperties & Record<`--vr-${string}`, string>;

const palettes: Record<VisualThemeId, ReviewStyle> = {
  dark: {
    "--vr-bg": "#0b0d12",
    "--vr-frame": "#11151d",
    "--vr-panel": "#171c26",
    "--vr-raised": "#202735",
    "--vr-border": "#303a4d",
    "--vr-text": "#f1f5f9",
    "--vr-muted": "#94a3b8",
    "--vr-accent": "#7c83ff",
    "--vr-accent-soft": "#272b52",
    "--vr-danger": "#ef6464",
    "--vr-success": "#4ade80",
  },
  light: {
    "--vr-bg": "#edf1f7",
    "--vr-frame": "#e2e8f0",
    "--vr-panel": "#ffffff",
    "--vr-raised": "#f4f7fb",
    "--vr-border": "#cbd5e1",
    "--vr-text": "#172033",
    "--vr-muted": "#64748b",
    "--vr-accent": "#565bd8",
    "--vr-accent-soft": "#e4e5ff",
    "--vr-danger": "#c43d4f",
    "--vr-success": "#16834a",
  },
};

const panelClass = "rounded-xl border border-[var(--vr-border)] bg-[var(--vr-panel)] shadow-lg";
const subtleClass = "rounded-lg border border-[var(--vr-border)] bg-[var(--vr-raised)]";
const buttonClass = "rounded-md border border-[var(--vr-border)] px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vr-accent)]";

function SurfaceHeading({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vr-accent)]">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      </div>
      <span className="text-xs text-[var(--vr-muted)]">Deterministic local fixture</span>
    </header>
  );
}

function DesktopFixture() {
  const fixture = visualFixtures.desktop;
  return (
    <section aria-labelledby="desktop-heading">
      <SurfaceHeading eyebrow="Application shell"><span id="desktop-heading">Desktop shell overview</span></SurfaceHeading>
      <div className={`${panelClass} grid min-h-[590px] grid-cols-[76px_230px_1fr] overflow-hidden`}>
        <aside aria-label="Vault rail" className="border-r border-[var(--vr-border)] bg-[var(--vr-frame)] p-3">
          <div className="mb-5 flex h-11 items-center justify-center rounded-xl bg-[var(--vr-accent)] font-bold text-white">V</div>
          <div className="space-y-3">
            {fixture.vaults.map((vault, index) => (
              <button key={vault} aria-label={vault} className={`flex h-11 w-full items-center justify-center rounded-xl border text-xs font-bold ${index === 0 ? "border-[var(--vr-accent)] bg-[var(--vr-accent-soft)] text-[var(--vr-accent)]" : "border-[var(--vr-border)] text-[var(--vr-muted)]"}`}>
                {vault.split(" ").map((part) => part[0]).join("")}
              </button>
            ))}
          </div>
        </aside>
        <aside aria-label="Session sidebar" className="border-r border-[var(--vr-border)] bg-[var(--vr-frame)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--vr-muted)]">Personal Vault</p>
          <button className="my-4 w-full rounded-lg bg-[var(--vr-accent)] px-3 py-2 text-sm font-semibold text-white">New session</button>
          <div className="space-y-2">
            {fixture.sessions.map((session) => (
              <div key={session.id} className={`flex items-center gap-3 rounded-lg border p-3 ${session.status === "active" ? "border-[var(--vr-accent)] bg-[var(--vr-accent-soft)]" : "border-transparent"}`}>
                <span aria-label={session.status} className={`h-2.5 w-2.5 rounded-full ${session.status === "active" ? "bg-[var(--vr-success)]" : "bg-[var(--vr-muted)]"}`} />
                <span className="truncate text-sm">{session.label}</span>
              </div>
            ))}
          </div>
        </aside>
        <main className="flex min-w-0 flex-col">
          <div className="flex gap-1 border-b border-[var(--vr-border)] bg-[var(--vr-frame)] px-3 pt-3" role="tablist" aria-label="Session tabs">
            {fixture.sessions.map((session, index) => (
              <button key={session.id} role="tab" aria-selected={index === 0} className={`rounded-t-lg border-x border-t px-4 py-2 text-sm ${index === 0 ? "border-[var(--vr-border)] bg-[var(--vr-panel)]" : "border-transparent text-[var(--vr-muted)]"}`}>
                {session.label}
              </button>
            ))}
          </div>
          <nav aria-label="Secondary navigation" className="flex gap-5 border-b border-[var(--vr-border)] px-5 py-3">
            {fixture.secondaryNavigation.map((item, index) => (
              <button key={item} className={`text-sm ${index === 0 ? "font-semibold text-[var(--vr-accent)]" : "text-[var(--vr-muted)]"}`}>{item}</button>
            ))}
          </nav>
          <div className="grid flex-1 place-items-center bg-[var(--vr-bg)] p-8">
            <div className={`${subtleClass} w-full max-w-2xl overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-[var(--vr-border)] px-4 py-3 text-xs text-[var(--vr-muted)]">
                <span>production-api · Connected</span><span>24 ms</span>
              </div>
              <pre className="min-h-72 whitespace-pre-wrap p-6 font-mono text-sm leading-7"><span className="text-[var(--vr-success)]">deploy@production-api</span>:~$ uptime{"\n"}19:32:10 up 28 days, 4:12, 3 users{"\n"}<span className="text-[var(--vr-accent)]">deploy@production-api</span>:~$ ▋</pre>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function TerminalPane({ state, secondary = false }: { state: TerminalStateFixture; secondary?: boolean }) {
  return (
    <div className={`${subtleClass} flex min-h-96 flex-col overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-[var(--vr-border)] px-4 py-3 text-xs text-[var(--vr-muted)]">
        <span>{secondary ? "staging-worker" : "production-api"}</span>
        <span>{state.status}</span>
      </div>
      {state.id === "search-open" && (
        <div className="flex items-center gap-2 border-b border-[var(--vr-border)] bg-[var(--vr-panel)] p-3">
          <input type="search" aria-label="Search terminal output" defaultValue="request" className="w-full rounded-md border border-[var(--vr-border)] bg-[var(--vr-bg)] px-3 py-2 text-sm" />
          <span className="text-xs text-[var(--vr-muted)]">1 / 12</span>
        </div>
      )}
      <pre className="flex-1 whitespace-pre-wrap bg-[#080b10] p-5 font-mono text-sm leading-7 text-slate-200">
        {state.lines.join("\n")}{"\n"}<span className="text-indigo-300">{secondary ? "ops@staging-worker" : "deploy@production-api"}:~$</span> ▋
      </pre>
      <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--vr-border)] px-4 py-2 text-xs text-[var(--vr-muted)]">
        <span>{state.status}</span><span>UTF-8 · zsh · 42 × 138</span>
      </div>
    </div>
  );
}

function TerminalFixture({ stateId }: { stateId: string }) {
  const state = visualFixtures.terminal.states.find((item) => item.id === stateId) ?? visualFixtures.terminal.states[0];
  return (
    <section aria-labelledby="terminal-heading">
      <SurfaceHeading eyebrow="Terminal states"><span id="terminal-heading">Terminal chrome</span></SurfaceHeading>
      <div className={`${panelClass} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" /></div>
          <span data-state-label className="rounded-full bg-[var(--vr-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--vr-accent)]">{state.label}</span>
        </div>
        <div className={state.id === "split-pane" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1"}>
          <TerminalPane state={state} />
          {state.id === "split-pane" && <TerminalPane state={state} secondary />}
        </div>
      </div>
    </section>
  );
}

function FileTable({ files, label }: { files: readonly FileFixture[]; label: string }) {
  return (
    <table className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">{label}</caption>
      <thead className="text-xs uppercase tracking-wide text-[var(--vr-muted)]"><tr><th className="px-3 py-2">Name</th><th className="w-20 px-3 py-2">Size</th></tr></thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.name} className={`border-t border-[var(--vr-border)] ${file.selected ? "bg-[var(--vr-accent-soft)]" : ""}`}>
            <td className="truncate px-3 py-3"><span aria-hidden="true">{file.kind === "directory" ? "▸" : "·"}</span> {file.name}{file.hidden && <span className="ml-2 text-xs text-[var(--vr-muted)]">hidden</span>}</td>
            <td className="px-3 py-3 text-[var(--vr-muted)]">{file.size}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlternateSftpState({ stateId }: { stateId: string }) {
  const content: Record<string, { title: string; detail: string }> = {
    empty: { title: "This directory is empty", detail: "Drop files here or create a new folder." },
    loading: { title: "Loading remote directory…", detail: "Reading deterministic fixture entries." },
    error: { title: "Could not load directory", detail: "Permission denied · Retry" },
    "drop-target": { title: "Drop to upload", detail: "3 files will be copied to the remote host." },
  };
  const selected = content[stateId];
  if (!selected) return <FileTable files={visualFixtures.sftp.remoteFiles} label="Remote files" />;
  return <div className={`grid min-h-64 place-items-center p-8 text-center ${stateId === "drop-target" ? "m-3 rounded-xl border-2 border-dashed border-[var(--vr-accent)] bg-[var(--vr-accent-soft)]" : ""}`}><div><p className="font-semibold">{selected.title}</p><p className="mt-2 text-sm text-[var(--vr-muted)]">{selected.detail}</p></div></div>;
}

function SftpFixture({ stateId }: { stateId: string }) {
  const state = visualFixtures.sftp.states.find((item) => item.id === stateId) ?? visualFixtures.sftp.states[0];
  return (
    <section aria-labelledby="sftp-heading">
      <SurfaceHeading eyebrow="File transfer"><span id="sftp-heading">SFTP workspace</span></SurfaceHeading>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className={`${panelClass} overflow-hidden`}>
          <div className="grid grid-cols-2">
            <div className="min-w-0 border-r border-[var(--vr-border)]">
              <div className="border-b border-[var(--vr-border)] p-3"><p className="text-xs font-semibold uppercase text-[var(--vr-muted)]">Local</p><p className="truncate text-sm">{visualFixtures.sftp.localPath}</p></div>
              <FileTable files={visualFixtures.sftp.localFiles} label="Local files" />
              <div className="border-t border-[var(--vr-border)] p-3 text-xs text-[var(--vr-accent)]">2 selected</div>
            </div>
            <div className="min-w-0">
              <div className="border-b border-[var(--vr-border)] p-3"><p className="text-xs font-semibold uppercase text-[var(--vr-muted)]">Remote</p><p className="truncate text-sm">{visualFixtures.sftp.remotePath}</p></div>
              <AlternateSftpState stateId={state.id} />
            </div>
          </div>
          <div className="border-t border-[var(--vr-border)]">
            <div role="tablist" aria-label="Open editor files" className="flex gap-1 border-b border-[var(--vr-border)] bg-[var(--vr-frame)] px-3 pt-2">
              {visualFixtures.sftp.editorTabs.map((tab, index) => <button key={tab} role="tab" aria-selected={index === 0} className={`rounded-t-md px-3 py-2 text-xs ${index === 0 ? "bg-[var(--vr-panel)]" : "text-[var(--vr-muted)]"}`}>{tab}</button>)}
            </div>
            <pre className="min-h-32 p-4 font-mono text-xs leading-6"><span className="text-[var(--vr-accent)]"># Visual review fixture</span>{"\n"}This editor content is local and deterministic.</pre>
          </div>
        </div>
        <aside className="space-y-4">
          <div className={`${panelClass} p-4`}>
            <h2 className="font-semibold">Active transfers</h2>
            {visualFixtures.sftp.transfers.filter((transfer) => transfer.status === "active").map((transfer) => <div key={transfer.name} className="mt-4"><div className="flex justify-between gap-3 text-xs"><span className="truncate">{transfer.direction === "upload" ? "↑" : "↓"} {transfer.name}</span><span>{transfer.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--vr-raised)]"><div className="h-full bg-[var(--vr-accent)]" style={{ width: `${transfer.progress}%` }} /></div></div>)}
            <h2 className="mt-6 border-t border-[var(--vr-border)] pt-4 font-semibold">Completed transfers</h2>
            {visualFixtures.sftp.transfers.filter((transfer) => transfer.status === "completed").map((transfer) => <p key={transfer.name} className="mt-3 text-xs text-[var(--vr-success)]">✓ {transfer.name}</p>)}
          </div>
          <div role="dialog" aria-labelledby="conflict-title" className={`${panelClass} p-4`}>
            <h2 id="conflict-title" className="font-semibold">Conflict: file already exists</h2>
            <p className="mt-2 text-sm text-[var(--vr-muted)]">README.md exists at the destination.</p>
            <div className="mt-4 flex gap-2"><button className={buttonClass}>Keep both</button><button className={`${buttonClass} bg-[var(--vr-accent)] text-white`}>Replace</button></div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ControlsFixture() {
  return (
    <section aria-labelledby="controls-heading">
      <SurfaceHeading eyebrow="Component inventory"><span id="controls-heading">Shared controls</span></SurfaceHeading>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${panelClass} space-y-5 p-5`}>
          <h2 className="font-semibold">Buttons and fields</h2>
          <div className="flex flex-wrap gap-2">
            <button className={`${buttonClass} border-[var(--vr-accent)] bg-[var(--vr-accent)] text-white`}>Primary</button>
            <button className={`${buttonClass} bg-[var(--vr-raised)]`}>Secondary</button>
            <button className={`${buttonClass} border-transparent`}>Ghost</button>
            <button className={`${buttonClass} border-[var(--vr-danger)] text-[var(--vr-danger)]`}>Danger</button>
            <button disabled className={`${buttonClass} cursor-not-allowed opacity-40`}>Disabled</button>
          </div>
          <label className="block text-sm">Host name<input aria-label="Host name" defaultValue="production-api.internal" className="mt-2 w-full rounded-md border border-[var(--vr-border)] bg-[var(--vr-bg)] px-3 py-2" /></label>
          <label className="block text-sm">Protocol<select aria-label="Protocol" defaultValue="ssh" className="mt-2 w-full rounded-md border border-[var(--vr-border)] bg-[var(--vr-bg)] px-3 py-2"><option value="ssh">SSH</option><option value="mosh">Mosh</option></select></label>
          <label className="flex items-center justify-between gap-4 text-sm">Keep connection alive<button type="button" role="switch" aria-checked="true" aria-label="Keep connection alive" className="h-7 w-12 rounded-full bg-[var(--vr-accent)] p-1 text-right"><span className="block h-5 w-5 translate-x-5 rounded-full bg-white" /></button></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`${panelClass} p-4`}><h2 className="mb-3 font-semibold">Context menu</h2><ul role="menu" aria-label="Session actions" className={`${subtleClass} p-2 text-sm`}><li role="menuitem" className="rounded px-3 py-2">Open in split pane</li><li role="menuitem" className="rounded px-3 py-2">Duplicate session</li><li role="menuitem" className="rounded px-3 py-2 text-[var(--vr-danger)]">Disconnect</li></ul></div>
          <div className={`${panelClass} p-4`}><h2 className="mb-3 font-semibold">Tooltip and toast</h2><div role="tooltip" className="inline-block rounded bg-[var(--vr-text)] px-3 py-2 text-xs text-[var(--vr-bg)]">Copy fingerprint</div><div role="status" className="mt-4 rounded-lg border border-[var(--vr-success)] bg-[var(--vr-raised)] p-3 text-sm">✓ Connection saved</div></div>
          <div className={`${panelClass} grid min-h-48 place-items-center p-6 text-center`}><div><div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[var(--vr-raised)]">⌘</div><h2 className="font-semibold">No saved snippets</h2><p className="mt-2 text-sm text-[var(--vr-muted)]">Create a reusable command to see it here.</p></div></div>
          <div role="dialog" aria-labelledby="delete-title" className={`${panelClass} p-5`}><h2 id="delete-title" className="font-semibold">Delete session?</h2><p className="mt-2 text-sm text-[var(--vr-muted)]">This removes the saved session from the vault.</p><div className="mt-5 flex justify-end gap-2"><button className={buttonClass}>Cancel</button><button className={`${buttonClass} bg-[var(--vr-danger)] text-white`}>Delete</button></div></div>
        </div>
      </div>
    </section>
  );
}

function statesFor(surface: VisualSurfaceId): readonly FixtureState[] {
  return visualFixtures[surface].states;
}

export default function VisualReviewPage() {
  const [surface, setSurface] = useState<VisualSurfaceId>("desktop");
  const [theme, setTheme] = useState<VisualThemeId>("dark");
  const [stateBySurface, setStateBySurface] = useState<Record<VisualSurfaceId, string>>({ desktop: "overview", terminal: "connected", sftp: "workspace", controls: "inventory" });
  const states = statesFor(surface);
  const stateId = stateBySurface[surface];
  const themeLabel = visualFixtures.themes.find((item) => item.id === theme)?.label;

  function selectSurface(nextSurface: VisualSurfaceId) {
    setSurface(nextSurface);
  }

  function selectState(nextState: string) {
    setStateBySurface((current) => ({ ...current, [surface]: nextState }));
  }

  return (
    <div data-testid="visual-review-page" data-theme-presentation={theme} style={palettes[theme]} className="min-h-full overflow-auto bg-[var(--vr-bg)] text-[var(--vr-text)]">
      <nav aria-label="Visual review controls" className="sticky top-0 z-20 border-b border-[var(--vr-border)] bg-[var(--vr-frame)]/95 px-5 py-3 shadow-xl backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4">
          <div><p className="text-sm font-bold">Voltius visual review</p><p className="text-xs text-[var(--vr-muted)]">Development only</p></div>
          <div role="group" aria-label="Surface" className="flex gap-1 rounded-lg border border-[var(--vr-border)] bg-[var(--vr-bg)] p-1">
            {visualFixtures.surfaces.map((item) => <button key={item.id} aria-pressed={surface === item.id} onClick={() => selectSurface(item.id)} className={`rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--vr-accent)] ${surface === item.id ? "bg-[var(--vr-accent)] text-white" : "text-[var(--vr-muted)]"}`}>{item.label}</button>)}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-[var(--vr-muted)]">Theme<select aria-label="Theme presentation" value={theme} onChange={(event) => setTheme(event.target.value as VisualThemeId)} className="rounded-md border border-[var(--vr-border)] bg-[var(--vr-panel)] px-3 py-2 text-sm text-[var(--vr-text)]">{visualFixtures.themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs text-[var(--vr-muted)]">State<select aria-label="Fixture state" value={stateId} onChange={(event) => selectState(event.target.value)} className="rounded-md border border-[var(--vr-border)] bg-[var(--vr-panel)] px-3 py-2 text-sm text-[var(--vr-text)]">{states.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <span data-theme-label className="rounded-full border border-[var(--vr-border)] px-3 py-1 text-xs">{themeLabel}</span>
        </div>
      </nav>
      <main className="mx-auto max-w-[1800px] p-5 lg:p-8">
        {surface === "desktop" && <DesktopFixture />}
        {surface === "terminal" && <TerminalFixture stateId={stateId} />}
        {surface === "sftp" && <SftpFixture stateId={stateId} />}
        {surface === "controls" && <ControlsFixture />}
      </main>
    </div>
  );
}
