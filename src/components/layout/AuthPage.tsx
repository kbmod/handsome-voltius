import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import LogoBadge from "./LogoBadge";
import { createLocalAccountNoPassword, login } from "@/services/account";
import { requestGistSetup } from "@/services/gistSetupHandoff";

interface Props {
  isLocked: boolean;
  onReady: () => void;
}

export default function AuthPage({ isLocked, onReady }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
      onReady();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Locked (vault exists, need password) ─────────────────────────────────

  if (isLocked) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      await wrap(() => login(password));
    };
    return (
      <Layout>
        <p className="text-xs mb-4 text-center text-(--t-text-muted)">
          {t("layout.auth.unlockPrompt")}
        </p>
        <form onSubmit={submit} className="w-full space-y-2">
          <Input type="password" placeholder={t("layout.auth.masterPasswordPlaceholder")} value={password}
            onChange={setPassword} autoFocus />
          <ErrorMsg msg={error} />
          <SubmitBtn loading={loading} label={t("layout.auth.unlock")} />
        </form>
        <button
          type="button"
          onClick={async () => {
            const { resetVault } = await import("@/services/vault");
            await resetVault();
            window.location.reload();
          }}
          className="mt-1 text-xs w-full text-center transition-colors text-(--t-text-dim) hover:text-(--t-status-error)"
        >
          {t("layout.auth.resetVault")}
        </button>
      </Layout>
    );
  }

  // ── Home (first launch) ──────────────────────────────────────────────────

  return (
    <Layout>
      <p className="text-xs mb-6 text-center text-(--t-text-muted)">
        {t("layout.auth.chooseHowToUse")}
      </p>

      <ActionButton
        icon="lucide:zap"
        label={t("layout.auth.getStarted")}
        sub={t("layout.auth.getStartedSub")}
        primary
        loading={loading}
        onClick={() => wrap(createLocalAccountNoPassword)}
      />

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-(--t-border)" />
        <span className="text-xs text-(--t-text-dim)">{t("layout.auth.or")}</span>
        <div className="flex-1 h-px bg-(--t-border)" />
      </div>

      <ActionButton
        icon="mdi:github"
        label={t("layout.auth.restoreFromGist")}
        sub={t("layout.auth.restoreFromGistSub")}
        loading={loading}
        onClick={() =>
          wrap(async () => {
            // The Gist setup form writes the PAT into the vault, so a local
            // account has to exist first. Creating it here means the user
            // reaches the Gist form directly instead of having to discover
            // it in Settings after choosing local-only.
            await createLocalAccountNoPassword();
            requestGistSetup();
          })
        }
      />
    </Layout>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-(--t-bg-terminal)">
      <div className="mb-8 text-center">
        <LogoBadge size={12} className="mb-3" />
        <h1 className="text-lg font-bold text-(--t-text-bright)">Handsome Voltius</h1>
      </div>

      <div className="w-72">{children}</div>
    </div>
  );
}

function ActionButton({ icon, label, sub, primary, loading, onClick }: {
  icon: string; label: string; sub: string;
  primary?: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 text-left transition-all"
      style={{
        background: primary ? "var(--t-accent)" : "var(--t-bg-elevated)",
        border: `1px solid ${primary ? "var(--t-accent)" : "var(--t-border)"}`,
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!primary) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-border-hover)";
      }}
      onMouseLeave={(e) => {
        if (!primary) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-border)";
      }}
    >
      <Icon icon={loading ? "lucide:loader-circle" : icon} width={18}
        className={`shrink-0 ${loading ? "animate-spin" : ""}`}
        style={{ color: primary ? "white" : "var(--t-accent)" }} />
      <div>
        <p className="text-sm font-medium" style={{ color: primary ? "white" : "var(--t-text-primary)" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: primary ? "rgba(255,255,255,0.7)" : "var(--t-text-muted)" }}>
          {sub}
        </p>
      </div>
    </button>
  );
}

function Input({ type, placeholder, value, onChange, autoFocus }: {
  type: string; placeholder: string; value: string;
  onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      className="form-input w-full px-3 py-2 rounded-lg text-sm outline-hidden bg-(--t-bg-input) border border-(--t-border) text-(--t-text-primary)"
    />
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-xs text-center py-1 text-(--t-status-error)">{msg}</p>;
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="btn btn-primary w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      {loading && <Icon icon="lucide:loader-circle" width={14} className="animate-spin" />}
      {label}
    </button>
  );
}
