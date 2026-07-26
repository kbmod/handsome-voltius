import { useNotificationStore } from "@/stores/notificationStore";

export function showSftpError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  useNotificationStore.getState().addToast({
    pluginId: "core",
    pluginName: "Handsome Voltius",
    type: "toast",
    message,
    severity: "error",
    duration: 5000,
  });
}
