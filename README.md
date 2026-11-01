# pitch-booking-api

Backend PitchBooking viết lại từ bản Python (FastAPI + SQLAlchemy + Alembic) sang
**NestJS 11 + Prisma 6 + PostgreSQL**, code **TypeScript** (strict, biên dịch bằng `tsc`).

API (đường dẫn, request, response, mã lỗi, message) và schema database giữ nguyên như bản Python,
nên frontend và database hiện tại dùng được ngay.

## Yêu cầu

- Node.js >= 20 (khuyến nghị 24)
- PostgreSQL (hoặc Docker)

## Chạy nhanh

```bash
npm install                 # tự chạy `prisma generate`
cp .env.example .env        # rồi điền SECRET_KEY, DATABASE_URL, SMTP...
npx prisma migrate deploy   # tạo bảng + seed danh sách vị trí
npm run start:dev           # http://localhost:8000, Swagger: http://localhost:8000/docs
```

Chạy bằng Docker (DB + API):

```bash
docker compose up --build
```

> `DATABASE_URL` phải dùng scheme `postgresql://` (Prisma không hiểu `postgresql+asyncpg://`).
> Các biến môi trường khác cùng tên với bản Python.

## Scripts

| Lệnh | Mục đích |
| --- | --- |
| `npm run start:dev` | Chạy dev, tự reload khi sửa `src/` |
| `npm run typecheck` | Kiểm tra kiểu (`tsc --noEmit`, gồm cả `test/`) |
| `npm run build` | Biên dịch `src/` → `dist/` bằng `tsc` |
| `npm start` | Chạy bản build (`dist/main.js`) |
| `npm run prisma:migrate` | Áp dụng migration (`prisma migrate deploy`) |
| `npm run test:db` | Tạo DB test `pitchbooking_test` và áp migration |
| `npm test` | Chạy toàn bộ test (Jest + supertest, cần DB test) |

## Cấu trúc thư mục (đối chiếu với bản Python)

```
src/
├── main.ts                  # app/main.py – khởi động server
├── app.module.ts            # khai báo controller/service/repository cho NestJS
├── app.setup.ts             # CORS, security headers, format lỗi, Swagger
├── api/                     # app/api – controller (chỉ nhận request, gọi service)
│   ├── health.controller.ts
│   └── v1/ auth.controller.ts, user.controller.ts, team.controller.ts
├── services/                # app/services – logic nghiệp vụ
├── repositories/            # app/repositories – truy cập DB qua Prisma
├── schemas/                 # app/schemas – validate request (zod) + map response
├── modules/                 # enum (value object) theo từng module, app/models/enum.py
│   ├── team/domain/         # TeamRole, TeamMemberStatus, SportType, PitchType
│   ├── user/domain/         # Gender, UserRole
│   └── auth/domain/         # OtpPurpose
├── utils/validators.ts      # app/utils/validators.py
└── shared/                  # app/core – dùng chung giữa các module
    ├── domain/enum.ts       # enumValues() cho z.enum
    ├── infrastructure/
    │   ├── config.ts            # đọc biến môi trường (.env)
    │   ├── prisma.service.ts    # kết nối DB, pool (thay cho database.py)
    │   ├── prisma-errors.ts     # nhận diện lỗi ràng buộc của Prisma
    │   ├── rate-limit.ts        # giới hạn request theo IP
    │   └── security/            # token (JWT), password (argon2), otp, cookies
    └── presentation/
        ├── auth.guard.ts        # bắt buộc / tuỳ chọn đăng nhập
        ├── validation.pipe.ts   # chạy zod schema, trả 422
        └── http-exception.filter.ts  # trả lỗi dạng { "detail": ... }
prisma/
├── schema.prisma            # app/models/*.py
└── migrations/              # alembic/versions
test/                        # app/tests
```

Luồng xử lý: **controller → service → repository → Prisma**.

## Quy ước code

- **Repository** nhận `db` làm tham số đầu tiên: truyền `this.prisma` (chạy ngay) hoặc `tx`
  (trong transaction). Repository không tự mở transaction.
