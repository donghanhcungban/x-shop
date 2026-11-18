#!/usr/bin/env node
// Cài pnpm ĐÚNG bản khai ở `packageManager` của package.json gốc (PRF-WEB-010, ADR-0009). Node >= 25 không còn kèm
// corepack nên `corepack enable` không dùng được; script này thay nó ở README, xt.yaml (`setup`), workflow và Dockerfile —
// một nguồn phiên bản duy nhất là `packageManager` (Dependabot nâng trường này, không phải sửa tay nhiều nơi).
// Đã có đúng bản → không làm gì; khác/thiếu → `npm install --global --ignore-scripts pnpm@<bản>` rồi kiểm lại.
// Chỉ nhận dạng `pnpm@X.Y.Z` (không range, không hash): dạng khác → thoát 1, không đoán.
// CLI: node scripts/install-pnpm.mjs. Thoát 0 = pnpm đúng bản đã sẵn; 1 = lỗi (in lý do).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PACKAGE_MANAGER_RE = /^pnpm@(\d+\.\d+\.\d+)$/;

/** Bản pnpm từ nội dung package.json; ném lỗi khi thiếu hoặc không đúng dạng `pnpm@X.Y.Z`. */
export function pnpmVersion(packageJsonText) {
  const pm = JSON.parse(packageJsonText).packageManager;
  const m = typeof pm === "string" ? PACKAGE_MANAGER_RE.exec(pm) : null;
  if (!m) throw new Error(`packageManager phải có dạng "pnpm@X.Y.Z", đang là ${JSON.stringify(pm)}`);
  return m[1];
}

/** Bản pnpm đang có trên PATH, hoặc null khi không có/không chạy được. */
export function installedPnpm(run = execFileSync) {
  try {
    return run("pnpm", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** Đảm bảo pnpm `want` trên PATH; trả "present" hoặc "installed", ném lỗi khi cài xong vẫn lệch. */
export function ensurePnpm(want, run = execFileSync) {
  if (installedPnpm(run) === want) return "present";
  run(
    "npm",
    [
      "install",
      "--global",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-update-notifier",
      `pnpm@${want}`,
    ],
    {
      stdio: "inherit",
    },
  );
  const now = installedPnpm(run);
  if (now !== want)
    throw new Error(`cài pnpm@${want} xong nhưng \`pnpm --version\` trả ${JSON.stringify(now)}`);
  return "installed";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const want = pnpmVersion(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const result = ensurePnpm(want);
    console.log(result === "present" ? `pnpm ${want} đã có sẵn.` : `Đã cài pnpm ${want}.`);
  } catch (err) {
    console.error(`install-pnpm: ${err.message}`);
    process.exit(1);
  }
}
