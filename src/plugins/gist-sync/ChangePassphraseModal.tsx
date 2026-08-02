import { useState } from "react";
import { Icon } from "@iconify/react";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { changePassphrase } from "./sync-engine";

/**
 * Rotates the sync passphrase.
 *
 * Deliberately gated on the current passphrase. Re-encrypting a Gist rewrites
 * every device's view of it, so it must not be reachable by holding the PAT
 * alone — otherwise anyone with the token could lock the owner out of their own
 * data. Proving the current passphrase keeps it a genuine second factor.
 */
export function ChangePassphraseModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: (passphrase: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = !busy && next.length > 0 && next === confirm;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await changePassphrase(current, next);
      onChanged(next.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalCard className="p-5 flex flex-col gap-3 min-w-[22rem] max-w-[26rem]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-accent) 15%, transparent)" }}
          >
            <Icon icon="lucide:key-round" width={14} className="text-(--t-accent)" />
          </div>
          <h2 className="text-sm font-semibold text-(--t-text-bright)">Change sync passphrase</h2>
        </div>

        <p className="text-xs text-(--t-text-dim)">
          Your Gists are re-encrypted with the new passphrase. Other devices keep the old one and
          stop syncing until you update them to match.
        </p>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field
            label="Current passphrase"
            value={current}
            onChange={setCurrent}
            placeholder="Leave empty if you had none"
            autoFocus
          />
          <Field label="New passphrase" value={next} onChange={setNext} />
          <Field label="Confirm new passphrase" value={confirm} onChange={setConfirm} />

          {mismatch && (
            <p className="text-xs text-(--t-status-error)">The new passphrases do not match.</p>
          )}
          {error && <p className="text-xs text-(--t-status-error)">{error}</p>}

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-3 py-1.5 rounded-md text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary px-3 py-1.5 rounded-md text-sm font-medium"
              style={{ opacity: canSubmit ? 1 : 0.5 }}
            >
              {busy ? "Re-encrypting…" : "Change passphrase"}
            </button>
          </div>
        </form>
      </ModalCard>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-(--t-text-muted)">{label}</span>
      <input
        type="password"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="form-input w-full px-3 py-2 rounded-lg text-sm outline-hidden bg-(--t-bg-input) border border-(--t-border) text-(--t-text-primary)"
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--t-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--t-border)")}
      />
    </label>
  );
}
