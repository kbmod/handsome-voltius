export function terminalViewportClass(scrollMinimapEnabled: boolean): string {
  return scrollMinimapEnabled ? "h-full w-full terminal-minimap-enabled" : "h-full w-full";
}
