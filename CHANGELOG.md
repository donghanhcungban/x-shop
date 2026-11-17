# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi ở đây, theo [Keep a Changelog 1.1.0](https://keepachangelog.com/vi/1.1.0/) và
[Semantic Versioning](https://semver.org/lang/vi/). Chưa có bản phát hành nào; mục `Unreleased` gom thay đổi đang chờ.

## [Unreleased]

### Changed

- `packageManager` ghim kèm hash (`pnpm@10.28.0+sha512.<hex>`); `scripts/install-pnpm.mjs` `npm pack` tarball vào thư
  mục tạm, kiểm sha512 với hash ghim, lệch thì dừng, khớp mới cài từ tarball (`--ignore-scripts`) — BASE-DEP-008.
- Runtime lên Node.js 26 LTS (`.nvmrc` 26.13.1, `engines` `>=26.13.1 <27`, image nền `node:26.13.1-bookworm-slim`,
  `@types/node` 26) — ADR-0009, thay #37. Node 26 không kèm corepack: cài pnpm đúng `packageManager` bằng
  `node scripts/install-pnpm.mjs` (README, `xt.yaml` `setup`, `pr-policy.yml`, Dockerfile).
- Chuyển chủ repo sang `www-donghanhcungban-org`: cập nhật liên kết repo (FUNDING, mẫu issue, security.txt, script/test liên quan) và dòng bản quyền trong `LICENSE`/`NOTICE`; link cũ vẫn chuyển hướng.

### Added

- Mở mã theo giấy phép MIT: `LICENSE`, `NOTICE` (thành phần bên thứ ba, nhãn hiệu), trường `license` trong `package.json`.
- Mục "Ủng hộ và liên hệ" trong README (mã VietQR, liên hệ, hỗ trợ triển khai) và `.github/FUNDING.yml`.

- Bộ tài liệu sức khoẻ cộng đồng: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`,
  mẫu issue, `security.txt`, `.gitattributes`.
- Job CI `readme-smoke` chạy các lệnh trong README từ clone sạch.
