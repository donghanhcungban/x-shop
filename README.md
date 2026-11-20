# x-shop

Webapp shop thời trang Việt Nam cho khách mua trên điện thoại: mua không cần tài khoản, thanh toán COD hoặc VNPAY, giao
hàng qua GHN, có đổi trả và đối soát cho chủ shop. Đặc tả gốc: [`docs/specs/DAC-TA-GOC.md`](docs/specs/DAC-TA-GOC.md).

## Bắt đầu nhanh (từ clone sạch đến test xanh, 3 lệnh)

```bash
node scripts/install-pnpm.mjs
pnpm install --frozen-lockfile
pnpm test
```

Không bước tay nào khác: `pnpm test` chạy test đơn vị, không cần Postgres/Redis hay khoá bí mật. Các lệnh trên trích từ
`setup` và `test` của [`xt.yaml`](xt.yaml); CI chạy lại đúng chúng (job `onboarding-smoke`).

## Yêu cầu môi trường

- Node.js `26.13.1` (Node 26 LTS, ghim ở `.nvmrc`; `engines`: `>=26.13.1 <27` — [ADR-0009](docs/adr/0009-node-26-lts.md)).
- pnpm `10.28.0` (khai ở `packageManager` kèm `+sha512.<hex>`; `node scripts/install-pnpm.mjs` tải tarball, kiểm sha512
  với hash ghim rồi mới cài qua npm — Node 26 không còn kèm corepack).
- Công cụ X-Templates và cổng phát triển dùng CPython 3.15.2 (như CI).
- Chạy backend và test tích hợp: PostgreSQL 16 và Redis 7 (`bash scripts/dev-services.sh` dựng bản cục bộ).

## Cài và chạy

```bash
bash scripts/dev-services.sh          # Postgres + Redis cục bộ, in ra DATABASE_URL / REDIS_URL
pnpm --filter @x-shop/backend dev     # Medusa backend + admin
pnpm --filter @x-shop/storefront dev  # Next.js storefront
```

Cấu trúc: `packages/domain` (lõi thuần TypeScript) · `apps/backend` (Medusa v2) · `apps/storefront` (Next.js) · `docs/`.

## Chạy test và kiểm tra

```bash
pnpm test                # test đơn vị
pnpm test:integration    # test tích hợp (cần Postgres/Redis)
pnpm lint
pnpm typecheck
pnpm format:check
```

## Cấu hình

Biến môi trường và giá trị mẫu (đều là giá trị giả) nằm ở [`docs/ops/ENV.md`](docs/ops/ENV.md); tạo `.env` cục bộ từ đó.
Không commit bí mật thật.

## Đóng góp và liên hệ

Luật làm việc và commit/PR: [`AGENTS.md`](AGENTS.md). Tài liệu: [`PROJECT.md`](PROJECT.md), [`docs/adr/`](docs/adr/),
[`docs/ops/RUNBOOK.md`](docs/ops/RUNBOOK.md). Liên hệ: lienhe@donghanhcungban.org.

## Ủng hộ và liên hệ

Dự án miễn phí và mở mã. Nếu nó giúp bạn tiết kiệm thời gian, bạn có thể ủng hộ để tác giả duy trì và phát triển tiếp:

<img src="docs/assets/donate-vietqr-techcombank.png" alt="Mã VietQR ủng hộ: Techcombank, số tài khoản 890977819110" width="260">

- Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ, hoặc chuyển khoản **Techcombank — số tài khoản `890977819110`**.
- Liên hệ, góp ý, hợp tác: điện thoại / Zalo **[+84 977 819 110](https://zalo.me/0977819110)** ·
  email **admin@donghanhcungban.org**. Lỗi và đề xuất tính năng xin mở issue trên GitHub.
- **Hỗ trợ triển khai:** tác giả hỗ trợ cài đặt và áp dụng dự án cho nhu cầu của bạn — **trực tiếp tại TP. Hồ Chí Minh**
  hoặc **online** ở bất kỳ đâu. Liên hệ qua điện thoại/Zalo hoặc email ở trên để trao đổi.

Ủng hộ là tự nguyện, không kèm quyền lợi riêng; hỗ trợ triển khai thoả thuận riêng theo từng dự án.

## Giấy phép

Phát hành theo giấy phép [MIT](LICENSE). Thành phần bên thứ ba giữ giấy phép gốc (dữ liệu đơn vị hành chính
`packages/domain/data/vn-admin-units.json` — MIT, xem `vn-admin-units.LICENSE`); chi tiết và nhãn hiệu ở [NOTICE](NOTICE).
