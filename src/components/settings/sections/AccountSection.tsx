import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { getAccountMode, setMasterPassword, logout, lockVaultSession } from "@/services/account";
import { resetVault } from "@/services/vault";
import { useSecurityStore } from "@/stores/securityStore";
import { ActionItem, FormButtons, SettingsInput } from "./shared";

type AccountStep = "idle" | "set-password" | "loading" | "confirm-wipe";

export default function AccountSection() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<string | null>(null);
  const [step, setStep] = useState<AccountStep>("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sessionTimeoutMinutes = useSecurityStore((s) => s.sessionTimeoutMinutes);
  const setSessionTimeoutMinutes = useSecurityStore((s) => s.setSessionTimeoutMinutes);

  const SESSION_TIMEOUT_OPTIONS = [
    { label: t("settings.account.sessionSecurity.timeout.never"), value: "never" },
    { label: t("settings.account.sessionSecurity.timeout.5min"),  value: "5" },
    { label: t("settings.account.sessionSecurity.timeout.15min"), value: "15" },
    { label: t("settings.account.sessionSecurity.timeout.30min"), value: "30" },
    { label: t("settings.account.sessionSecurity.timeout.1h"),    value: "60" },
    { label: t("settings.account.sessionSecurity.timeout.4h"),    value: "240" },
  ];

  useEffect(() => {
    getAccountMode().then(setMode).catch(() => setMode(null));
    setStep("idle");
    setError("");
    setSuccess("");
  }, []);

  const reset = () => {
    setStep("idle");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirm("");
  };

  const wrap = async (fn: () => Promise<void>, successMsg: string) => {
    setStep("loading");
    setError("");
    try {
      await fn();
      setSuccess(successMsg);
      setMode(await getAccountMode());
      setStep("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("idle");
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError(t("settings.account.error.minLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("settings.account.error.mismatch"));
      return;
    }
    await wrap(() => setMasterPassword(password), t("settings.account.success.passwordSet"));
    setPassword("");
    setConfirm("");
  };

  const modeLabel =
    mode === "local-nopassword" ? t("settings.account.mode.localNoPassword") :
    mode === "local" ? t("settings.account.mode.local") :
    mode === "server" ? t("settings.account.mode.server") : t("settings.account.mode.unknown");

  const modeIcon =
    mode === "local-nopassword" ? "lucide:key-round" :
    mode === "local" ? "lucide:lock" : "lucide:cloud";

  const canLockVault = mode === "local" || mode === "server";
  const timeoutSelectValue = sessionTimeoutMinutes === null ? "never" : String(sessionTimeoutMinutes);

  return (
    <div className="p-6 max-w-lg space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-(--t-text-dim)">
          {t("settings.account.modeTitle")}
        </h3>
        <div
          className="rounded-lg px-4 py-3 bg-(--t-bg-elevated) border border-(--t-border)"
        >
          <p className="text-xs mb-1 text-(--t-text-dim)">{t("settings.account.currentMode")}</p>
          <div className="flex items-center gap-2">
            <Icon icon={modeIcon} width={14} className="text-(--t-accent)" />
            <span className="text-sm font-medium text-(--t-text-primary)">{modeLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-(--t-text-dim)">
          {t("settings.account.sessionSecurity.title")}
        </h3>
        {canLockVault ? (
          <div
            className="rounded-lg px-4 py-3 space-y-2 bg-(--t-bg-elevated) border border-(--t-border)"
          >
            <label className="text-xs text-(--t-text-dim)">
              {t("settings.account.sessionSecurity.autoLockLabel")}
            </label>
            <select
              value={timeoutSelectValue}
              onChange={(e) => {
                const next = e.target.value === "never" ? null : Number(e.target.value);
                setSessionTimeoutMinutes(Number.isFinite(next) ? next : null);
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-hidden bg-(--t-bg-input) border border-(--t-border) text-(--t-text-primary)"
            >
              {SESSION_TIMEOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-(--t-text-dim)">
              {t("settings.account.sessionSecurity.autoLockDesc")}
            </p>
          </div>
        ) : (
          <p className="text-xs text-(--t-text-muted)">
            {t("settings.account.sessionSecurity.noPasswordHint")}
          </p>
        )}
      </div>

      {success && <p className="text-xs px-1 text-(--t-status-connected)">{success}</p>}
      {error && <p className="text-xs px-1 text-(--t-status-error)">{error}</p>}

      {step === "idle" && (
        <div className="space-y-2">
          {mode === "local-nopassword" && (
            <ActionItem
              icon="lucide:lock"
              label={t("settings.account.setMasterPassword.label")}
              sub={t("settings.account.setMasterPassword.sub")}
              onClick={() => {
                reset();
                setStep("set-password");
              }}
            />
          )}
          {canLockVault && (
            <ActionItem
              icon="lucide:lock"
              label={t("settings.account.lockVault.label")}
              sub={t("settings.account.lockVault.sub")}
              onClick={() => {
                setError("");
                lockVaultSession()
                  .then(() => window.location.reload())
                  .catch((e) => setError(e instanceof Error ? e.message : String(e)));
              }}
            />
          )}
          {mode === "server" && (
            <ActionItem
              icon="lucide:log-out"
              label={t("settings.account.signOut.label")}
              sub={t("settings.account.signOut.sub")}
              danger
              onClick={() => {
                setError("");
                logout()
                  .then(() => window.location.reload())
                  .catch((e) => setError(e instanceof Error ? e.message : String(e)));
              }}
            />
          )}
          <ActionItem
            icon="lucide:trash-2"
            label={t("settings.account.wipeData.label")}
            sub={t("settings.account.wipeData.sub")}
            danger
            onClick={() => {
              reset();
              setStep("confirm-wipe");
            }}
          />
        </div>
      )}

      {step === "confirm-wipe" && (
        <div className="space-y-3">
          <p className="text-xs text-(--t-text-muted)">
            {t("settings.account.confirmWipe.descPre")}
            <strong>{t("settings.account.confirmWipe.descBold")}</strong>
            {t("settings.account.confirmWipe.descPost")}
          </p>
          <div className="flex gap-2">
            <button
              className="flex-1 text-xs px-3 py-1.5 rounded-sm bg-(--t-bg-elevated) text-(--t-text-muted) hover:text-(--t-text-base) transition-colors"
              onClick={reset}
            >
              {t("settings.shared.cancel")}
            </button>
            <button
              className="flex-1 text-xs px-3 py-1.5 rounded-sm bg-(--t-status-error) text-white hover:opacity-80 transition-opacity font-medium"
              onClick={() => {
                setStep("loading");
                resetVault()
                  .then(() => window.location.reload())
                  .catch((e) => {
                    setError(e instanceof Error ? e.message : String(e));
                    setStep("idle");
                  });
              }}
            >
              {t("settings.account.confirmWipe.confirm")}
            </button>
          </div>
        </div>
      )}

      {step === "set-password" && (
        <form onSubmit={handleSetPassword} className="space-y-2">
          <p className="text-xs text-(--t-text-muted)">
            {t("settings.account.setPassword.desc")}
          </p>
          <SettingsInput
            type="password"
            placeholder={t("settings.account.setPassword.newPlaceholder")}
            value={password}
            onChange={setPassword}
            autoFocus
          />
          <SettingsInput
            type="password"
            placeholder={t("settings.account.setPassword.confirmPlaceholder")}
            value={confirm}
            onChange={setConfirm}
          />
          <FormButtons onCancel={reset} submitLabel={t("settings.account.setPassword.submit")} />
        </form>
      )}

      {step === "loading" && (
        <div className="flex items-center gap-2 px-1">
          <Icon icon="lucide:loader-circle" width={14} className="animate-spin text-(--t-accent)" />
          <span className="text-sm text-(--t-text-muted)">{t("settings.account.loading")}</span>
        </div>
      )}
    </div>
  );
}
