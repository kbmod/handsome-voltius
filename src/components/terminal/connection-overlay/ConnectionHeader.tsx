import { Icon } from "@iconify/react";

export function ConnectionHeader({
  icon,
  name,
  subtitle,
  isConnecting,
  showSpecialPanel,
}: {
  icon: string;
  name: string;
  subtitle?: string;
  isConnecting: boolean;
  showSpecialPanel: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-left w-full">
      <div className="relative">
        <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Icon icon={icon} width={18} className="text-accent" />
        </div>
        {isConnecting && !showSpecialPanel && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 40 40"
          >
            <rect
              x="0.5"
              y="0.5"
              width="39"
              height="39"
              rx="12"
              ry="12"
              fill="none"
              stroke="var(--t-accent)"
              strokeWidth="1.5"
              strokeDasharray="34 108"
              strokeLinecap="round"
              style={{ animation: "border-trace 0.8s linear infinite" }}
            />
          </svg>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-text-primary font-medium text-sm leading-tight truncate">{name}</p>
        {subtitle && <p className="text-text-muted text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
