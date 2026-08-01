// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NotificationToastContainer } from "./NotificationToastContainer";
import { NotificationBell } from "./NotificationBell";
import { useNotificationStore, type ToastEntry } from "@/stores/notificationStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const baseToast: ToastEntry = {
  id: "test:1",
  pluginId: "test",
  pluginName: "Port Forwarding",
  type: "toast",
  message: "SOCKS5 connection failed because the remote server rejected the channel",
  severity: "error",
  duration: 0,
  createdAt: 1,
};

afterEach(() => {
  cleanup();
  useNotificationStore.setState({ toasts: [], banners: [], history: [], unreadCount: 0 });
});

test("error notifications remain readable and use alert semantics", () => {
  useNotificationStore.setState({ toasts: [baseToast] });
  render(<NotificationToastContainer />);

  const alert = screen.getByRole("alert");
  const message = screen.getByText(baseToast.message);

  expect(message.className).toContain("break-words");
  expect(message.className).not.toContain("truncate");
  expect(alert.textContent).toContain("Port Forwarding");
  expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeTruthy();
});

test("the notification bell shows an active toast immediately", () => {
  useNotificationStore.setState({ toasts: [baseToast], unreadCount: 1 });
  render(<NotificationBell />);

  fireEvent.click(screen.getByTitle("notifications.bell.title"));

  expect(screen.getByText(baseToast.message).className).toContain("break-words");
  expect(screen.queryByText("notifications.bell.noNotifications")).toBeNull();
});

test("dismissed notification history keeps long text wrapped", () => {
  useNotificationStore.setState({
    history: [{
      id: baseToast.id,
      pluginId: baseToast.pluginId,
      pluginName: baseToast.pluginName,
      message: baseToast.message,
      severity: baseToast.severity,
      dismissedAt: Date.now(),
    }],
  });
  render(<NotificationBell />);

  fireEvent.click(screen.getByTitle("notifications.bell.title"));

  const message = screen.getByText(baseToast.message);
  expect(message.className).toContain("break-words");
  expect(message.className).not.toContain("truncate");
});
