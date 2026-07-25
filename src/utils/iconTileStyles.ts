import type { CSSProperties } from "react";

/**
 * Flat brand tile used for connection distro/service icons. The restrained
 * inset edge keeps adjacent dark colors legible without a gradient, highlight,
 * or colored glow.
 */
export function brandTileStyle(base: string): CSSProperties {
  return {
    background: base,
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.09), 0 1px 2px rgba(0, 0, 0, 0.18)",
  };
}

/**
 * Glossy neutral object tile derived from a base surface color. Brand and OS
 * icons intentionally do not use this treatment.
 */
export function glossyTileStyle(base: string): CSSProperties {
  return {
    background: `linear-gradient(145deg, color-mix(in srgb, ${base} 78%, #ffffff 22%) 0%, ${base} 55%, color-mix(in srgb, ${base} 84%, #000000 16%) 100%)`,
    boxShadow: `var(--t-ring), 0 4px 10px -5px color-mix(in srgb, ${base} 60%, transparent), var(--t-highlight)`,
  };
}

/** Neutral object treatment for keys, identities, folders, and similar data. */
export function neutralTileStyle(): CSSProperties {
  return glossyTileStyle("var(--t-bg-card-avatar)");
}
