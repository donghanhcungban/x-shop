# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi ở đây, theo [Keep a Changelog 1.1.0](https://keepachangelog.com/vi/1.1.0/) và
[Semantic Versioning](https://semver.org/lang/vi/). Chưa có bản phát hành nào; mục `Unreleased` gom thay đổi đang chờ.

## [Unreleased]

### Changed

- Nâng Medusa 2.22.2 → 2.22.7 (cùng nhóm phụ thuộc minor/patch). Route RBAC native `/rbac/*` mà Medusa ≥ 2.22.3 mở ngoài `/admin` bị đóng: 403 với mọi actor và method, kể cả owner (ma trận vai trò của dự án là nguồn duy nhất). `GET /admin/modules` (khung dashboard gọi) mở cho người có vai trò; `/admin/audit-logs*` cố ý đóng. Header bảo mật API nay ghi đè header mặc định mà Medusa 2.22.7 tự đặt (`frame-ancestors 'self'`, `SAMEORIGIN`) để giữ CSP chặt; audit bước đăng nhập dở (`mfa_required`) vẫn ghi theo auth identity dù Medusa đã gắn actor.
- Chuyển chủ repo sang `www-donghanhcungban-org`: cập nhật liên kết repo (FUNDING, mẫu issue, security.txt, script/test liên quan) và dòng bản quyền trong `LICENSE`/`NOTICE`; link cũ vẫn chuyển hướng.

### Added

- Mở mã theo giấy phép MIT: `LICENSE`, `NOTICE` (thành phần bên thứ ba, nhãn hiệu), trường `license` trong `package.json`.
- Mục "Ủng hộ và liên hệ" trong README (mã VietQR, liên hệ, hỗ trợ triển khai) và `.github/FUNDING.yml`.

- Bộ tài liệu sức khoẻ cộng đồng: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`,
  mẫu issue, `security.txt`, `.gitattributes`.
- Job CI `readme-smoke` chạy các lệnh trong README từ clone sạch.