- **Service** quyết định transaction, giống `db.commit()` ở bản Python:

  ```js
  const tokens = await this.prisma.$transaction(async (tx) => {
    await this.userRepo.update(tx, user, { ... });
    return this.issueTokens(tx, user);   // throw trong callback => rollback
  });
  ```

  Việc tốn CPU (hash mật khẩu) hay gọi API ngoài thì làm **trước** transaction để transaction ngắn.
- **Validate request** bằng schema zod trong `src/schemas`, gắn ở controller:
  `@Body(new ZodValidationPipe(registerSchema)) data`. Dữ liệu sai → 422.
- **Lỗi nghiệp vụ** dùng exception của NestJS: `throw new BadRequestException('message')`
  → client nhận `{ "detail": "message" }`.
- **Đăng nhập bắt buộc**: `@UseGuards(AccessTokenGuard)` + `@CurrentUserId() userId`.
- **Rate limit**: gọi `checkRateLimit(req, 'scope', settings.RATE_LIMIT_X)` ở đầu handler.
- Tên field trong Prisma giữ `snake_case` giống cột DB và JSON của API, nên không cần map tên.
- Không dùng `mode: 'insensitive'` của Prisma để so sánh bằng (nó dùng `ILIKE`, `_` và `%` thành
  ký tự đại diện). Dùng `lower(col) = ${value}` như trong `user.repository.ts`.

## Database & migration

### Database mới

`npx prisma migrate deploy` tạo toàn bộ bảng, index, partial index `uq_team_leader` và seed 21 vị trí.

### Chuyển database đang dùng bởi bản Python (Alembic)

Schema đã được đối chiếu: tên bảng/cột/index/FK giống hệt. Chỉ cần đánh dấu migration đầu là đã áp dụng:

```bash
npx prisma migrate resolve --applied 0_init   # không chạy lại SQL tạo bảng
npx prisma migrate deploy                     # áp 1_column_defaults (thêm DEFAULT cho vài cột)
```

Khi bản Python ngừng chạy hẳn, có thể xoá bảng `alembic_version`
(nếu còn bảng này, `prisma migrate dev` sẽ báo drift).

### Tạo migration mới

```bash
# 1. Sửa prisma/schema.prisma
npx prisma migrate dev --create-only --name ten_thay_doi
# 2. Mở file migration.sql vừa tạo, XOÁ dòng `DROP INDEX "uq_team_leader"` nếu có
#    (Prisma không mô tả được partial index nên luôn muốn xoá nó)
npx prisma migrate dev
```

## Test

```bash
npm run test:db   # lần đầu hoặc khi có migration mới
npm test
```

Test dùng DB `pitchbooking_test` (hoặc `TEST_DATABASE_URL`) và từ chối chạy nếu tên DB khác.
Email được mock, OTP được cố định trong test.

## Khác biệt nhỏ so với bản Python

Logic nghiệp vụ được giữ nguyên. Những điểm khác chỉ nằm ở tầng kỹ thuật:

- Lỗi 422 vẫn có dạng `{ "detail": [{ "type", "loc", "msg" }] }` nhưng nội dung `msg` là của zod,
  không phải của Pydantic.
- Route không tồn tại trả `{ "detail": "Cannot GET /..." }` thay vì `"Not Found"`.
- Swagger (`/docs`, `/openapi.json`) liệt kê đủ endpoint nhưng không có schema request/response
  (JavaScript không có type metadata). Không có `/redoc`.
- Rate limit chỉ lưu trong bộ nhớ (không hỗ trợ `RATE_LIMIT_STORAGE_URI` Redis).
  Chạy nhiều instance thì cần chuyển sang Redis.
- `send-otp`: user "chờ xác thực" được lưu ngay khi tạo, OTP được tạo trong transaction riêng
  (bản Python gộp chung một transaction). Chỉ khác khi DB lỗi giữa hai bước.
- `login` nhận form-urlencoded như cũ, nhưng cũng chấp nhận body JSON.
- Tối ưu: đếm thành viên bằng `COUNT` thay vì tải cả danh sách; không eager-load dữ liệu không dùng;
  argon2 chạy bất đồng bộ nên không chặn event loop.
