# ฟังก์ชันและหน้าจอ

กลับไป [คู่มือส่งต่องาน](overview.md) · [โครงสร้างโฟลเดอร์](structure.md) · ดู [บริการ API และ Query hooks](services.md)

เอกสารนี้อธิบายทุกคอมโพเนนต์และฟังก์ชันที่ประกาศชื่อในส่วนที่ไม่ใช่ API/hooks พร้อม callbacks สำคัญ โดย API และ hooks อธิบายครบใน `services.md` ชื่อที่ไม่ export เป็นรายละเอียดภายในไฟล์ ไม่ควร import ข้ามไฟล์โดยอาศัยเอกสารนี้

## 1. เริ่มแอปและ providers

| ไฟล์ / ชื่อ | Input → Output | การทำงานและผลข้างเคียง |
| --- | --- | --- |
| [src/main.tsx](../../src/main.tsx) | DOM `#root` → React root | import i18n/global CSS แล้ว render `<App />` ภายใน `StrictMode` ไม่มีฟังก์ชัน export |
| [src/app/App.tsx](../../src/app/App.tsx): `App()` | ไม่มี props → JSX | ครอบ `ApplicationRouter` ด้วย `Providers` |
| [src/app/providers.tsx](../../src/app/providers.tsx): `Providers({ children })` | ReactNode → JSX | ครอบ QueryClientProvider, Ant Design ConfigProvider และ Ant Design App; เลือก locale/theme ตาม stores/i18n |
| `Providers` layout effect | mode → DOM | ตั้ง `document.documentElement.dataset.theme` และ `style.colorScheme` ก่อนวาดหน้า |
| `Providers` การตั้ง Day.js locale | ภาษา → locale | เลือก `th` เมื่อภาษาเท่ากับ `th` อื่น ๆ ใช้ `en` |
| [src/app/queryClient.ts](../../src/app/queryClient.ts): `queryClient` | singleton | staleTime 10,000 ms, retry 1, refetchOnWindowFocus true |
| [src/app/router.tsx](../../src/app/router.tsx): `ApplicationRouter()` | ไม่มี props → JSX | render RouterProvider จาก router ที่สร้างระดับโมดูล; เส้นทาง/guards อยู่ในคู่มือภาพรวม |

## 2. Store และสิทธิ์

### `src/shared/stores/authStore.ts`

[เปิดซอร์ส](../../src/shared/stores/authStore.ts)

`AuthPortal = 'user' | 'admin'`; `AuthState` มี `user: User|null`, `token: string|null`, `setSession`, `logout`

| ชื่อ | Input → Output | รายละเอียด |
| --- | --- | --- |
| `legacySession(portal)` | portal → `{ user, token }` หรือ undefined | parse `classroom-auth` อย่างปลอดภัย คืน session เมื่อ user/token มีค่าและ role ตรง portal; ไม่มี window หรือ parse ไม่ได้คืน undefined |
| `createAuthStore(name, legacyPortal?)` | storage name → Zustand hook/store | เริ่ม user/token เป็น null ใช้ persist; merge ข้อมูลคีย์ใหม่ก่อน ถ้าไม่มี persisted state จึงลอง migration |
| `setSession(user, token)` | user/token → void | เขียน state และ persisted storage ของ store นั้น |
| `logout()` | ไม่มี → void | ตั้ง user/token เป็น null; ไม่ clear query cache, draft หรือ legacy key |
| persist `merge(persistedState, currentState)` | states → merged state | รวม state ที่ persist กับ actions ปัจจุบัน หรือใช้ legacySession ตามเงื่อนไข |
| `useUserAuth` | selector → ค่าที่เลือก | store ชื่อ `classroom-user-auth` พร้อม `.getState()` สำหรับ HTTP client |
| `useAdminAuth` | selector → ค่าที่เลือก | store ชื่อ `classroom-admin-auth` |
| `getAuthStore(portal)` | portal → hook/store | เลือกจากตาราง `authStores` |

### `src/shared/stores/themeStore.ts`

[เปิดซอร์ส](../../src/shared/stores/themeStore.ts): `useThemeStore` เก็บ `mode: 'light' | 'dark'` เริ่ม `light` และ persist ที่ `classroom-theme`; `toggle()` สลับค่า mode ไม่แก้ DOM เอง แต่ `Providers` เป็นผู้ตามไปเปลี่ยน theme

### `src/shared/components/permission/PermissionGuard.tsx`

[เปิดซอร์ส](../../src/shared/components/permission/PermissionGuard.tsx): `PermissionGuard({ children, role? })` เลือก admin store เฉพาะ `role === 'ADMIN'` อื่น ๆ ใช้ user store ไม่มี user → redirect login และเก็บ `state.from = pathname + search` พร้อม replace; role ไม่ตรง → `/403`; ผ่าน → children

ไม่ได้ตรวจ ACTIVE/token expiry และไม่ได้เรียก API ตรวจสิทธิ์ ปัจจุบัน role ที่นอกเหนือ ADMIN ไม่ได้มี portal แยก

## 3. Layout และ UI กลาง

### `src/app/layouts/AppLayout.tsx`

[เปิดซอร์ส](../../src/app/layouts/AppLayout.tsx)

`AppLayout({ admin = false })` คืนโครงหน้า sidebar/header/main/footer และ `<Outlet />` เลือก session/menu ตาม admin flag เก็บ `drawer` และ `collapsed` ภายใน component

