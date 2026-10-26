# โครงสร้างโฟลเดอร์ frontend

กลับไป [ภาพรวม](overview.md) · [ฟังก์ชันและหน้าจอ](functions.md) · [Services และ API](services.md) · [Vitest](testing.md)

จัดโครงสร้างตามบทบาทของไฟล์ โดยแยกแอป ฟีเจอร์ โค้ดร่วม ชุดทดสอบ และเอกสาร การย้ายนี้เปลี่ยนตำแหน่งไฟล์และ import paths ไม่เปลี่ยน routes, API endpoints หรือ business logic

## โครงสร้างหลัก

```text
classroom-booking-frontend/
├── src/
│   ├── main.tsx                  # จุดเริ่มต้นของ React
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx
│   │   ├── queryClient.ts
│   │   ├── router.tsx
│   │   ├── config/               # เมนูผู้ใช้และแอดมิน
│   │   └── layouts/              # AppLayout และ CSS ของโครงหน้าหลัก
│   ├── features/
│   │   ├── admin/
│   │   │   ├── pages/            # Dashboard และหน้าจัดการ/รายงาน
│   │   │   ├── components/       # Analytics
│   │   │   └── styles/
│   │   ├── auth/
│   │   │   ├── pages/            # Login/Register ใน AuthPage.tsx
│   │   │   └── styles/
│   │   ├── booking/
│   │   │   ├── pages/            # ฟอร์ม ยืนยัน และตารางการใช้ห้อง
│   │   │   ├── components/       # BookingSummary
│   │   │   └── styles/
│   │   ├── booking-history/
│   │   │   └── pages/
│   │   ├── notifications/
│   │   │   ├── components/       # NotificationBell
│   │   │   └── styles/
│   │   ├── profile/
│   │   │   ├── pages/
│   │   │   └── styles/
│   │   └── rooms/
│   │       ├── pages/            # รายการและรายละเอียดห้อง
│   │       ├── components/       # RoomCard
│   │       └── styles/
│   └── shared/
│       ├── api/                  # Axios clients, API services และ response types
│       ├── components/           # common, data-display, permission
│       ├── config/               # ธีมและป้ายฟิลด์ส่วนกลาง
│       ├── constants/            # สถานะ อุปกรณ์ และวันสำคัญ
│       ├── hooks/                # queries.ts: query/mutation hooks ที่ใช้หลายฟีเจอร์
│       ├── i18n/                 # คำแปลไทย/อังกฤษและการตั้งค่า
│       ├── pages/                # ErrorPage ที่ใช้ร่วมกัน
│       ├── schemas/              # การตรวจสอบรูปข้อมูลฟอร์ม
│       ├── stores/               # session และธีม
│       ├── styles/               # global.css และ tokens
│       ├── types/                # โมเดล frontend ที่ใช้ร่วมกัน
│       └── utils/                # กฎช่วงเวลาและเงื่อนไขเปลี่ยนรายการ
├── tests/
│   ├── setup.ts                  # test environment และปิด HTTP ที่ไม่ได้ stub
│   ├── helpers/                  # fixtures, HTTP adapter และตัวช่วยเรียก hooks
│   └── unit/
│       ├── api/
│       ├── constants/
│       ├── hooks/
│       ├── schemas/
│       ├── stores/
│       └── utils/
├── public/                       # ภาพและ favicon ที่เรียกด้วย URL คงที่
├── docs/
│   ├── design-qa.md              # บันทึกตรวจงานออกแบบเดิม
│   └── frontend/
│       ├── overview.md
│       ├── functions.md
│       ├── services.md
│       ├── testing.md
│       └── structure.md
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json                 # รวม app/node/test projects
├── tsconfig.app.json             # ตรวจ src
├── tsconfig.node.json            # ตรวจไฟล์ config ของ Vite/Vitest
├── tsconfig.test.json            # ตรวจ tests และ imports ที่เกี่ยวข้อง
├── eslint.config.js
├── package.json
└── README.md                     # คงเนื้อหาเดิมตามคำสั่งผู้ดูแล
```

สร้าง `pages/components/styles` เฉพาะเมื่อมีไฟล์ใช้งานจริง ไม่สร้างโฟลเดอร์ว่างในทุกฟีเจอร์ และไม่มีการเพิ่ม barrel exports หรือ alias เพื่อรองรับการย้ายครั้งนี้

## ไฟล์ใหม่ควรอยู่ตรงไหน

