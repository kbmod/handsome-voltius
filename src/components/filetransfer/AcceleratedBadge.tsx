import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { InfoTooltip } from "@/components/shared/InfoTooltip";

/** Zap badge shown on tar-accelerated transfers, with a hover card explaining it. */
export function AcceleratedBadge() {
  const { t } = useTranslation();
  return (
    <InfoTooltip icon="lucide:zap" iconColor="var(--t-accent)" width={11} placement="top" interactive>
      <div className="flex items-center gap-1.5 mb-1 font-medium text-(--t-text-primary)">
        <Icon icon="lucide:zap" width={12} style={{ color: "var(--t-accent)" }} />
        {t("fileTransfer.acceleratedBadge.title")}
      </div>
      <p className="m-0">{t("fileTransfer.acceleratedBadge.description")}</p>
    </InfoTooltip>
  );
}