| Handler/ส่วน | หน้าที่ |
| --- | --- |
| `help()` | เปิด modal จากคำแปล helpFlow/helpDescription/helpContact |
| ปุ่มเปิด/ปิดเมนู | เปลี่ยน drawer หรือ collapsed; ลิงก์ใน sidebar ปิด drawer เมื่อเลือก |
| เลือกเมนู | NavLink แสดง active; breadcrumb หา path ที่เท่ากันหรืออยู่ภายใต้ path นั้น |
| ปุ่มภาษา | สลับ th/en ผ่าน i18n และเขียน `classroom-language` |
| เมนูโปรไฟล์ | navigate `/profile` ทั้ง user/admin; ปัจจุบันหน้านี้ใช้ user session |
| เมนู logout | `await authApi.logout(portal)` แล้ว local logout ใน finally; navigate ไป login เมื่อไม่หลุดด้วย rejection |
| `NotificationBell` | render เฉพาะเมื่อมี user และตั้ง key ด้วย portal+user.id เพื่อ remount state ของ bell |
| ลิงก์สลับพื้นที่ | แสดงเมื่อ user ของ store ปัจจุบันเป็น ADMIN; เปลี่ยน route ไม่คัดลอก session ระหว่าง stores |

### คอมโพเนนต์ที่ใช้ร่วมกัน

| ไฟล์ / ฟังก์ชัน | Props | ผลลัพธ์และพฤติกรรม |
| --- | --- | --- |
| [Common.tsx](../../src/shared/components/common/Common.tsx): `PageHeader` | title, subtitle?, action?, back? | หัวข้อหน้าและ action; back เรียก `navigate(-1)` |
| `DataTable<T>` | `TableProps<T>` | Ant Design Table ค่าเริ่มต้น rowKey=id, scroll.x=850, pageSize=8, showSizeChanger=true และ Empty ตามภาษา; props ที่ส่งมาทับค่า default ได้ |
| `QueryState` | isLoading, error, retry, children | loading แสดง Skeleton ก่อน; error แสดง Alert และปุ่ม retry; สำเร็จแสดง children ไม่สร้าง Empty ให้อัตโนมัติ |
| `Panel` | children, className? | section พร้อม CSS กลางสำหรับกรอบข้อมูล |
| [RoomImage.tsx](../../src/shared/components/common/RoomImage.tsx): `RoomImage` | ImgHTMLAttributes | img พร้อม onError เปลี่ยน src เป็น `/room-placeholder.svg`; handler นี้ทับ onError จาก props |
| [ThemeToggle.tsx](../../src/shared/components/common/ThemeToggle.tsx): `ThemeToggle` | className? | ปุ่มและ tooltip ตาม mode; คลิก `toggle()` พร้อม aria-label/aria-pressed |
| [StatusTags.tsx](../../src/shared/components/data-display/StatusTags.tsx): `BookingStatusTag` | status | Tag จาก `bookingColors` และ `getBookingLabels(t)` |
| `RoomStatusTag` | status, busy=false | ACTIVE+busy เป็นส้ม, ACTIVE ไม่ busy เป็นเขียว, maintenance เป็นทอง, inactive สี default พร้อมข้อความตามภาษา |
| [ErrorPage.tsx](../../src/shared/pages/ErrorPage.tsx): `ErrorPage` | code='404' | Result สำหรับ 403/404/500 พร้อมปุ่มกลับ `/rooms` |

## 4. Authentication — `src/features/auth/pages/AuthPage.tsx`

[เปิดซอร์ส](../../src/features/auth/pages/AuthPage.tsx)

| ฟังก์ชัน | Input → Output | รายละเอียด |
| --- | --- | --- |
| `createLoginSchema(t)` | Translate → Zod schema | username/password ไม่ว่าง และ remember เป็น boolean; login ไม่กำหนดขั้นต่ำ 8 ตัว |
| `createRegisterSchema(t)` | Translate → Zod schema | ชื่อ/นามสกุล trim ไม่ว่าง, id อย่างน้อย 3 ตัว, email ถูกต้อง, phone เริ่ม 0 และรวม 9–10 หลัก, password อย่างน้อย 8, confirmPassword ตรงกัน |
| `getRememberedUsername(portal)` | portal → string | อ่าน key ที่ต่อ `:user`/`:admin` จาก `classroom-remembered-username`; ถ้า storage ใช้ไม่ได้คืนว่าง |
| `saveRememberedUsername(portal, username, remember)` | ค่า → void | เก็บชื่อเมื่อเลือก remember มิฉะนั้นลบ; catch storage error เพื่อไม่ขวาง login |
| `AuthVisualPanel()` | ไม่มี → JSX | ภาพ `/auth-learning-collage.png` กับข้อความแปลประกอบหน้า auth |
| `LoginPage({ portal = 'user' })` | portal → JSX | RHF+Zod, remembered username, mutation authApi.login, เลือก store ตาม portal |
| `RegisterPage()` | ไม่มี → JSX | RHF+Zod, map field id เป็น userCode ส่ง authApi.register และไป `/login` เมื่อสำเร็จ |

`LoginValues` มี username/password; `LoginFormValues` เพิ่ม remember; `RegisterValues` มีชื่อ/นามสกุล/id/email/phone/password/confirmPassword ฟิลด์ confirm ใช้เฉพาะ validation ไม่ส่ง API

Login onSuccess ตรวจ `(user.role === 'ADMIN') === isAdminPortal` ก่อนเขียน session หากผิดเปิด modal และไม่เข้า portal นี้ จากนั้นบันทึก username/session แล้วเลือกปลายทาง: admin รับ from ที่ขึ้นต้น `/admin/`; user รับ path ภายในที่ขึ้นต้น `/` แต่ไม่ `//` และไม่ `/admin/`; ค่า default คือ `/admin/dashboard` หรือ `/rooms`

ปุ่มลืมรหัสผ่านเปิดคำแนะนำติดต่อแอดมิน ไม่มีการส่งอีเมล ส่วน remember ไม่ได้ควบคุมอายุ session ซึ่ง store persist ไว้ต่างหาก

## 5. ห้องเรียน — `src/features/rooms`

