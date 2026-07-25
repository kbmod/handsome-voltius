import { formatPermissions, formatSize, formatDate } from "./SFTPTypes.ts";
import { test } from "vitest";

test("SFTPTypes.format", async () => {
let fails = 0;
function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) { console.error(`FAIL ${msg}: got ${actual}, want ${expected}`); fails++; }
  else { console.log(`ok ${msg}`); }
}

{
  assertEqual(formatPermissions(0o755), "rwxr-xr-x", "perms 755");
  assertEqual(formatPermissions(0o640), "rw-r-----", "perms 640");
  assertEqual(formatPermissions(0o000), "---------", "perms 000");
  assertEqual(formatPermissions(0o777), "rwxrwxrwx", "perms 777");
}
{
  assertEqual(formatSize(512), "512 B", "size B");
  assertEqual(formatSize(2048), "2.0 KB", "size KB");
}
{
  // Local noon on Jan 15 keeps the expected local date in every timezone.
  const localJan15Noon = new Date(1970, 0, 15, 12, 0, 0).getTime() / 1000;
  assertEqual(formatDate(localJan15Noon), "Jan 15 1970", "date past-year branch");

  // current-year branch → "Mon DD HH:MM" shape (TZ/clock independent on shape)
  const nowTs = Math.floor(Date.now() / 1000);
  const s = formatDate(nowTs);
  const shapeOk = /^[A-Z][a-z]{2} [ 0-9]\d \d{2}:\d{2}$/.test(s);
  assertEqual(shapeOk, true, "date current-year shape");
}

if (fails > 0) { console.error(`${fails} failures`); throw new Error("test failures"); }
});
