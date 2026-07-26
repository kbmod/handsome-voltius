import { useEffect } from "react";
import type React from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { TerminalMinimap } from "@/components/terminal/TerminalMinimap";
import { useToggle } from "@/stores/toggleSettingsStore";
import { terminalViewportClass } from "@/components/terminal/terminalLayout";
import type { SshClosedEvent } from "@/services/ssh";
import "@xterm/xterm/css/xterm.css";

interface Props {
  sessionId: string;
  sessionType: "ssh" | "local" | "serial";
  onClosed?: (event?: SshClosedEvent) => void;
  active?: boolean;
  inputGate?: React.RefObject<() => boolean>;
  encoding?: string;
  onResize?: (cols: number, rows: number) => void;
  /** Mobile: never render the minimap (sized for desktop widths → causes overflow). */
  compact?: boolean;
}

export default function TerminalView({ sessionId, sessionType, onClosed, active, inputGate, encoding, onResize, compact }: Props) {
  const { attach, focus, fit } = useTerminal({ sessionId, sessionType, onClosed, inputGate, encoding, onResize });
  const [scrollMinimapEnabled] = useToggle("scroll-minimap");
  const showMinimap = scrollMinimapEnabled && !compact;

  useEffect(() => {
    if (active) {
      focus();
      fit();
    }
  }, [active, focus, fit]);

  return (
    <div className={`relative h-full w-full bg-(--t-terminal-background) px-3 py-2${compact ? " terminal-compact" : ""}`}>
      <div className={terminalViewportClass(showMinimap)}>
        <div ref={attach} className="h-full w-full" />
      </div>
      {showMinimap && (
        <div className="absolute right-1 top-2 bottom-2 w-18 rounded-xs overflow-hidden opacity-35 hover:opacity-90 transition-opacity">
          <TerminalMinimap sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}