### `RoomListPage.tsx`

[เปิดซอร์ส](../../src/features/rooms/pages/RoomListPage.tsx): `RoomListPage()` ไม่มี props คืนหน้าค้นหาห้อง

- โหลด `useClassrooms({ limit: 100 })` แล้วเรียก availability ของ ID ที่โหลดมา สำหรับช่วงต้นชั่วโมงปัจจุบันถึงอีก 1 ชั่วโมง
- สร้าง `busyIds` จากห้องที่ available=false; ตัวกรอง BUSY เป็นค่าภายใน UI
- กรองชื่อ/code แบบไม่สนตัวพิมพ์, อาคาร, จำนวนที่นั่งขั้นต่ำ, สถานะ, ชั้น, อุปกรณ์ และประเภทห้องใน browser; category เทียบค่าภาษาไทยที่อยู่ในข้อมูล
- sort capacity จากมากไปน้อย หรือ code แบบ localeCompare; แบ่งหน้า 6 ห้องและ clamp currentPage ให้ไม่เกินผลลัพธ์
- `reset()` ล้าง search/building/capacity/status/floor/equipment/category และ page=1 แต่ไม่ reset sort/view/more
- เปลี่ยนตัวกรองส่วนใหญ่ตั้ง page=1; สลับ grid/list เปลี่ยนแค่ class ไม่โหลด endpoint ใหม่
- QueryState รวม error/loading ของห้องและ availability; retry โหลดทั้งสองชุด สถิติพร้อมใช้งานนับ room.status ACTIVE ไม่ได้หัก busy

### `RoomCard.tsx`

[เปิดซอร์ส](../../src/features/rooms/components/RoomCard.tsx): `RoomCard({ room, busy? })` คืนการ์ดพร้อม RoomImage, RoomStatusTag, ข้อมูลห้อง และอุปกรณ์ 3 ตัวแรก ส่วนที่เหลืออยู่ tooltip ปุ่มรายละเอียดไป `/rooms/{id}`, ตารางไป `/room-schedule?room={id}`, จองไป `/booking?room={id}` โดยปิดปุ่มจองเมื่อสถานะไม่ใช่ ACTIVE แต่ไม่ได้ปิดจาก busy อย่างเดียว

### `RoomDetailPage.tsx`

[เปิดซอร์ส](../../src/features/rooms/pages/RoomDetailPage.tsx): `RoomDetailPage()` อ่าน roomId จาก route → `useClassroom` → แสดงภาพ รายละเอียด อุปกรณ์ และลิงก์ตาราง/จอง หากไม่มี room หลังผ่าน QueryState แสดง Result 404; ข้อผิดพลาด API แสดง QueryState ก่อน ข้อความเวลาเปิดจองในหน้านี้ยังมาจากคำแปลคงที่

## 6. ตารางใช้ห้อง — `src/features/booking/pages/RoomSchedulePage.tsx`

[เปิดซอร์ส](../../src/features/booking/pages/RoomSchedulePage.tsx)

| ชื่อ | Input → Output | หน้าที่ |
| --- | --- | --- |
| `getScheduleRange(date, view)` | Dayjs และ `day/week/month` → `{ start, end }` | ใช้ startOf/endOf หน่วยนั้น; day ใช้ต้น/ท้ายวัน |
| `RoomSchedulePage()` | query room → JSX | โหลดห้องสูงสุด 100 เลือก room จาก query หรือห้องแรก เก็บ date/view/checkingSlot ใน state |
| `selectSlot(start, end)` | เวลา HH:mm → Promise<void> | ตั้ง loading slot, เรียก availability ด้วยวันที่เลือกและ ISO timestamps; ถ้าไม่ว่างแจ้ง error+refetch ถ้าว่าง navigate booking พร้อม room/date/start/end; catch แจ้งข้อความ และ finally ล้าง loading |

สร้าง visibleDays ตาม range, เดือนเติมช่องว่างก่อนวันที่ 1 ตาม weekday; ส่ง API endAt เป็นต้นวันถัดจากท้าย range เพื่อครอบคลุมช่วงที่เลือก ใช้ `useClassroomSchedule` เฉพาะห้องเดียว

รายวันสร้าง 12 ช่วงคงที่ 08–20 น. ใช้ `overlaps` หา booking แรกที่ทับช่วง; ถ้ามี booking จะแสดงสถานะก่อนตรวจ past/room inactive ถ้าไม่มีจึงแสดงไม่พร้อม/พ้นเวลา/ปุ่มจอง รายสัปดาห์และเดือนแสดง bookings ตามวันที่เริ่มและวันสำคัญ คลิกวันเปลี่ยนเป็นรายวัน

วันเริ่มสัปดาห์มาจาก locale ของ Day.js แต่หัวตารางเรียงอาทิตย์ถึงเสาร์คงที่ ต้องตรวจการจัดแนวเมื่อปรับภาษา/locale และข้อมูลตารางถูกรับจาก adapter ที่ยุบ IN_USE แล้ว

## 7. ฟอร์มจอง — `src/features/booking/pages/BookingPage.tsx`

[เปิดซอร์ส](../../src/features/booking/pages/BookingPage.tsx)

`BOOKING_TIME_STEP = 30`; `BookableTimeRange` มี `earliest/close` เป็นจำนวนนาทีจากต้นวัน

