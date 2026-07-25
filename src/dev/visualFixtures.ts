export type VisualSurfaceId = "desktop" | "terminal" | "sftp" | "controls";
export type VisualThemeId = "dark" | "light";

export function shouldShowVisualReview(search: string, isDev: boolean): boolean {
  return isDev && new URLSearchParams(search).get("visual-review") === "1";
}

export interface FixtureState {
  id: string;
  label: string;
}

export interface SessionFixture {
  id: string;
  label: string;
  status: "active" | "inactive" | "error";
}

export interface FileFixture {
  name: string;
  kind: "directory" | "file";
  size: string;
  hidden?: boolean;
  selected?: boolean;
}

export interface TransferFixture {
  name: string;
  direction: "upload" | "download";
  progress: number;
  status: "active" | "completed";
}

export interface TerminalStateFixture extends FixtureState {
  status: string;
  lines: readonly string[];
}

export interface VisualFixtures {
  themes: readonly { id: VisualThemeId; label: string }[];
  surfaces: readonly { id: VisualSurfaceId; label: string }[];
  desktop: {
    states: readonly FixtureState[];
    vaults: readonly string[];
    sessions: readonly SessionFixture[];
    secondaryNavigation: readonly string[];
  };
  terminal: {
    states: readonly TerminalStateFixture[];
  };
  sftp: {
    states: readonly FixtureState[];
    localPath: string;
    remotePath: string;
    localFiles: readonly FileFixture[];
    remoteFiles: readonly FileFixture[];
    editorTabs: readonly string[];
    transfers: readonly TransferFixture[];
  };
  controls: {
    states: readonly FixtureState[];
  };
}

export const visualFixtures: VisualFixtures = {
  themes: [
    { id: "dark", label: "Handsome Dark" },
    { id: "light", label: "Handsome Light" },
  ],
  surfaces: [
    { id: "desktop", label: "Desktop" },
    { id: "terminal", label: "Terminal" },
    { id: "sftp", label: "SFTP" },
    { id: "controls", label: "Controls" },
  ],
  desktop: {
    states: [{ id: "overview", label: "Overview" }],
    vaults: ["Personal Vault", "Platform Team", "Archive"],
    sessions: [
      { id: "session-production", label: "production-api", status: "active" },
      { id: "session-staging", label: "staging-worker", status: "inactive" },
      { id: "session-local", label: "local-notes", status: "inactive" },
    ],
    secondaryNavigation: ["Terminal", "Files", "Port Forwarding", "Monitoring"],
  },
  terminal: {
    states: [
      {
        id: "connected",
        label: "Connected",
        status: "Connected · 24 ms",
        lines: ["Last login: Thu Jul 23 19:30:00", "deploy@production-api:~$ systemctl status api", "● api.service — active (running)"],
      },
      {
        id: "connecting",
        label: "Connecting",
        status: "Negotiating SSH handshake…",
        lines: ["Resolving production-api.internal", "Opening secure transport", "Authenticating with local fixture key…"],
      },
      {
        id: "error",
        label: "Error",
        status: "Connection failed",
        lines: ["ssh: connect to host staging-worker port 22", "Connection timed out", "Retry available in 10 seconds"],
      },
      {
        id: "split-pane",
        label: "Split pane",
        status: "2 panes · Connected",
        lines: ["deploy@production-api:~$ journalctl -f", "Jul 23 19:31:04 api[4821]: request completed 200"],
      },
      {
        id: "search-open",
        label: "Search open",
        status: "12 matches",
        lines: ["deploy@production-api:~$ rg request /var/log/api.log", "request_id=vr-004 status=200", "request_id=vr-005 status=200"],
      },
      {
        id: "status-bar",
        label: "Status bar",
        status: "Connected · UTF-8 · zsh · 42 × 138 · 24 ms",
        lines: ["deploy@production-api:~$ uptime", "19:32:10 up 28 days, 4:12, 3 users, load average: 0.21, 0.18, 0.14"],
      },
    ],
  },
  sftp: {
    states: [
      { id: "workspace", label: "Workspace" },
      { id: "empty", label: "Empty pane" },
      { id: "loading", label: "Loading pane" },
      { id: "error", label: "Error pane" },
      { id: "drop-target", label: "Drop target" },
    ],
    localPath: "/home/reviewer/project",
    remotePath: "/srv/production/releases/2026-07-23",
    localFiles: [
      { name: "src", kind: "directory", size: "—" },
      { name: "docs", kind: "directory", size: "—" },
      { name: ".env.example", kind: "file", size: "2 KB", hidden: true },
      { name: "README.md", kind: "file", size: "8 KB", selected: true },
      { name: "package.json", kind: "file", size: "4 KB", selected: true },
    ],
    remoteFiles: [
      { name: "current", kind: "directory", size: "—" },
      { name: "logs", kind: "directory", size: "—" },
      { name: "quarterly-financial-report-final-reviewed.pdf", kind: "file", size: "18.4 MB" },
      { name: "service-config.production.yaml", kind: "file", size: "6 KB" },
    ],
    editorTabs: ["README.md", "service-config.production.yaml", "deploy.sh"],
    transfers: [
      { name: "release-bundle.tar.gz", direction: "upload", progress: 64, status: "active" },
      { name: "access.log", direction: "download", progress: 31, status: "active" },
      { name: "README.md", direction: "upload", progress: 100, status: "completed" },
    ],
  },
  controls: {
    states: [{ id: "inventory", label: "Inventory" }],
  },
};
