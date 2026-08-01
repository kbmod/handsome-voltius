import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Modal, ModalCard } from "./Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <Modal onClose={onCancel} onEnter={onConfirm}>
      <ModalCard className="p-5 flex flex-col gap-3 min-w-[19rem] max-w-[25rem]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-status-error) 15%, transparent)" }}
          >
            <Icon icon="lucide:triangle-alert" width={14} className="text-(--t-status-error)" />
          </div>
          <h2 className="text-sm font-semibold text-(--t-text-bright)">{title}</h2>
        </div>
        <p className="text-sm text-(--t-text-secondary)">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="btn btn-secondary px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {t("common.action.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {confirmLabel ?? t("common.action.confirm")}
          </button>
        </div>
      </ModalCard>
    </Modal>
  );
}