| ฟังก์ชัน | Input → Output | กฎ |
| --- | --- | --- |
| `timeToMinutes(time)` | HH:mm → number | แยกชั่วโมง/นาทีแล้วรวม ไม่ validate รูปแบบด้วยตัวเอง |
| `minutesToTime(minutes)` | number → HH:mm | padStart สองหลัก; ไม่ clamp ให้เป็น 00–23 เอง |
| `nextHalfHour(now)` | Dayjs → นาที | `ceil((ชั่วโมง*60 + นาที + 1)/30)*30`; ที่เวลาเต็มรอบก็เลือกครึ่งชั่วโมงถัดไป |
| `getBookableTimeRange(date, openTime, closeTime, now=dayjs())` | ค่าเวลา → range | ถ้าเป็นวันนี้ earliest=max(open,nextHalfHour), วันอื่น earliest=open; close จาก closeTime |
| `getDefaultBookingWindow(openTime, closeTime)` | เวลาเปิด/ปิด → date/start/end | ถ้าวันนี้เหลืออย่างน้อย 30 นาทีใช้วันนี้ มิฉะนั้นพรุ่งนี้; end=start+60 แต่ไม่เกิน close |
| `disabledBookingTimes(range, field, selectedStart)` | range และ start/end → callbacks | สร้าง slots ทีละ 30 นาที; start ล่าสุด close−30; end ต้องหลัง start อย่างน้อย 30 นาที |
| `disabledHours()` ภายในผลลัพธ์ | ไม่มี → number[] | ชั่วโมงที่ไม่มี slot ให้เลือก |
| `disabledMinutes(hour)` ภายในผลลัพธ์ | ชั่วโมง → number[] | นาทีที่ไม่อยู่ใน slots |
| `BookingPage()` | query/state → JSX | RHF+Zod โหลดห้องและ rules แสดงฟอร์มและ preview |

ค่าเริ่มต้นให้ `location.state.draft` มาก่อน มิฉะนั้นใช้ query room/date/start/end แล้วเติม defaultWindow; attendees=1, purpose/note ว่าง และ equipment=[]

| ส่วนภายใน | การทำงาน |
| --- | --- |
| useWatch | อ่าน roomId/date/start/end เพื่อคำนวณ preview และเวลาที่เลือกได้ |
| effect ปรับเวลา | เมื่อวัน/เวลา/rules เปลี่ยน ถ้า start ใช้ไม่ได้เลื่อนไป earliest และ end ไม่เกิน close; ถ้า end ใช้ไม่ได้ปรับตาม start |
| เปลี่ยนห้อง | เปลี่ยน roomId แล้วล้าง equipment |
| DatePicker onChange/disabledDate | ปรับเวลาให้ตรงวันใหม่ ไม่ให้เลือกวันอดีตหรือวันนี้ที่หมดรอบ; ยังไม่จำกัด max advance days |
| TimePicker onChange/disabledTime | รูปแบบ HH:mm, minuteStep=30, เลือกแล้วไม่ต้องกดยืนยันใน popup; เปลี่ยน start แล้วปรับ end หากจำเป็น |
| `check` mutation | `useAction` เรียก availabilityForRoom ด้วย +07:00; available=false throw ข้อความแปล |
| `submit` จาก handleSubmit | ล้าง error, await check, เก็บ `booking-draft`, navigate confirm; catch แสดงข้อความในหน้า |

`check` เป็นการตรวจ availability เท่านั้น ไม่มีการสร้าง booking; QueryState ใช้ query ห้องเป็นหลัก ไม่รวม rules query error; rules มี fallback 08–20 และข้อความล่วงหน้า 90 วัน แต่ UI ไม่ได้บังคับทุกกฎที่ backend ส่งมา

## 8. Schema, หน้ายืนยัน และสรุป

### `src/shared/schemas/bookingSchema.ts`

[เปิดซอร์ส](../../src/shared/schemas/bookingSchema.ts)

- `createBookingSchema(t)` คืน Zod object: roomId/date/start/end ไม่ว่าง, attendees integer ≥1, purpose trim ≥5, equipment string[], note string, editingId optional
- `bookingSchema` เป็น instance ที่ใช้ตัวแปลคืน key เดิม สำหรับ parse draft ไม่ใช่ข้อความ validation ตามภาษาปัจจุบัน
- Schema นี้ไม่ตรวจรูปแบบวัน/เวลา, start<end, ความจุห้อง, ระยะเวลาจอง และการทับซ้อนครบทุกเงื่อนไข ต้องไม่ใช้แทน backend validation

### `src/features/booking/pages/BookingConfirmPage.tsx`

[เปิดซอร์ส](../../src/features/booking/pages/BookingConfirmPage.tsx)

`getDraft()` อ่าน JSON จาก sessionStorage `booking-draft` แล้ว `bookingSchema.parse`; catch ทุกกรณีคืน null

`BookingConfirmPage()` อ่าน draft ครั้งแรกด้วย lazy state, โหลด room ผ่าน useClassroom และสร้าง mutation: มี editingId → bookingsApi.update มิฉะนั้น create ไม่มี draft → Navigate `/booking`; โหลดสำเร็จแสดง BookingSummary และปุ่มยืนยัน

ปุ่มย้อนกลับส่ง draft ผ่าน route state ไป BookingPage; ระหว่าง pending ปิดปุ่มย้อนกลับและแสดง loading เมื่อ API สำเร็จตั้ง created, ลบ sessionStorage draft แล้วแสดง Result + reference ID/status + summary ลิงก์ประวัติ/รายการห้อง เมื่อผิดพลาดเก็บ draft และแสดง error หน้ายืนยันไม่ได้เรียก availability แยกอีกรอบก่อน POST/PATCH จึงพึ่ง backend ตรวจตอนบันทึก

### `src/features/booking/components/BookingSummary.tsx`

[เปิดซอร์ส](../../src/features/booking/components/BookingSummary.tsx): `BookingSummary({ draft, room? })` แสดง Descriptions ห้อง วันที่ เวลา จำนวนคน วัตถุประสงค์ อุปกรณ์ และหมายเหตุ ใช้วันที่ตาม Day.js และข้อความตามภาษา แต่ชื่ออุปกรณ์ join จากค่าจริงโดยไม่ได้เรียก getEquipmentLabel

