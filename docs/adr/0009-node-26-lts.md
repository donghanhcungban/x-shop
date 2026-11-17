# ADR-0009 — Runtime Node.js 26 LTS; pnpm cài qua npm thay corepack

## Trạng thái

Accepted (2026-11-17). Thay dòng "Runtime" của ADR-0004 (Node.js 22.22.x); phần còn lại của ADR-0004 giữ nguyên.

## Ngày

2026-11-17

## Bối cảnh

- Dòng Node 22 đang ở pha Maintenance, EOL 2027-04-30; `scripts/eol-check.mjs` sẽ cảnh báo từ < 183 ngày (khoảng 2026-10-29 trở đi) và ADR-0004 đặt điều kiện đọc lại "Node 22 hết hỗ trợ LTS".
- Lịch phát hành chính thức (<https://raw.githubusercontent.com/nodejs/Release/main/schedule.json>, đọc 2026-11-17): `v26` start 2026-05-05, **lts 2026-10-28**, maintenance 2027-10-20, end **2029-04-30** (codename Lithium). Chỉ mục bản phát hành (<https://nodejs.org/dist/index.json>, đọc 2026-11-17): `v26.13.0` (2026-10-28) là bản LTS đầu tiên, `v26.13.1` (2026-11-10, LTS "Lithium", npm 11.20.0) là bản mới nhất.
- Dependabot PR #37 nâng image nền `node:22.22.0-bookworm-slim` → `node:26.13.0-bookworm-slim` và đỏ ở job `image`: `corepack: not found`. Node >= 25 không còn kèm corepack, nên mọi chỗ dùng `corepack enable` (Dockerfile, `setup` của `xt.yaml`, `pr-policy.yml`, README) hỏng khi nâng runtime.
- Không gói phụ thuộc nào khai `engines` loại trừ Node 26 (Medusa 2.22 đòi `>=22.22.0`); gói native (`@parcel/watcher`, `msgpackr-extract`) dùng N-API nên không gắn ABI của một bản Node.

## Phương án đã cân nhắc

1. **Giữ Node 22 tới gần EOL** — không chọn: chỉ dời việc; Node 22 không còn bản sửa tính năng, image nền đóng băng lâu (tag 22.22.0 từ 2026-02-24), và PR Dependabot docker major sẽ đỏ lặp lại.
2. **Lên Node 24 LTS** (EOL 2028-04-30) — không chọn: cũng không kèm corepack thì vẫn phải đổi cách cài pnpm, nhưng hạn hỗ trợ ngắn hơn Node 26 một năm; khung (07-frontend/build-and-tooling) cho đổi sang 26 khi chuỗi công cụ xác nhận — PR này chính là bước xác nhận (gate + CI).
3. **Lên Node 26 LTS, cài pnpm bằng `npm install -g corepack` rồi `corepack enable`** — không chọn: thêm một công cụ phải ghim/nâng tay (Dependabot không theo dõi gói cài toàn cục) chỉ để lấy lại hành vi cũ.
4. **Lên Node 26 LTS, cài pnpm đúng `packageManager` bằng npm kèm Node qua `scripts/install-pnpm.mjs`** — chọn.

## Quyết định

- Runtime: Node.js **26.13.1** (`.nvmrc`), `engines.node` `>=26.13.1 <27` ở `package.json` gốc và `apps/backend`; `@types/node` `^26.6.6`. CI đọc `.nvmrc` qua `actions/setup-node` (`node-version-file`) như trước.
- Image nền: `node:26.13.1-bookworm-slim` ghim digest manifest list `sha256:5df79989ed68…` (Docker Hub, đọc 2026-11-17).
- pnpm: `scripts/install-pnpm.mjs` đọc `packageManager` (chỉ nhận dạng `pnpm@X.Y.Z`), có đúng bản thì không làm gì, thiếu/lệch thì `npm install --global --ignore-scripts pnpm@<bản>` rồi kiểm lại `pnpm --version`. Dùng ở README (khối "Bắt đầu nhanh", job `onboarding-smoke`), `setup` của `xt.yaml`, `pr-policy.yml`, stage `pnpm` của Dockerfile. `packageManager` vẫn là nguồn phiên bản duy nhất.
- Toàn vẹn gói pnpm: npm kiểm `integrity` (sha512) của tarball theo metadata registry — cùng gốc tin cậy (registry npm) với corepack trước đây; `--ignore-scripts` không chạy script vòng đời. Runtime image vẫn bỏ npm/npx/yarn (và đường dẫn corepack nếu image nền có lại).

## Hệ quả

- Hỗ trợ bảo mật tới 2029-04-30 (thay 2027-04-30); `eol-check` hết cảnh báo Node.
- Máy dev cần Node 26 (`nvm install` theo `.nvmrc`); `corepack enable` không còn là lệnh cài chuẩn.
- Mốc đo hiệu năng/coverage cũ ghi "Node 22.22.0" (docs/perf, docs/ops/perf, coverage-baseline) là số lịch sử, không đo lại trong PR này.
- Đường lùi: revert PR (`.nvmrc`, `engines`, `@types/node` + lockfile, Dockerfile, `xt.yaml`); không có thay đổi dữ liệu hay migration. Script cài pnpm vẫn chạy được trên Node 22 (npm kèm Node), nên chỉ cần đổi lại phiên bản.

## Điều kiện đọc lại

- Node 26 vào Maintenance (2027-10-20) — cân nhắc lên Node 28 LTS khi dòng đó thành LTS.
- pnpm đổi cách phân phối khuyến nghị (vd. bản độc lập có checksum) hoặc `packageManager` cần kèm hash → mở rộng `install-pnpm.mjs` kèm test.
- Medusa/Next nâng `engines` loại trừ Node 26.
