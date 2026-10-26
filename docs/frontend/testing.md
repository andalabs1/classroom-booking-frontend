# คู่มือทดสอบ frontend ด้วย Vitest

กลับไป [ภาพรวม](overview.md) · [โครงสร้างโฟลเดอร์](structure.md) · [ฟังก์ชันและหน้าจอ](functions.md) · [Services และ API](services.md)

ชุดทดสอบปรับให้ตรงกับ frontend หลังถอดระบบ mock เดิม ใช้ Vitest ที่ติดตั้งอยู่ในโปรเจกต์ ไม่เพิ่มไลบรารีทดสอบหรือจำลอง backend ใน runtime ของแอป

## คำสั่ง

```sh
# รันทุกชุดครั้งเดียว เหมาะกับ CI และตรวจงานก่อนส่ง
npm run test

# เฝ้าการแก้ไฟล์ระหว่างพัฒนา
npm run test:watch

# รันเฉพาะกลุ่มหรือไฟล์
npm run test -- tests/unit/api
npm run test -- tests/unit/hooks/queries.test.ts
npm run test -- tests/unit/stores/authStore.test.ts

# ตรวจ type ของทั้งซอร์สและ tests และสร้างไฟล์เผยแพร่
npm run build
npm run lint
```

ไม่ต้องมีบัญชีทดสอบหรือเปิด backend เพื่อรัน Vitest โดย HTTP ที่ไม่ได้กำหนด stub จะถูกปฏิเสธทันทีแทนการส่งออกไปจริง

## การตั้งค่าและตัวช่วย

| ไฟล์ | หน้าที่ |
| --- | --- |
| [vitest.config.ts](../../vitest.config.ts) | environment เป็น Node; ค้น `tests/unit/**/*.test.{ts,tsx}`; โหลด setup; restore spies ทุก test; กำหนด `TZ=Asia/Bangkok` ให้การแปลงเวลาคงที่ |
| [tests/setup.ts](../../tests/setup.ts) | ติดตั้ง Storage แบบ Map และ window เท่าที่ unit tests ต้องใช้ ล้าง storage ก่อนแต่ละ test และปิด HTTP ที่ไม่ผ่าน stub |
| [tests/helpers/http.ts](../../tests/helpers/http.ts) | `httpStub(client)` แทน Axios adapter เฉพาะตอนทดสอบ บันทึกคำขอและคืน response/error ตามที่ test กำหนด; restore adapter หลังแต่ละ test |
| [tests/helpers/fixtures.ts](../../tests/helpers/fixtures.ts) | ข้อมูลขนาดเล็กสำหรับ API contract tests เท่านั้น ได้แก่ user/session, room, booking/draft และ business rules |
| [tests/helpers/hooks.ts](../../tests/helpers/hooks.ts) | `renderQueryHook(client, useHook)` เรียก hook ผ่าน React server render ภายใต้ QueryClientProvider แล้วคืน observer/mutation methods สำหรับทดสอบจริงกับ QueryClient |
| [tsconfig.test.json](../../tsconfig.test.json) | ตรวจ type ของ tests แยกจากซอร์สแอป โดยรันร่วมกับ `npm run build` |
| [tsconfig.node.json](../../tsconfig.node.json) | รวม vitest.config.ts ในการตรวจ TypeScript |

`httpStub.reply(data, meta?)` สร้าง envelope สำเร็จ, `raw(body, status?)` ระบุ response โดยตรง รวม HTTP error และ Blob, `fail(error)` จำลอง network/adapter failure ส่วน `last()` และ `requests` ใช้ตรวจ method/path/params/body/headers หลัง Axios เตรียมคำขอแล้ว

การ stub ที่ adapter ทำให้ยังผ่าน API adapters และ Axios interceptors จริง ไม่แทนค่าผลลัพธ์ของ service ที่กำลังทดสอบโดยตรง ข้อมูลใน `tests/helpers/` ไม่ถูก import โดย entry point ของแอป และไม่ได้ใช้เป็น fallback เมื่อ API จริงขัดข้อง

## สิ่งที่ทดสอบ