## 9. ประวัติการจอง — `src/features/booking-history/pages/BookingHistoryPage.tsx`

[เปิดซอร์ส](../../src/features/booking-history/pages/BookingHistoryPage.tsx)

`BookingHistoryPage()` ใช้ `useMyBookings` โหลดสูงสุด 100 รายการ กรอง status/roomId/date range และเรียง createdAt ใหม่ก่อน การเลือกห้องใน filter สร้างจากรายการ booking ที่มี room แนบมา ยังไม่ได้ deduplicate

| Handler/การกระทำ | การทำงาน |
| --- | --- |
| เลือกรายละเอียด | ใช้ selectedLocal ก่อน ถ้าไม่มีค้น `params.booking` ใน items ที่โหลดมา; `useBooking(selected.id)` โหลดรายละเอียดใหม่และแสดง fallback จากรายการ |
| `closeDetails()` | ล้าง selectedLocal และลบเฉพาะ query booking โดย replace URL คง params อื่นไว้ |
| แก้ไข | แสดงเมื่อ canChangeBooking และ status PENDING; navigate booking พร้อม state.draft และ editingId |
| `cancel` mutation | modal.confirm → bookingsApi.cancel(id) → useAction invalidation; ไม่ส่งเหตุผลจาก UI นี้ |
| `checkIn` mutation | แสดงปุ่มเมื่อ status APPROVED → bookingsApi.checkIn(id); backend ตรวจช่วงเวลาเอง |
| รายละเอียด | BookingStatusTag + BookingSummary + reason จาก API ล่าสุดหรือรายการเดิม |

ถ้า ID ใน notification ไม่อยู่ใน 100 รายการที่โหลดมา จะยังไม่เลือก/โหลดรายละเอียดจาก ID นั้นโดยตรง

## 10. โปรไฟล์ — `src/features/profile/pages/ProfilePage.tsx`

[เปิดซอร์ส](../../src/features/profile/pages/ProfilePage.tsx)

- `ProfilePage()` โหลด `useMyProfile` และแสดง ProfileForm ภายใต้ QueryState
- `ProfileForm({ profile })` ใช้ Ant Design Form แก้ firstName/lastName/email/phone ผ่าน `update` mutation (`usersApi.updateMe`) เมื่อสำเร็จเรียก `setSession(updated, token)` หากมี token เพื่ออัปเดตชื่อบน header
- `password` mutation ส่ง currentPassword/newPassword ไป usersApi.changePassword ไม่ส่ง confirmPassword; ฟอร์มตรวจ required และรหัสใหม่อย่างน้อย 8 ตัว
- `validator(_, value)` ภายในกฎ confirmPassword คืน Promise.resolve ถ้าว่างหรือเท่ากับ newPassword; มิฉะนั้น Promise.reject ส่วน required แยกตรวจค่าว่างอีกกฎ
- `ProfileValues` เป็นข้อมูลชื่อ/นามสกุล/email/phone; `PasswordValues` มี current/new/confirm password
- กล่องข้อมูลบัญชีใช้ name/email/role/userCode/registeredAt แต่ข้อความสถานะ active ปัจจุบันเป็นค่าคงที่ ไม่ได้ map status ทั้งหมด และฟอร์มรหัสผ่านยังไม่ reset หลังสำเร็จ

## 11. การแจ้งเตือน — `src/features/notifications/components/NotificationBell.tsx`

[เปิดซอร์ส](../../src/features/notifications/components/NotificationBell.tsx)

| ฟังก์ชัน/ส่วน | การทำงาน |
| --- | --- |
| `NotificationBell({ user, portal })` | โหลดรายการ limit=100 และ unread count แม้ Drawer ยังไม่เปิด; local state open/filter |
| `read` mutation | ส่ง id → markRead; undefined → markAllRead; useAction จัดการแจ้ง error/invalidation |
| `notificationIcon(item)` | เลือก icon APPROVED/REJECTED/CANCELLED/REMINDER หรือ Bell สำรอง |
| `openBooking(item)` | markRead ก่อน เมื่อสำเร็จปิด drawer และไป admin/bookings หรือ booking-history ตาม user.role พร้อม booking query; ถ้าไม่มี bookingId ปิด drawerอย่างเดียว |
| กรอง unread | กรอง `!readAt` จากรายการที่โหลดมาใน browser ไม่ได้ส่ง isRead ตามปุ่ม filter |
| อ่านทั้งหมด | disabled เมื่อ unread=0 และใช้ pending ของ read mutation |

ชนิด kind ใช้เลือก CSS, วันที่แจ้งเตือนแสดงด้วย Day.js ไม่มี polling เฉพาะ bell และยังไม่ใช้ WebSocket/SSE

## 12. แดชบอร์ดและกราฟ

### `src/features/admin/pages/DashboardPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/DashboardPage.tsx): `DashboardPage()` เรียก useAdminDashboard, useAdminReportSummary, useAdminRecentBookings, useAdminBookings ช่วงย้อนหลัง 6 วันถึงวันนี้ limit=100 และ useAdminClassrooms limit=100 รวม loading/error ทั้ง 5 query และ retry ทุกชุด

ตัวเลขการ์ดมาจาก summary, ตารางจาก recent, Analytics ได้ trend/status จาก report summary แต่กราฟการใช้ห้องนับจาก chartBookings+chartRooms ช่วง 7 วัน จึงไม่ควรสมมติว่าทุกกราฟใช้ชุดข้อมูลเดียวกัน

### `src/features/admin/components/Analytics.tsx`

[เปิดซอร์ส](../../src/features/admin/components/Analytics.tsx)

