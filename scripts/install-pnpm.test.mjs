import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ensurePnpm, installedPnpm, packVerified, pnpmSpec, pnpmVersion } from "./install-pnpm.mjs";

const HEX = "a".repeat(128);
const pm = (v) => JSON.stringify({ packageManager: v });

test("pnpmVersion/pnpmSpec: lấy đúng X.Y.Z, có hoặc không có +sha512", () => {
  assert.equal(pnpmVersion(pm("pnpm@10.28.0")), "10.28.0");
  assert.deepEqual(pnpmSpec(pm("pnpm@10.28.0")), { version: "10.28.0", sha512: null });
  assert.deepEqual(pnpmSpec(pm(`pnpm@10.28.0+sha512.${HEX}`)), { version: "10.28.0", sha512: HEX });
});

test("pnpmSpec: package.json thật của repo ghim pnpm@X.Y.Z kèm sha512 (BASE-DEP-008)", () => {
  const spec = pnpmSpec(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(spec.version, /^\d+\.\d+\.\d+$/);
  assert.match(spec.sha512 ?? "", /^[0-9a-f]{128}$/);
});

test("pnpmSpec: thiếu, sai trình quản lý, range, hash sai dạng/thuật toán, rỗng → ném lỗi", () => {
  for (const v of [
    undefined,
    null,
    "",
    "yarn@4.5.0",
    "pnpm@^10.28.0",
    "pnpm@10",
    "pnpm@10.28.0+sha512.abc",
    `pnpm@10.28.0+sha512.${"A".repeat(128)}`,
    `pnpm@10.28.0+sha256.${"a".repeat(64)}`,
    `pnpm@10.28.0+sha512.${HEX}x`,
    10,
  ]) {
    assert.throws(() => pnpmSpec(pm(v)), /packageManager/, String(v));
  }
});

/**
 * Giả lập execFileSync: `versions` = chuỗi trả lần lượt cho mỗi `pnpm --version` (null = lệnh lỗi); `npm pack` ghi
 * tarball có nội dung `tarball` vào `--pack-destination` (null = không ghi gì).
 */
function fakeRun(versions, tarball = "tarball-bytes") {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args].join(" "));
    if (cmd === "pnpm") {
      const v = versions.shift();
      if (v === null || v === undefined) throw new Error("ENOENT");
      return `${v}\n`;
    }
    if (cmd === "npm" && args[0] === "pack" && tarball !== null) {
      const dir = args[args.indexOf("--pack-destination") + 1];
      writeFileSync(join(dir, `pnpm-${args[1].split("@")[1]}.tgz`), tarball);
    }
    return "";
  };
  return { run, calls };
}

const sha = (s) => createHash("sha512").update(s).digest("hex");

/** Thư mục gốc tạm riêng cho một test; trả `[root, dọn]`. */
function tmpRoot() {
  const root = mkdtempSync(join(tmpdir(), "install-pnpm-test-"));
  return [root, () => rmSync(root, { recursive: true, force: true })];
}

test("installedPnpm: không có pnpm → null; có → bản đã trim", () => {
  assert.equal(installedPnpm(fakeRun([null]).run), null);
  assert.equal(installedPnpm(fakeRun(["10.28.0"]).run), "10.28.0");
});

test("ensurePnpm: đúng bản → không gọi npm (có hay không hash)", () => {
  const a = fakeRun(["10.28.0"]);
  assert.equal(ensurePnpm("10.28.0", a.run), "present");
  assert.deepEqual(a.calls, ["pnpm --version"]);
  const b = fakeRun(["10.28.0"]);
  assert.equal(ensurePnpm({ version: "10.28.0", sha512: HEX }, b.run), "present");
  assert.deepEqual(b.calls, ["pnpm --version"]);
});

test("ensurePnpm không hash: thiếu pnpm → npm install đúng bản, không chạy script cài đặt", () => {
  const { run, calls } = fakeRun([null, "10.28.0"]);
  assert.equal(ensurePnpm("10.28.0", run), "installed");
  assert.deepEqual(calls, [
    "pnpm --version",
    "npm install --global --ignore-scripts --no-audit --no-fund --no-update-notifier pnpm@10.28.0",
    "pnpm --version",
  ]);
});

test("ensurePnpm có hash khớp: npm pack → kiểm sha512 → cài từ tarball (--ignore-scripts), dọn thư mục tạm", () => {
  const [root, done] = tmpRoot();
  try {
    const { run, calls } = fakeRun([null, "10.28.0"], "đúng-tarball");
    assert.equal(ensurePnpm({ version: "10.28.0", sha512: sha("đúng-tarball") }, run, root), "installed");
    assert.equal(calls.length, 4);
    assert.match(calls[1], /^npm pack pnpm@10\.28\.0 --pack-destination \S+ --ignore-scripts /);
    assert.match(calls[2], /^npm install --global --ignore-scripts .* \S+\/pnpm-10\.28\.0\.tgz$/);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    done();
  }
});

test("ensurePnpm có hash lệch: ném lỗi, KHÔNG gọi npm install, vẫn dọn thư mục tạm", () => {
  const [root, done] = tmpRoot();
  try {
    const { run, calls } = fakeRun([null, "10.28.0"], "tarball-bị-đổi");
    assert.throws(
      () => ensurePnpm({ version: "10.28.0", sha512: sha("tarball-gốc") }, run, root),
      /sha512 của pnpm@10\.28\.0 không khớp/,
    );
    assert.ok(!calls.some((c) => c.startsWith("npm install")), calls.join("\n"));
    assert.deepEqual(readdirSync(root), []);
  } finally {
    done();
  }
});

test("packVerified: npm pack không tạo tarball → ném lỗi", () => {
  const [root, done] = tmpRoot();
  try {
    assert.throws(
      () => packVerified("10.28.0", HEX, root, fakeRun([], null).run),
      /không tạo đúng một tarball/,
    );
    assert.ok(existsSync(root));
  } finally {
    done();
  }
});

test("ensurePnpm: bản khác → cài lại; cài xong vẫn lệch → ném lỗi", () => {
  assert.equal(ensurePnpm("10.28.0", fakeRun(["9.15.0", "10.28.0"]).run), "installed");
  assert.throws(() => ensurePnpm("10.28.0", fakeRun(["9.15.0", "9.15.0"]).run), /pnpm@10\.28\.0/);
  assert.throws(() => ensurePnpm("10.28.0", fakeRun([null, null]).run), /null/);
});
