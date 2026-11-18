#!/usr/bin/env node
// Cài pnpm ĐÚNG bản khai ở `packageManager` của package.json gốc (PRF-WEB-010, ADR-0009). Node >= 25 không còn kèm
// corepack nên `corepack enable` không dùng được; script này thay nó ở README, xt.yaml (`setup`), workflow và Dockerfile —
// một nguồn phiên bản duy nhất là `packageManager` (Dependabot nâng trường này, không phải sửa tay nhiều nơi).
// Dạng nhận: `pnpm@X.Y.Z` hoặc `pnpm@X.Y.Z+sha512.<128 hex>` (dạng corepack). Có hash (BASE-DEP-008): `npm pack` tarball
// vào thư mục tạm, so sha512 với hash ghim, khớp mới `npm install --global --ignore-scripts <tarball>`; lệch → thoát 1,
// không cài. Không hash: `npm install --global --ignore-scripts pnpm@<bản>` (chỉ integrity theo metadata registry).
// Đã có đúng bản → không làm gì. Dạng khác (range, thẻ, hash khác sha512) → thoát 1, không đoán.
// CLI: node scripts/install-pnpm.mjs. Thoát 0 = pnpm đúng bản đã sẵn; 1 = lỗi (in lý do).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const PACKAGE_MANAGER_RE = /^pnpm@(\d+\.\d+\.\d+)(?:\+sha512\.([0-9a-f]{128}))?$/;

/** `{version, sha512}` từ nội dung package.json (`sha512` = hex hoặc null); ném lỗi khi thiếu/sai dạng. */
export function pnpmSpec(packageJsonText) {
  const pm = JSON.parse(packageJsonText).packageManager;
  const m = typeof pm === "string" ? PACKAGE_MANAGER_RE.exec(pm) : null;
  if (!m) {
    throw new Error(
      `packageManager phải có dạng "pnpm@X.Y.Z" hoặc "pnpm@X.Y.Z+sha512.<hex>", đang là ${JSON.stringify(pm)}`,
    );
  }
  return { version: m[1], sha512: m[2] ?? null };
}

/** Bản pnpm từ nội dung package.json (giữ cho mã gọi cũ). */
export function pnpmVersion(packageJsonText) {
  return pnpmSpec(packageJsonText).version;
}

/** Bản pnpm đang có trên PATH, hoặc null khi không có/không chạy được. */
export function installedPnpm(run = execFileSync) {
  try {
    return run("pnpm", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const NPM_FLAGS = ["--ignore-scripts", "--no-audit", "--no-fund", "--no-update-notifier"];

/** `npm pack` tarball pnpm@version vào `dir`, kiểm sha512 (hex) — trả đường dẫn tarball; lệch/không có → ném lỗi. */
export function packVerified(version, sha512, dir, run = execFileSync) {
  // --loglevel=warn: bỏ danh sách nội dung tarball (hàng trăm dòng `npm notice`) khỏi log CI; lỗi vẫn in.
  run("npm", ["pack", `pnpm@${version}`, "--pack-destination", dir, ...NPM_FLAGS, "--loglevel=warn"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const tgz = readdirSync(dir).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 1)
    throw new Error(`npm pack pnpm@${version} không tạo đúng một tarball (${tgz.length})`);
  const file = join(dir, tgz[0]);
  const got = createHash("sha512").update(readFileSync(file)).digest("hex");
  if (got !== sha512) {
    throw new Error(`sha512 của pnpm@${version} không khớp packageManager: ghim ${sha512}, tải về ${got}`);
  }
  return file;
}

/**
 * Đảm bảo pnpm `spec.version` trên PATH; trả "present" hoặc "installed", ném lỗi khi hash lệch hoặc cài xong vẫn lệch bản.
 * `spec` là `{version, sha512}` hoặc chuỗi bản (không hash).
 */
export function ensurePnpm(spec, run = execFileSync, tmpRoot = tmpdir()) {
  const { version, sha512 } = typeof spec === "string" ? { version: spec, sha512: null } : spec;
  if (installedPnpm(run) === version) return "present";
  if (sha512) {
    const dir = mkdtempSync(join(tmpRoot, "install-pnpm-"));
    try {
      const tgz = packVerified(version, sha512, dir, run);
      run("npm", ["install", "--global", ...NPM_FLAGS, tgz], { stdio: "inherit" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    run("npm", ["install", "--global", ...NPM_FLAGS, `pnpm@${version}`], { stdio: "inherit" });
  }
  const now = installedPnpm(run);
  if (now !== version)
    throw new Error(`cài pnpm@${version} xong nhưng \`pnpm --version\` trả ${JSON.stringify(now)}`);
  return "installed";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const spec = pnpmSpec(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const result = ensurePnpm(spec);
    const how = spec.sha512 ? " (đã kiểm sha512)" : "";
    console.log(
      result === "present" ? `pnpm ${spec.version} đã có sẵn.` : `Đã cài pnpm ${spec.version}${how}.`,
    );
  } catch (err) {
    console.error(`install-pnpm: ${err.message}`);
    process.exit(1);
  }
}