| ฟังก์ชัน/ตัวเลือก | Input → Output/หน้าที่ |
| --- | --- |
| `getTimeline(bookings, start, end, granularity, trendData?)` | คืน `{ label, value }[]`; สร้าง bucket day/week/month ทุกช่วงให้ค่าเริ่ม 0; ใช้ trendData ถ้ามี มิฉะนั้นนับ bookings; นับเฉพาะ bucket ที่อยู่ใน range |
| `Analytics({ bookings, rooms, start, end, report=false, trendData?, statusData? })` | JSX กราฟด้วย ECharts; local granularity เริ่ม day; memo timeline |
| `top` | นับจำนวน booking ต่อ roomId จาก rows ที่ได้รับ เรียงมากไปน้อยสูงสุด 10 ห้อง |
| `base` | ตัวเลือกสี ฟอนต์ tooltip/grid ตาม theme token |
| `trend` | line+area จาก timeline |
| `donut` | pie แบบวงแหวนจาก booking labels; ใช้ statusData ของสถานะนั้นถ้ามี มิฉะนั้นนับ bookings |
| `bar` | กราฟแท่งแนวตั้งจาก top |
| `horizontal` | กราฟแท่งแนวนอนจาก top; แสดงเฉพาะ report=true |

ลงทะเบียน LineChart/BarChart/PieChart, Grid/Tooltip/Legend และ CanvasRenderer ระดับโมดูล กราฟเปลี่ยนสีตาม useThemeStore และ Ant Design theme ไม่สร้างข้อมูล server เอง

## 13. จัดการห้อง — `src/features/admin/pages/AdminRoomsPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/AdminRoomsPage.tsx)

`AdminRoomsPage()` เก็บ search, editing, detailId, statusRoom ใช้ useDeferredValue ของ search สำหรับ query (ไม่ใช่ debounce แบบกำหนดเวลา) โหลดรายการ limit=100 และรายละเอียดเฉพาะมี ID

| Component/handler | พฤติกรรม |
| --- | --- |
| `emptyRoom` | ค่าฟอร์มสร้างห้อง id ว่าง, ACTIVE, ชั้น 1, 30 คน, placeholder และ category ห้องเรียน |
| `roomStatusOptions` | map ACTIVE/INACTIVE/MAINTENANCE เป็น translation key |
| เปิด editor | เพิ่มใช้ emptyRoom; แก้ไขใช้ row ปัจจุบัน เมื่อปิดล้าง editing ทำให้ form unmount |
| `status` mutation | adminApi.setClassroomStatus ตามค่าที่เลือกใน modal |
| `remove` mutation | confirm แล้ว adminApi.deactivateClassroom; ชื่อ UI คือปิดใช้งาน |
| รายละเอียด | useAdminClassroom แสดง code/name และจำนวน bookings |
| `RoomEditor({ room, onClose })` | Ant Design Form มีฟิลด์ห้อง ภาพ และอุปกรณ์; `save` เลือก create/update ตาม room.id และปิดเมื่อสำเร็จ |
| `beforeUpload(file)` | ตรวจ MIME 4 แบบและขนาด ≤5×1024×1024; ผิดคืน Upload.LIST_IGNORE; ผ่านเริ่ม uploadImage ทันทีแล้ว set form.image, แจ้งผล, finally ล้าง uploading; คืน false เพื่อหยุด auto upload ของ Ant Design |
| `removeImage` mutation | ลบด้วย key จาก uploadedImageKey แล้ว set form.image เป็น placeholder |

`Form.useWatch('image')` ทำ preview และตัดสินว่าควรมีปุ่มลบ กด cancel modal ไม่ rollback image upload/delete ที่สำเร็จแล้ว และการบันทึกห้องยังไม่ได้รวมเป็นธุรกรรมกับการจัดการไฟล์

## 14. จัดการผู้ใช้ — `src/features/admin/pages/AdminUsersPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/AdminUsersPage.tsx)

| ชื่อ/ส่วน | พฤติกรรม |
| --- | --- |
| `roles`, `statuses`, `statusLabelKeys` | ค่าบทบาท 5 แบบ สถานะ 3 แบบ และ key คำแปล |
| `UserValues` | AdminUserInput และ password optional สำหรับ form |
| `AdminUsersPage()` | search แบบ deferred, รายการ limit=100, detail/reset modals |
| `editing` | undefined=ปิด editor, null=สร้างใหม่, AdminUser=แก้ไข |
| `status` mutation | ถ้า ACTIVE เปลี่ยน SUSPENDED; สถานะอื่นเปลี่ยน ACTIVE |
| `remove` mutation | modal ยืนยัน → adminApi.deactivateUser |
| `reset` mutation | ส่ง id/password ไป resetUserPassword; ปุ่มปิดจนรหัสใหม่มีอย่างน้อย 8 ตัว |
| `UserEditor({ user?, onClose })` | ฟอร์มสร้าง/แก้ผู้ใช้ด้วย Ant Design; create ต้องมี password ขั้นต่ำ 8; ชื่อ/นามสกุล/email required และ phone มี regex หากกรอก |
| `save` mutation ภายใน editor | ประกอบ name จาก first/last; create ใช้คำขอเดียว; update ข้อมูลทั่วไปก่อน จากนั้น setUserRole/setUserStatus เมื่อเปลี่ยน |

การ update เป็นหลาย request ต่อกันและไม่มี rollback หากแก้ทั่วไปสำเร็จแต่ role/status ล้มเหลว ข้อมูลก่อนหน้านั้นอาจถูกบันทึกแล้ว และ useAction จะยังไม่ invalidate แบบ onSuccess จน action ทั้งชุดสำเร็จ

## 15. จัดการการจอง — `src/features/admin/pages/AdminBookingsPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/AdminBookingsPage.tsx): `AdminBookingsPage()` เก็บตัวกรอง search/status/room/range, detailId และ noteAction/note โหลดห้อง limit=100 และรายการจอง limit=100 พร้อม live polling

