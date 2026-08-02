/**
 * Hand-off between first-launch setup and the Gist sync settings form.
 *
 * "Restore from GitHub Gist" on the setup screen has to create a local account
 * first, because the Gist form stores its PAT in the vault. That account
 * creation drops the user into the main UI, so the intent to configure Gist
 * sync is parked here and picked up once the shell (and the gist plugin's
 * settings page) has loaded.
 */
const FLAG = "voltius.open-gist-setup";

export function requestGistSetup(): void {
  sessionStorage.setItem(FLAG, "1");
}

/** Consume the request, returning whether one was pending. */
export function consumeGistSetupRequest(): boolean {
  const pending = sessionStorage.getItem(FLAG) === "1";
  if (pending) sessionStorage.removeItem(FLAG);
  return pending;
}