| ไฟล์ | ขอบเขต |
| --- | --- |
| [auth.test.ts](../../tests/unit/api/auth.test.ts) | login/register/logout, ID จริงแทน userCode, ชื่อและ role, ไม่คืน password และ envelope ที่ล้มเหลว |
| [axiosClient.test.ts](../../tests/unit/api/axiosClient.test.ts) | token แยก portal, public client ไม่แนบ token, อ่าน token ล่าสุด, logout, HTTP 401 ล้างเฉพาะ session ที่เกี่ยวข้อง, HTTP/network/non-Axios errors |
| [classrooms.test.ts](../../tests/unit/api/classrooms.test.ts) | list/detail/availability/schedule/availabilityForRoom, pagination, URL encoding, optional room fields, range parameters และการแปลงสถานะตารางปัจจุบัน |
| [bookings.test.ts](../../tests/unit/api/bookings.test.ts) | API ทุกเมธอด, status mapping, payload +07:00, editingId ไม่หลุดไป body, optional note/reason, nested room, calendar metadata และ conflict |
| [users.test.ts](../../tests/unit/api/users.test.ts) | profile/directory/update/password/myBookings/businessRules พร้อมตัวกรองและ pagination |
| [notifications.test.ts](../../tests/unit/api/notifications.test.ts) | token ตาม portal, read filters, kind mapping, unread count, mark-one/all และ read failures |
| [uploads.test.ts](../../tests/unit/api/uploads.test.ts) | File ใน FormData, delete URL, upload errors และการหา key จาก URL |
| [admin.test.ts](../../tests/unit/api/admin.test.ts) | ทุกเมธอด dashboard/rooms/bookings/users/reports/audit, request bodies ของแต่ละ action, nullable relations, status filters และ CSV Blob |
| [queries.test.ts](../../tests/unit/hooks/queries.test.ts) | query hooks ทุกตัวกับ API adapters จริงและ QueryClient, query keys/ตัวกรอง, enabled guards, portal cache, stale time, report aggregation/error และ useAction invalidation/ข้อความผลลัพธ์ |
| [authStore.test.ts](../../tests/unit/stores/authStore.test.ts) | session แยก user/admin, persistence/hydration/logout, migration ของ session เก่าและการใช้ข้อมูลคีย์ใหม่ก่อน |
| [themeStore.test.ts](../../tests/unit/stores/themeStore.test.ts) | โหมดเริ่มต้น toggle, persistence และ hydration |
| [bookingSchema.test.ts](../../tests/unit/schemas/bookingSchema.test.ts) | required fields, attendees, purpose trim/ความยาว, equipment/note, editingId และ parse draft |
| [bookingRules.test.ts](../../tests/unit/utils/bookingRules.test.ts) | เวลาทับซ้อน/ช่วงติดกัน และ canChangeBooking ของแต่ละสถานะรวมขอบเขตเวลาเริ่ม |
| [thaiImportantDays.test.ts](../../tests/unit/constants/thaiImportantDays.test.ts) | lookup วันคงที่ วันเฉพาะปี และวันที่ไม่มีรายการตามข้อมูลในซอร์ส |

## ขอบเขตของการทดสอบ hooks

Query tests ใช้ React/TanStack Query จริง: เรียก `refetch()` แล้วตรวจข้อมูลและ error ใน QueryClient cache; mutation tests เรียก `mutateAsync()` แล้วตรวจผลและ cache invalidation โดย stub เฉพาะ HTTP และส่วนแสดง toast ของ Ant Design

ตัวช่วย server render ไม่ได้จำลองการ mount/unmount ของหน้าจอ ไม่ทดสอบการคลิก การแสดง loading หรือ timer polling ใน browser การตรวจ `isEnabled` ใน tests ตรวจเงื่อนไขของ observer ส่วนการ polling ทุก 10 วินาทีและ refetch เมื่อ focus ยังต้องตรวจผ่าน browser

## แนวทางเพิ่ม tests

1. ถ้าเพิ่ม endpoint ให้เพิ่ม test ในไฟล์ API เดียวกัน ตรวจผลที่มีความหมายต่อผู้ใช้และ outbound contract เช่น status, timezone, ID และ optional fields
2. เมื่อเพิ่ม query ให้ตรวจ cache key, เงื่อนไข enabled, API ที่เรียก และ error; เมื่อเพิ่ม mutation ให้ตรวจ cache ที่ได้รับผลกับกรณีล้มเหลว
3. ใช้ fixtures ใน tests เท่านั้น ไม่เพิ่ม service จำลองหรือ switch ใน runtime ของแอป
4. เรื่องเวลาให้ควบคุม clock ด้วย fake timers ใน test ที่จำเป็น และ restore หลังจบ ไม่อิงเวลาจริงของวันที่รัน
5. รักษา test isolation: restore adapter/spies/globals, ล้าง QueryClient และ storage เมื่อจบ/ก่อนเริ่มตามชนิดข้อมูล

## ข้อจำกัด

- การผ่าน tests ยืนยันพฤติกรรม frontend ต่อ contract ตัวอย่าง ไม่ยืนยันว่า backend ที่ deploy อยู่ตอบข้อมูลรูปแบบเดียวกัน
- ไม่มีการสร้าง แก้ไข หรือลบข้อมูลบน backend จริงระหว่างรัน Vitest
- ไม่ใช่ชุดทดสอบหน้าจอแบบ end-to-end หรือภาพหน้าจอ และยังไม่มี DOM testing library ในโปรเจกต์
- การแสดงผลภาษา ธีม ฟอร์ม การเดินหน้า router และ API integration จริงต้องตรวจผ่าน browser เพิ่มตามงาน
- ยังไม่ได้ติดตั้ง coverage provider หรือคำนวณเปอร์เซ็นต์ line/branch coverage; ตารางด้านบนระบุพฤติกรรมที่ทดสอบ ไม่ใช่เปอร์เซ็นต์ความครอบคลุม