`change` mutation รับ `{ id, action, note? }` แล้ว switch ไป approve/reject/cancel/start/complete/noShow ของ adminApi; `confirm(booking, action)` เปิด modal สำหรับ approve/start/complete และคืน Promise จาก `change.mutateAsync` ใน onOk

| สถานะ frontend | ปุ่มนอกเหนือจากดูรายละเอียด |
| --- | --- |
| PENDING | อนุมัติ, ปฏิเสธ, ยกเลิก |
| APPROVED | เริ่มใช้งาน, ไม่เข้าใช้งาน, ยกเลิก |
| IN_USE | เสร็จสิ้น |
| REJECTED/CANCELLED/COMPLETED/NO_SHOW | ไม่มี action เปลี่ยนสถานะจากหน้านี้ |

`NoteAction = reject/cancel/no-show`; modal ต้องมี note.trim ก่อนกดได้ทุก action เหล่านี้ แม้ API noShow ยอมรับเหตุผล optional; onSuccess ปิด modal รายละเอียดโหลด booking/history และแสดง Timeline ของ action/user/createdAt โดยเวลาใช้ slice ไม่ได้จัด timezone แบบ AuditLogsPage หน้านี้ยังไม่อ่าน `?booking=` จาก notifications

## 16. รายงานและ Audit logs

### `src/features/admin/pages/ReportsPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/ReportsPage.tsx)

- `ReportsPage()` เริ่ม range วันนี้−14 ถึงวันนี้+7 วัน เก็บ room/status/search/building/floor/category/userRole และส่ง ReportFilters เข้า useAdminReports
- โหลดห้อง limit=100 เพื่อสร้างตัวเลือกห้อง/อาคาร/ชั้น/ประเภท; search ปัจจุบันไม่ได้ใช้ useDeferredValue หรือ debounce
- `uniqueValues(values)` คืน string[] ที่ deduplicate ด้วย Set แล้ว sort เพื่อเป็นตัวเลือก
- `download()` await adminApi.exportBookings → URL.createObjectURL → สร้าง `<a>` กำหนดชื่อ `booking-report-{start}-to-{end}.csv` → click → URL.revokeObjectURL; ไม่มี catch หรือ loading state ของตัวเอง
- แสดง summary users/classrooms แบบไม่กรอง, booking total/byStatus แบบกรอง และห้องยอดนิยมจาก classrooms[0]; Analytics ใช้ rows ที่ได้รับ ไม่มี trend/statusData จาก summary ส่วนตารางใช้ aggregates จาก endpoint classrooms/users
- QueryState รวม query รายงานและ rooms; ตารางสรุปยังใช้ DataTable default rowKey=id ทั้งที่แต่ละ row ไม่มี id ใน type

### `src/features/admin/pages/AuditLogsPage.tsx`

[เปิดซอร์ส](../../src/features/admin/pages/AuditLogsPage.tsx): `AuditLogsPage()` กรอง action/entity แบบ deferred ส่ง useAuditLogs limit=100; dateFormatter สร้างด้วย useMemo ใช้ Intl.DateTimeFormat ภาษา th-TH หรือ en-GB, timezone Asia/Bangkok, วัน/เดือน/ปี/ชั่วโมง/นาทีแบบ 24 ชั่วโมง แสดง user.name หรือข้อความระบบ พร้อม action/entity/entityId

## 17. Utility และข้อมูลตั้งค่า

### `src/shared/utils/bookingRules.ts`

[เปิดซอร์ส](../../src/shared/utils/bookingRules.ts)

| ฟังก์ชัน | Input → Output | กฎ/ผู้ใช้ |
| --- | --- | --- |
| `overlaps(start, end, existingStart, existingEnd)` | เวลา strings → boolean | `start < existingEnd && end > existingStart`; ช่วงติดกันไม่ทับ ใช้ในตารางรายวัน; ต้องส่ง HH:mm ที่ pad แล้ว |
| `canChangeBooking(booking)` | Booking → boolean | สถานะ PENDING/APPROVED และเวลาเริ่มหลังปัจจุบัน; ใช้แสดงปุ่ม history ไม่ตรวจ ownership/เหตุผล/cutoff |

### การตั้งค่าและคำแปล

| ไฟล์ / ชื่อ | หน้าที่และวิธีต่อยอด |
| --- | --- |
| [themeConfig.ts](../../src/shared/config/themeConfig.ts): `colors` | palette ที่กราฟและ theme ใช้ร่วมกัน |
| `appTheme` | Ant Design tokens และ component overrides ของโหมดสว่าง |
| `getAppTheme(mode)` | คืน light config ด้วย defaultAlgorithm หรือ darkAlgorithm พร้อมแก้ tokens/สี Table/Select ของโหมดมืด |
| [userMenuConfig.ts](../../src/app/config/userMenuConfig.ts): `MenuItem`, `userMenuConfig` | type มี key/path/icon/permission?; รายการเมนูผู้ใช้ โดย permission ยังไม่ถูก layout ใช้ตรวจ |
| [adminMenuConfig.ts](../../src/app/config/adminMenuConfig.ts): `adminMenuConfig` | 6 เมนูแอดมิน; เพิ่มหน้าต้องเพิ่ม route ด้วย |
| [fieldLabels.ts](../../src/shared/config/fieldLabels.ts): `fieldLabels` | map ชื่อฟิลด์เป็นไทยแบบเดิม; ยังไม่มีผู้นำไปใช้ในหน้าปัจจุบัน |
| [bookingStatus.ts](../../src/shared/constants/bookingStatus.ts): `bookingLabelKeys`, `bookingColors` | map status เป็น translation key/สี Tag |
| `getBookingLabels(t)` | คืน Record ของทุก BookingStatus เป็นข้อความตามภาษา |
| `equipmentOptions`, `equipmentLabelKeys` | รายการค่าอุปกรณ์และ key คำแปล |
| `getEquipmentLabel(t, equipment)` | แปลจาก key ที่จับคู่ไว้ ถ้าไม่มีใช้ equipment เป็น key |
| [thaiImportantDays.ts](../../src/shared/constants/thaiImportantDays.ts): `fixedDays`, `yearSpecificDays` | วันคงที่ MM-DD และวันเฉพาะปี YYYY-MM-DD; ปัจจุบันรายการเฉพาะปี 2026 |
| `getThaiImportantDays(dateKey)` | รวมรายการ fixed/year ของวันนั้น คืน `{ labelKey }[]`; ใช้แสดงป้าย ไม่ได้ปิดการจองวันหยุด |
| [i18n/index.ts](../../src/shared/i18n/index.ts): `i18n` | initReactI18next ด้วยภาษาใน storage หรือ th, fallback th, interpolation ไม่ escape HTML; เก็บ resources th/en; languageChanged เปลี่ยน locale Day.js |

