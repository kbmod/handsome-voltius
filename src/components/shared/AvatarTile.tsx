import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@iconify/react";
import { brandTileStyle, neutralTileStyle } from "@/utils/icons";

interface AvatarTileProps {
  /** Iconify icon name. Ignored when `children` is provided. */
  icon?: string;
  /** Icon width in px. Defaults to round(size * 0.5) when `size` is given. */
  iconSize?: number;
  /** Tile edge length in px → emitted as a rem (size/15) width + height. */
  size?: number;
  /** Brand fill color. Omit for the neutral surface fill. */
  base?: string | null;
  /** Corner radius in px. Prefer a `rounded-*` class via `className`. */
  radius?: number;
  /** Sizing / rounding classes, e.g. "w-7 h-7 rounded-lg". */
  className?: string;
  /** Classes for the icon (color etc). */
  iconClassName?: string;
  /** Extra inline styles, merged after the fill (e.g. drag-over background). */
  style?: CSSProperties;
  title?: string;
  children?: ReactNode;
}

/**
 * Shared avatar tile. Brand fill (`base`) uses the flat connection/distro
 * treatment; omitting it uses the neutral object treatment.
 */
export function AvatarTile({
  icon, iconSize, size, base, radius, className = "", iconClassName, style, title, children,
}: AvatarTileProps) {
  const sizeStyle: CSSProperties = {};
  if (size != null) {
    sizeStyle.width = `${(size / 15).toFixed(3)}rem`;
    sizeStyle.height = `${(size / 15).toFixed(3)}rem`;
  }
  if (radius != null) sizeStyle.borderRadius = `${radius}px`;
  const resolvedIconSize = iconSize ?? (size != null ? Math.round(size * 0.5) : undefined);

  return (
    <div
      title={title}
      className={`flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ ...sizeStyle, ...(base ? brandTileStyle(base) : neutralTileStyle()), ...style }}
    >
      {children ?? (icon ? <Icon icon={icon} width={resolvedIconSize} className={iconClassName} /> : null)}
    </div>
  );
}
