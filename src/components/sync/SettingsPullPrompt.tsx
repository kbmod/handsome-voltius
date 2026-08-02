import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { useSyncPromptStore } from "@/stores/syncPromptStore";

/**
 * Confirms a pull that would rewrite this device's own configuration.
 *
 * Hosts, keys, and other entities merge silently — they are shared data. App
 * settings, keyboard shortcuts, and UI preferences are not: applying them
 * without asking lets another device silently change how this one behaves.
 */
export function SettingsPullPrompt() {
  const { t } = useTranslation();
  const pending = useSyncPromptStore((s) => s.pendingSettingsPull);
  const resolve = useSyncPromptStore((s) => s.resolveSettingsPull);

  if (!pending) return null;

  return (
    <Modal onClose={() => resolve(false)} onEnter={() => resolve(true)}>
      <ModalCard className="p-5 flex flex-col gap-3 min-w-[19rem] max-w-[25rem]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-accent) 15%, transparent)" }}
          >
            <Icon icon="lucide:cloud-download" width={14} className="text-(--t-accent)" />
          </div>
          <h2 className="text-sm font-semibold text-(--t-text-bright)">
            {t("sync.settingsPull.title")}
          </h2>
        </div>

        <p className="text-sm text-(--t-text-secondary)">{t("sync.settingsPull.message")}</p>

        <ul className="flex flex-col gap-1">
          {pending.keys.map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 text-xs text-(--t-text-primary)"
            >
              <Icon icon="lucide:dot" width={12} className="text-(--t-text-dim)" />
              {t(`sync.settingsPull.section.${key}`, { defaultValue: key })}
            </li>
          ))}
        </ul>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => resolve(false)}
            className="btn btn-secondary px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {t("sync.settingsPull.keepLocal")}
          </button>
          <button
            onClick={() => resolve(true)}
            className="btn btn-primary px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {t("sync.settingsPull.apply")}
          </button>
        </div>
      </ModalCard>
    </Modal>
  );
}
