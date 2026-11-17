import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ensurePnpm, installedPnpm, pnpmVersion } from "./install-pnpm.mjs";

test("pnpmVersion: lấy đúng X.Y.Z từ packageManager", () => {
  assert.equal(pnpmVersion(JSON.stringify({ packageManager: "pnpm@10.28.0" })), "10.28.0");
});

test("pnpmVersion: package.json thật của repo khai pnpm@X.Y.Z", () => {
  const text = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  assert.match(pnpmVersion(text), /^\d+\.\d+\.\d+$/);
});

test("pnpmVersion: thiếu, sai trình quản lý, range, hash, rỗng → ném lỗi", () => {
  for (const pm of [
    undefined,
    null,
    "",
    "yarn@4.5.0",
    "pnpm@^10.28.0",
    "pnpm@10",
    "pnpm@10.28.0+sha512.abc",
    10,
  ]) {
    assert.throws(() => pnpmVersion(JSON.stringify({ packageManager: pm })), /packageManager/, String(pm));
  }
});

/** Giả lập execFileSync: `versions` = chuỗi trả lần lượt cho mỗi `pnpm --version` (null = lệnh lỗi). */
function fakeRun(versions) {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args].join(" "));
    if (cmd === "pnpm") {
      const v = versions.shift();
      if (v === null || v === undefined) throw new Error("ENOENT");
      return `${v}\n`;
    }
    return "";
  };
  return { run, calls };
}

test("installedPnpm: không có pnpm → null; có → bản đã trim", () => {
  assert.equal(installedPnpm(fakeRun([null]).run), null);
  assert.equal(installedPnpm(fakeRun(["10.28.0"]).run), "10.28.0");
});

test("ensurePnpm: đúng bản → không gọi npm", () => {
  const { run, calls } = fakeRun(["10.28.0"]);
  assert.equal(ensurePnpm("10.28.0", run), "present");
  assert.deepEqual(calls, ["pnpm --version"]);
});

test("ensurePnpm: thiếu pnpm → npm install đúng bản, không chạy script cài đặt", () => {
  const { run, calls } = fakeRun([null, "10.28.0"]);
  assert.equal(ensurePnpm("10.28.0", run), "installed");
  assert.deepEqual(calls, [
    "pnpm --version",
    "npm install --global --ignore-scripts --no-audit --no-fund --no-update-notifier pnpm@10.28.0",
    "pnpm --version",
  ]);
});

test("ensurePnpm: bản khác → cài lại; cài xong vẫn lệch → ném lỗi", () => {
  assert.equal(ensurePnpm("10.28.0", fakeRun(["9.15.0", "10.28.0"]).run), "installed");
  assert.throws(() => ensurePnpm("10.28.0", fakeRun(["9.15.0", "9.15.0"]).run), /pnpm@10\.28\.0/);
  assert.throws(() => ensurePnpm("10.28.0", fakeRun([null, null]).run), /null/);
});
