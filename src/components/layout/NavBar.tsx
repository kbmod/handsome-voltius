import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUIStore, type NavItem } from "@/stores/uiStore";
import { useRipple } from "@/hooks/useRipple";

interface NavEntry {
  id: NavItem;
  label: string;
  icon: string;
}

const NAV_ITEM_DEFS: { id: NavItem; icon: string }[] = [
  { id: "hosts",           icon: "lucide:server" },
  { id: "keychain",        icon: "lucide:key-round" },
  { id: "port-forwarding", icon: "lucide:arrow-left-right" },
  { id: "snippets",        icon: "lucide:braces" },
  { id: "known-hosts",     icon: "lucide:fingerprint-pattern" },
  { id: "members",         icon: "lucide:users-round" },
  { id: "logs",            icon: "lucide:scroll-text" },
];

export default function NavBar() {
  const { t } = useTranslation();
  const activeNav = useUIStore((s) => s.activeNav);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const setSftpPanelOpen = useUIStore((s) => s.setSftpPanelOpen);

  const NAV_ITEMS: NavEntry[] = NAV_ITEM_DEFS.map((d) => ({
    ...d,
    label: t(`layout.nav.${d.id}`),
  }));

  const handleNav = (id: NavItem) => {
    setSftpPanelOpen(false);
    setActiveNav(id);
  };

  return (
    <aside
      className="flex flex-col shrink-0 w-48 p-2 gap-1 border-r"
      style={{
        background: "var(--t-bg-chrome)",
        borderColor: "var(--t-border)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeNav === item.id;
        return (
          <NavTabButton
            key={item.id}
            item={item}
            isActive={isActive}
            onClick={() => handleNav(item.id)}
          />
        );
      })}
    </aside>
  );
}

function NavTabButton({
  item,
  isActive,
  onClick,
}: {
  item: NavEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  const { createRipple, rippleEls } = useRipple();
  return (
    <button
      onClick={onClick}
      onMouseDown={createRipple}
      className="relative flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium shrink-0 transition-colors overflow-hidden"
      style={{
        color: isActive ? "var(--t-text-primary)" : "var(--t-text-dim)",
        background: isActive ? "var(--t-bg-elevated)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-primary)";
          (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-card)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-dim)";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      {rippleEls}
      <Icon icon={item.icon} width={15} className="shrink-0" />
      <span>{item.label}</span>
      {isActive && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r-full bg-(--t-accent)" />}
    </button>
  );
}
