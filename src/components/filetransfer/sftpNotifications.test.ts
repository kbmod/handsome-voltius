import { beforeEach, expect, test } from "vitest";
import { useNotificationStore } from "@/stores/notificationStore";
import { showSftpError } from "./sftpNotifications";

beforeEach(() => {
  useNotificationStore.setState({
    toasts: [],
    banners: [],
    history: [],
    unreadCount: 0,
  });
});

test("surfaces SFTP errors through the app notification system", () => {
  showSftpError(new Error("Rename failed"));

  expect(useNotificationStore.getState().toasts).toMatchObject([
    {
      pluginId: "core",
      pluginName: "Voltius",
      message: "Rename failed",
      severity: "error",
      type: "toast",
    },
  ]);
});
