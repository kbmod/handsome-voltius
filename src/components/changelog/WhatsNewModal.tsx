import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { getVersion } from "@tauri-apps/api/app";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchChangelog,
  parseChangelog,
  cmpSemver,
  type ChangelogEntry,
} from "@/services/changelog";

function getQuickLinks() {
  return [
    { icon: "simple-icons:github", title: "GitHub", href: "https://github.com/kbmod/handsome-voltius" },
    { icon: "lucide:circle-dot", title: "Issues", href: "https://github.com/kbmod/handsome-voltius/issues" },
  ];
}

export default function WhatsNewModal() {
  const open = useUIStore((s) => s.whatsNewOpen);
  if (!open) return null;
  return <WhatsNewInner />;
}

function WhatsNewInner() {
  const { t } = useTranslation();
  const closeWhatsNew = useUIStore((s) => s.closeWhatsNew);
  const markChangelogSeen = useUIStore((s) => s.markChangelogSeen);

  const [installed, setInstalled] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOlder, setShowOlder] = useState(false);

  useEffect(() => {
    let alive = true;
    getVersion().then((v) => alive && setInstalled(v)).catch(() => {});
    fetchChangelog()
      .then((raw) => { if (alive) setEntries(raw ? parseChangelog(raw) : null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function handleClose() {
    if (installed) markChangelogSeen(installed);
    closeWhatsNew();
  }

  const latest = entries?.[0] ?? null;
  const older = entries?.slice(1) ?? [];

  return (
    <Modal onClose={handleClose}>
      <ModalCard
        solid
        className="flex flex-col overflow-hidden animate-fadeIn"
        style={{ width: "min(34rem, 92vw)", maxHeight: "min(42rem, 80vh)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--t-border) shrink-0">
          <Icon icon="lucide:megaphone" width={18} className="text-(--t-accent)" />
          <h2 className="text-sm font-semibold text-(--t-text-primary)">{t("changelog.title")}</h2>
          <div className="ml-auto flex items-center gap-1">
            {getQuickLinks().map(({ icon, href, title }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                title={title}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-(--t-text-dim) transition-colors hover:bg-(--t-bg-elevated) hover:text-(--t-text-primary)"
              >
                <Icon icon={icon} width={15} />
              </a>
            ))}
            <button
              onClick={handleClose}
              title={t("common.action.close")}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-(--t-text-dim) transition-colors hover:bg-(--t-bg-elevated) hover:text-(--t-text-primary)"
            >
              <Icon icon="lucide:x" width={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-(--t-text-dim) py-6 justify-center">
              <Icon icon="lucide:loader-circle" width={16} className="animate-spin" />
              {t("changelog.loading")}
            </div>
          )}

          {!loading && !entries && (
            <p className="text-sm text-(--t-text-dim) py-6 text-center">
              {t("changelog.unavailable")}
            </p>
          )}

          {!loading && latest && (
            <EntryBlock entry={latest} installed={installed} />
          )}

          {!loading && older.length > 0 && (
            <div className="space-y-5">
              <button
                onClick={() => setShowOlder((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-(--t-text-dim) transition-colors hover:text-(--t-text-primary)"
              >
                <Icon icon={showOlder ? "lucide:chevron-down" : "lucide:chevron-right"} width={14} />
                {showOlder ? t("changelog.hidePreviousReleases") : t("changelog.previousReleases", { count: older.length })}
              </button>
              {showOlder && older.map((e) => (
                <EntryBlock key={e.version} entry={e} installed={installed} />
              ))}
            </div>
          )}
        </div>
      </ModalCard>
    </Modal>
  );
}

function EntryBlock({ entry, installed }: { entry: ChangelogEntry; installed: string | null }) {
  const { t } = useTranslation();
  const isNew = installed != null && cmpSemver(entry.version, installed) > 0;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-(--t-text-primary)">v{entry.version}</h3>
        {isNew && (
          <span
            className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wide"
            style={{
              color: "var(--t-accent)",
              background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
            }}
          >
            {t("changelog.newBadge")}
          </span>
        )}
        <span className="text-xs text-(--t-text-dim) ml-auto">{entry.date}</span>
      </div>
      {entry.groups.map((g) => (
        <div key={g.label} className="space-y-1.5">
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wide"
            style={groupChipStyle(g.label)}
          >
            {g.label}
          </span>
          <ul className="space-y-1 pl-1">
            {g.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-[0.8rem] text-(--t-text-secondary) leading-snug">
                <span className="text-(--t-text-dim) shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupChipStyle(label: string): React.CSSProperties {
  const l = label.toLowerCase();
  let color = "var(--t-text-dim)";
  if (l === "added") color = "var(--t-status-connected)";
  else if (l === "fixed") color = "var(--t-accent)";
  else if (l === "security" || l === "removed") color = "var(--t-status-error)";
  return { color, background: `color-mix(in srgb, ${color} 14%, transparent)` };
}
