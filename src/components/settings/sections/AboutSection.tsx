import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { useUIStore } from "@/stores/uiStore";
import LogoBadge from "@/components/layout/LogoBadge";

const LINKS = [
  {
    icon: "simple-icons:github",
    key: "source",
    sub: "kbmod/handsome-voltius",
    href: "https://github.com/kbmod/handsome-voltius",
  },
  {
    icon: "lucide:circle-dot",
    key: "issues",
    sub: "github.com/kbmod/handsome-voltius/issues",
    href: "https://github.com/kbmod/handsome-voltius/issues",
  },
  {
    icon: "simple-icons:buymeacoffee",
    key: "support",
    sub: "buymeacoffee.com/kbmod",
    href: "https://buymeacoffee.com/kbmod",
  },
  {
    icon: "simple-icons:x",
    key: "social",
    sub: "x.com/stillbooting",
    href: "https://x.com/stillbooting",
  },
] as const;

export default function AboutSection() {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-(--t-text-dim)">
          {t("settings.about.versionTitle")}
        </h3>
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 bg-(--t-bg-elevated) border border-(--t-border)">
          <LogoBadge size={10} />
          <div>
            <p className="text-sm font-medium text-(--t-text-primary)">Handsome Voltius</p>
            <p className="text-xs mt-0.5 text-(--t-text-dim)">
              {appVersion ? `v${appVersion}` : t("settings.about.loading")}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-(--t-text-dim)">
          {t("settings.about.updatesTitle")}
        </h3>
        <div className="rounded-lg px-4 py-3 flex items-start gap-3 bg-(--t-bg-elevated) border border-(--t-border)">
          <Icon icon="lucide:package-open" width={18} className="mt-0.5 shrink-0 text-(--t-text-dim)" />
          <div>
            <p className="text-sm font-medium text-(--t-text-primary)">
              {t("settings.about.manualBuilds.title")}
            </p>
            <p className="text-xs mt-0.5 text-(--t-text-dim)">
              {t("settings.about.manualBuilds.desc")}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-(--t-text-dim)">
          {t("settings.about.linksTitle")}
        </h3>
        <div className="space-y-2">
          {LINKS.map(({ icon, key, sub, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-4 py-3 flex items-center gap-3 bg-(--t-bg-elevated) border border-(--t-border) transition-colors hover:border-(--t-border-hover)"
            >
              <Icon icon={icon} width={20} className="text-(--t-text-primary) shrink-0" />
              <div>
                <p className="text-sm font-medium text-(--t-text-primary)">
                  {t(`settings.about.links.${key}`)}
                </p>
                <p className="text-xs mt-0.5 text-(--t-text-dim)">{sub}</p>
              </div>
              <Icon icon="lucide:external-link" width={20} className="ml-auto text-(--t-text-dim)" />
            </a>
          ))}
          <button
            type="button"
            onClick={() => useUIStore.getState().openSettings("diagnostics")}
            className="w-full text-left rounded-lg px-4 py-3 flex items-center gap-3 bg-(--t-bg-elevated) border border-(--t-border) transition-colors hover:border-(--t-border-hover)"
          >
            <Icon icon="lucide:bug" width={20} className="text-(--t-text-primary) shrink-0" />
            <p className="text-sm font-medium text-(--t-text-primary)">
              {t("settings.about.reportBug")}
            </p>
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-(--t-text-dim)">
        {t("settings.about.attribution")}
      </p>
    </div>
  );
}
