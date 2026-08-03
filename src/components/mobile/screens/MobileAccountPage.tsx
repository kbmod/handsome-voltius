import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import MobilePanelHeader from "../panels/MobilePanelHeader";
import { useMobileNavStore } from "@/stores/mobileNavStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useEffectiveSyncStatus } from "@/hooks/useEffectiveSyncStatus";
import { syncStatusIcon, syncStatusColor } from "@/services/syncStatus";
import { getCurrentUserEmail, logout } from "@/services/account";

export default function MobileAccountPage() {
  const { t } = useTranslation();
  const pop = useMobileNavStore((s) => s.pop);
  const accountMode = useSubscriptionStore((s) => s.accountMode);
  const sync = useEffectiveSyncStatus();
  const [email, setEmail] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { void getCurrentUserEmail().then(setEmail); }, []);

  const signedIn = accountMode === "server";

  const Row = ({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) => (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--t-border)" }}>
      <Icon icon={icon} width={18} className="text-(--t-text-dim) shrink-0" />
      <span className="flex-1 text-sm text-(--t-text-primary)">{label}</span>
      <span className="text-sm truncate max-w-[55%]" style={{ color: valueColor ?? "var(--t-text-dim)" }}>{value}</span>
    </div>
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-(--t-bg-base)">
      <MobilePanelHeader title={t("mobile.account.title")} />
      <div className="flex-1 overflow-y-auto">
        {signedIn && <Row icon="lucide:mail" label={t("mobile.account.email")} value={email ?? "—"} />}
        <Row
          icon={syncStatusIcon(sync.status)}
          label={t("mobile.account.cloudSync")}
          value={sync.configured ? t(`mobile.header.syncStatus.${sync.status}`) : t("mobile.account.off")}
          valueColor={sync.configured ? syncStatusColor(sync.status) : undefined}
        />

        <div className="p-4 pt-0">
          {!signedIn ? null : confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-(--t-text-dim)">{t("mobile.account.signOutConfirm")}</p>
              <button
                data-account-signout-confirm
                onClick={() => { void logout(); pop(); }}
                className="w-full h-11 rounded-xl text-sm font-semibold"
                style={{ background: "var(--t-danger, #e5484d)", color: "#fff" }}
              >
                {t("mobile.account.signOut")}
              </button>
              <button onClick={() => setConfirming(false)} className="w-full h-11 rounded-xl text-sm font-medium text-(--t-text-primary)" style={{ border: "1px solid var(--t-border)" }}>
                {t("common.action.cancel")}
              </button>
            </div>
          ) : (
            <button
              data-account-signout
              onClick={() => setConfirming(true)}
              className="w-full h-11 rounded-xl text-sm font-semibold text-(--t-text-primary) flex items-center justify-center gap-2"
              style={{ border: "1px solid var(--t-border)" }}
            >
              <Icon icon="lucide:log-out" width={16} />
              {t("mobile.account.signOut")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