| ประเภทงาน | ตำแหน่ง | ตัวอย่าง |
| --- | --- | --- |
| หน้าที่ผูกกับ route | `src/features/<feature>/pages` | [BookingPage](../../src/features/booking/pages/BookingPage.tsx) |
| คอมโพเนนต์ของฟีเจอร์ | `src/features/<feature>/components` | [RoomCard](../../src/features/rooms/components/RoomCard.tsx) |
| CSS Module ของฟีเจอร์ | `src/features/<feature>/styles` | [Booking.module.css](../../src/features/booking/styles/Booking.module.css) |
| คอมโพเนนต์ที่ใช้ข้ามระบบ | `src/shared/components` | [QueryState/Panel/DataTable](../../src/shared/components/common/Common.tsx) |
| HTTP และ API contract | `src/shared/api` | [bookings.ts](../../src/shared/api/bookings.ts) |
| Query hooks ที่ใช้ข้ามฟีเจอร์ | `src/shared/hooks` | [queries.ts](../../src/shared/hooks/queries.ts) |
| โครงหน้าและเมนูของแอป | `src/app/layouts`, `src/app/config` | [AppLayout](../../src/app/layouts/AppLayout.tsx) |
| Unit tests | `tests/unit/<กลุ่ม>` | [bookings.test.ts](../../tests/unit/api/bookings.test.ts) |
| ตัวช่วยทดสอบ | `tests/helpers` | [http.ts](../../tests/helpers/http.ts) |
| เอกสาร frontend | `docs/frontend` | [services.md](services.md) |

## แนวทาง imports

- `app` ประกอบฟีเจอร์และ shared เข้าด้วยกัน เช่น router เลือกหน้า และ AppLayout เรียก NotificationBell
- `features` ใช้ API, hooks, types และ UI ส่วนกลางจาก `shared`; โค้ดที่ใช้เฉพาะฟีเจอร์ให้อยู่ใน feature นั้น
- `shared` ไม่ import หน้าจอจาก `features` และไม่ import ส่วนประกอบจาก `app`
- `src` ไม่ import จาก `tests` การจำลองข้อมูลและ HTTP อยู่ใน tests เท่านั้น
- ใช้ relative imports ตามโครงสร้างเดิมของโปรเจกต์ TypeScript/Vite ตรวจทั้ง static imports, CSS และ lazy imports
- การใช้คอมโพเนนต์ข้ามฟีเจอร์ที่มีอยู่เดิม เช่น history ใช้ BookingSummary ยังคงอยู่ หากนำไปใช้กว้างขึ้นค่อยพิจารณาขอบเขต shared ตามการใช้งานจริง

## จุดที่ย้ายจากโครงสร้างเดิม

| ตำแหน่งเดิม | ตำแหน่งปัจจุบัน |
| --- | --- |
| `src/api` | `src/shared/api` |
| `src/services/queries.ts` | `src/shared/hooks/queries.ts` |
| `src/components` | `src/shared/components` |
| `src/layouts` | `src/app/layouts` |
| เมนูใน `src/config` | `src/app/config` |
| ธีม/ป้ายฟิลด์ใน `src/config` | `src/shared/config` |
| `src/constants`, `src/i18n`, `src/pages` | กลุ่มชื่อเดียวกันภายใต้ `src/shared` |
| `src/schemas`, `src/stores`, `src/types`, `src/utils` | กลุ่มชื่อเดียวกันภายใต้ `src/shared` |
| `src/index.css` | `src/shared/styles/global.css` |
| ไฟล์หน้าจอ/คอมโพเนนต์/CSS ที่อยู่รากของแต่ละ feature | `pages/components/styles` ภายใน feature เดิม |
| `src/**/*.test.ts` | `tests/unit/<กลุ่ม>/*.test.ts` |
| `src/test/setup.ts` | `tests/setup.ts` |
| ตัวช่วยใน `src/test` | `tests/helpers` |
| `design-qa.md` | `docs/design-qa.md` |

ตารางตำแหน่งเดิมมีไว้ช่วยตามไฟล์หลังย้าย ไม่ใช่โฟลเดอร์ที่ต้องสร้างกลับ หากพบลิงก์เก่าใน README หลัก ให้ใช้ลิงก์ปัจจุบันในเอกสารชุดนี้

## การตรวจหลังย้ายไฟล์ครั้งถัดไป

```sh
npm run test
npm run build
npm run lint
```

หากย้าย tests ให้แก้ `vitest.config.ts` และ `tsconfig.test.json`; หากย้ายหน้า route ให้แก้ static/lazy imports ใน router; หากย้าย CSS ให้แก้ imports ของทุกหน้าที่ใช้งานร่วมกัน และอัปเดตลิงก์เอกสารที่ชี้ไฟล์นั้น
