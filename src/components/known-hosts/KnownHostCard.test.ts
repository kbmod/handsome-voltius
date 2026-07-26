import { expect, test } from "vitest";
import { formatKnownHostEndpoint } from "./knownHostDisplay";

test("omits the standard SSH port from known-host labels", () => {
  expect(formatKnownHostEndpoint("server.example.com", 22)).toBe("server.example.com");
});

test("brackets hosts when displaying a non-standard SSH port", () => {
  expect(formatKnownHostEndpoint("100.104.102.84", 22022)).toBe("[100.104.102.84]:22022");
  expect(formatKnownHostEndpoint("[2001:db8::1]", 2222)).toBe("[2001:db8::1]:2222");
});
