import { expect, test } from "vitest";
import { resolveKeyType } from "./keyDetection";

test("keeps imported key metadata when it is already present", () => {
  expect(resolveKeyType("RSA", undefined, "ssh-ed25519 ignored")).toBe("RSA");
});

test("derives missing imported key metadata from the public key", () => {
  expect(resolveKeyType(
    undefined,
    "-----BEGIN OPENSSH PRIVATE KEY-----\nopaque\n-----END OPENSSH PRIVATE KEY-----",
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA",
  )).toBe("ED25519");
});