`src/shared/types/index.ts` เป็น type declarations ไม่มี runtime functions รายการ type อยู่ในคู่มือภาพรวม ส่วน `src/shared/api/types.ts` อธิบายใน services

### CSS และไฟล์ภาพ

`src/shared/styles/global.css` ตั้ง Sarabun/Manrope, สีและ surface tokens ของ light/dark, focus styles และ reduced-motion; แต่ละฟีเจอร์ใช้ CSS Module ในโฟลเดอร์ `styles/` ของฟีเจอร์นั้น โครงหน้าใช้ `AppLayout.module.css` ส่วนกลางใช้ `Common.module.css` การเปลี่ยน theme ต้องดูทั้ง CSS tokens และ Ant Design theme รวมกราฟ

`Auth.module.css` กำหนดหน้า auth แบ่งภาพ/ฟอร์มบน desktop และซ่อนภาพบนจอแคบ; `Rooms.module.css` จัด catalog/cards, `Booking.module.css` จัดฟอร์ม/ตาราง/steps, `Admin.module.css` จัด metrics/charts/editors, `Profile.module.css` จัดโปรไฟล์, `Notifications.module.css` จัด drawer/animation โดยเคารพ reduced-motion จาก CSS ส่วนกลาง

`public/favicon.svg`, `public/auth-learning-collage.png`, `public/room-placeholder.svg` เป็น assets ไม่มีฟังก์ชัน กรณีภาพห้องใช้ URL จาก API แล้ว fallback ด้วย RoomImage

## 18. ชุดทดสอบและขอบเขตความเชื่อมั่น

ดู [คู่มือ Vitest และรายการไฟล์ทดสอบทั้งหมด](testing.md) สำหรับคำสั่ง การตั้งค่า ตัวช่วย และขอบเขตที่ทดสอบ

Tests ครอบคลุม API ทุก service, Axios token/error handling, QueryClient cache/invalidation, session/theme persistence, schema การจอง, ช่วงเวลาทับซ้อน และ calendar lookup ใช้ HTTP adapter stub เฉพาะ test และปิดการเรียก backend ที่ไม่ได้กำหนด stub ตัวช่วย `tests/helpers/` ไม่ถูกนำเข้าในแอป

Hook tests เรียกผ่าน React server render กับ QueryClient จริงโดยไม่เพิ่ม DOM dependency จึงไม่ครอบคลุมการคลิก การ mount/unmount, polling timer หรือรูปหน้าจอ การผ่าน tests ไม่ยืนยัน backend integration จริงหรือสิทธิ์บน server

## 19. ส่วนที่ถอดออก

ถอด `src/mocks/` ทั้งโฟลเดอร์, mock service และ tests ของมัน, service แจ้งเตือนจำลอง, `useDatabase`, storage listener และ invalidation ของฐานข้อมูลจำลอง, type Database, password ใน User, ป้ายสถานะไทยคงที่ที่มีแต่ mock ใช้ และ `availabilityError` ที่ไม่มีผู้เรียกจริงแล้ว

ยังคง `overlaps` และ `canChangeBooking` เพราะมีหน้าจอจริงเรียกใช้ การตรวจความจุ วันเวลา กฎจำกัดการจอง และการจองพร้อมกันเป็นหน้าที่ API และ validation ของฟอร์มตาม flow ปัจจุบัน ไม่มี Web Lock หรือฐานข้อมูลจำลองใน frontend อีกต่อไป

Token ถูกส่งผ่าน Axios ตามปกติเมื่อมีค่า และ auth adapter ใช้ ID จริง ข้อมูล session ที่ persist จากรุ่นเก่าอาจยังมี ID รูปแบบเดิม ควรออกจากระบบแล้วเข้าสู่ระบบใหม่เพื่อรับข้อมูลบัญชีล่าสุด แอปไม่ล้างข้อมูลบัญชีที่เก็บอยู่ในเบราว์เซอร์ให้อัตโนมัติ

## 20. ค้นหาและรักษาเอกสารให้ตรงโค้ด

```sh
# หาประกาศฟังก์ชันและ service หลัก
rg -n 'export function|function |export const' src
# หาจุดที่เรียก API และ hooks
rg -n 'Api\.|useAction|useQuery|useMutation' src
# ตรวจจุดที่ใช้ browser storage
rg -n 'localStorage|sessionStorage' src
```

เมื่อเพิ่มฟังก์ชันหรือเปลี่ยนเมธอด ให้ปรับหัวข้อไฟล์ที่เกี่ยวข้อง รวม input/output, ผลข้างเคียง, query key/endpoint และข้อจำกัดที่ได้รับผล อย่าอัปเดตเฉพาะชื่อฟังก์ชันจนคำอธิบาย flow เก่าค้างอยู่
