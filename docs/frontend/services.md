# บริการ API และ Query hooks ของ frontend

กลับไป [คู่มือส่งต่องาน](overview.md) · [โครงสร้างโฟลเดอร์](structure.md) · ดู [ฟังก์ชันและหน้าจอ](functions.md)

ขอบเขต: อธิบายทุกเมธอดของ service/API ที่ประกาศใน frontend รวมฟังก์ชันแปลงข้อมูลและ hooks อ้างอิงซอร์สที่ตรวจเมื่อ 26 ตุลาคม 2569 ไม่ใช่เอกสารรับรอง contract จาก backend

## วิธีอ่านตาราง API

- Path ทุกตัวต่อจาก `VITE_API_BASE_URL` ซึ่งค่าเริ่มต้นลงท้าย `/api`
- `{id}` และ `{key}` ใน path ถูกส่งผ่าน `encodeURIComponent` ก่อนประกอบ URL
- ทุกเมธอด API เป็น async; คอลัมน์ผลลัพธ์หมายถึงค่าที่ resolve แล้ว ไม่ใช่ Axios response
- คำตอบปกติเป็น `ApiResponse<T> = { success: boolean; data: T; message?: string }`
- ทุกไฟล์ API ยกเว้น `axiosClient.ts` และ `types.ts` มี `dataOrThrow<T>(response)` ของตนเอง: `success: false` → throw `Error(message)` หรือข้อความสำรอง; สำเร็จ → คืน `data` ไม่ได้ทำ runtime schema validation
- รายการส่วนใหญ่รับ `{ meta?: { page?, limit?, total? } }` ข้าง envelope แล้วคืน `{ items, total, page, limit }`; fallback total เป็น 0 ไม่ใช่ `items.length`
- `PaginatedResponse<T>` ใน `src/shared/api/types.ts` เป็น type อีกแบบ `{ items, page, pageSize, totalItems, totalPages }` แต่ยังไม่มีโมดูลอื่นนำไปใช้
- การเรียก API ตรงไม่ได้ invalidate cache หรือแจ้ง toast เอง ต้องใช้ `useAction` หรือจัดการด้วยผู้เรียก

## 1. HTTP clients — `src/shared/api/axiosClient.ts`

[เปิดซอร์ส](../../src/shared/api/axiosClient.ts)

| ชื่อ | Input → Output | หน้าที่/ผลข้างเคียง |
| --- | --- | --- |
| `clientConfig` | baseURL และ timeout | อ่าน env หรือใช้ URL สำรอง; รอ 15,000 ms |
| `apiError(error, portal?)` | unknown → rejected Promise | ถ้าไม่ใช่ Axios error ส่งต่อ error เดิม ถ้า 401 และมี portal ให้ `logout()` ของ store นั้น แล้วใช้ข้อความ API ถ้าเป็น string มิฉะนั้นเลือกข้อความ 403/5xx/เชื่อมต่อไม่ได้ |
| `createAuthenticatedClient(portal)` | `AuthPortal` → Axios instance | สร้าง request interceptor อ่าน token ล่าสุด; แนบ `Authorization: Bearer ...` เมื่อมี token; response interceptor ส่งข้อผิดพลาดเข้า `apiError` |
| `publicAxiosClient` | Axios instance | ไม่มี token interceptor; error ไม่ล้าง session |
| `userAxiosClient` | instance สำหรับ `user` | ใช้ token จาก `useUserAuth` |
| `adminAxiosClient` | instance สำหรับ `admin` | ใช้ token จาก `useAdminAuth` |
| `authenticatedClient(portal)` | `AuthPortal` → instance | คืน admin หรือ user client ให้ auth logout และ notifications |

ไม่มี refresh-token flow ในไฟล์นี้ และการแปลง Axios error เป็น `Error` ทำให้ผู้เรียกไม่สามารถอ่าน response/status แบบ Axios ต่อได้

## 2. Authentication — `src/shared/api/auth.ts`

[เปิดซอร์ส](../../src/shared/api/auth.ts) · ผู้เรียกหลัก: `LoginPage`, `RegisterPage`, `AppLayout`

| เมธอด | HTTP / path | พารามิเตอร์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| `authApi.register(payload)` | POST `/auth/register` | `firstName,lastName,userCode,email,phone,password`; เพิ่ม `role: 'USER'` | `User` จาก `asUser`; ไม่สร้าง local session |
| `authApi.login(payload)` | POST `/auth/login` | `{ username, password }` | `{ token, user: User }`; ไม่เขียน store เอง |
| `authApi.logout(portal)` | POST `/auth/logout` | เลือก client ตาม portal | `void`; การล้าง local session อยู่ใน layout |

Type ภายใน: `AuthApiUser` มี ID จริง, `userCode?`, `name`, ชื่อแยก optional, role/status และ `createdAt`; `LoginResult` มี token และ user; `LoginPayload/RegisterPayload` ระบุข้อมูลส่งตามตาราง

`asUser(user)` แยก `name` เป็นคำ ใช้ `firstName/lastName` หากมี, phone ว่างเมื่อไม่มี, `registeredAt ← createdAt`, ID ใช้ `String(id)` จาก backend โดยไม่แทนด้วย `userCode` และ role ที่ไม่ใช่ `ADMIN` จะเป็น `USER` ไม่ส่ง password เข้าผลลัพธ์

## 3. ห้องเรียน — `src/shared/api/classrooms.ts`

[เปิดซอร์ส](../../src/shared/api/classrooms.ts) · ผู้เรียก: hooks ห้อง, ฟอร์มจอง และ `RoomSchedulePage.selectSlot`

| เมธอด | HTTP / path | พารามิเตอร์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| `classroomsApi.list(filters = {})` | GET `/classrooms` | `ClassroomFilters` เป็น query | `{ items: Room[], total, page, limit }`; fallback page/limit ตาม filters หรือ 1/20 |
| `classroomsApi.get(id)` | GET `/classrooms/{id}` | ID | `Room` |
| `classroomsApi.availability(range)` | GET `/classrooms/availability` | `ClassroomRange` ผ่าน `rangeParams` | `{ startAt, endAt, rooms: AvailableClassroom[] }` |
| `classroomsApi.schedule(range)` | GET `/classrooms/schedule` | เช่นเดียวกัน | `{ startAt, endAt, rooms: ScheduledClassroom[] }` |
| `classroomsApi.availabilityForRoom(id, range)` | GET `/classrooms/{id}/availability` | ID และ `{ startAt, endAt }` | `{ available: boolean }` |

| Helper/type | รายละเอียด |
| --- | --- |
| `toRoom(room)` | ID เป็น string, `floor` เป็น number, `code` สำรอง `'-'`, description/category มีข้อความสำรอง, `imageUrl → image` หรือ `/room-placeholder.svg`; equipment ต้องเป็น array จึง map เป็น string[] มิฉะนั้น [] |
| `rangeParams(range)` | คง `startAt/endAt`; ถ้ามี classroomIds จะแปลง array เป็น string คั่น comma |
| `ClassroomFilters` | `search,building,floor,category,status,minCapacity,equipment,sort,page,limit`; sort รองรับ `code/capacity/name` |
| `ClassroomRange` | `startAt/endAt` strings และ `classroomIds?: string[]` |
| `AvailableClassroom` | `Room` + `available` + conflicts ที่ยังเป็นข้อมูล booking จาก API |
| `ScheduledBooking` | string ID/classroomId, startAt/endAt และ status `PENDING/APPROVED` |
| `ScheduledClassroom` | `Room` + bookings สำหรับตาราง |

API booking ภายใน schedule รองรับ `PENDING/CONFIRMED/IN_USE` แต่ adapter แปลงทุกสถานะที่ไม่ใช่ `PENDING` เป็น `APPROVED` จึงไม่คง `IN_USE` ไว้ในตาราง

## 4. การจอง — `src/shared/api/bookings.ts`

[เปิดซอร์ส](../../src/shared/api/bookings.ts) · ใช้ user client

| เมธอด | HTTP / path | พารามิเตอร์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| `bookingsApi.list(filters = {})` | GET `/bookings` | `BookingFilters`; แปลง status ก่อนส่ง | `{ items: Booking[], total, page, limit, calendar? }` |
| `bookingsApi.get(id)` | GET `/bookings/{id}` | ID | `Booking` |
| `bookingsApi.create(draft)` | POST `/bookings` | `BookingDraft` ผ่าน `toPayload` | `Booking` |
| `bookingsApi.update(id, draft)` | PATCH `/bookings/{id}` | เช่นเดียวกัน | `Booking` |
| `bookingsApi.remove(id, reason?)` | DELETE `/bookings/{id}` | optional `{ reason }` ใน request body | `Booking`; ยังไม่ใช่ action ลบที่หน้าประวัติเรียก |
| `bookingsApi.cancel(id, reason?)` | PATCH `/bookings/{id}/cancel` | optional `{ reason }` | `Booking`; หน้าประวัติเรียกเมธอดนี้ |
| `bookingsApi.checkIn(id)` | POST `/bookings/{id}/check-in` | ID | `Booking` |

`BookingFilters` มี `search,status,startDate,endDate,scope ('mine'/'all'),userId,page,limit,view,date`; `BookingCalendarView` เป็น `daily/weekly/monthly` ต่างจาก view ภายในตารางที่เป็น `day/week/month`

`list` สร้าง `calendar` เฉพาะเมื่อ meta มี `view` โดยคืน `view/date/startAt/endAt` วันที่สำรองใช้ filter date หรือ string ว่าง

| Helper | Input → Output และกฎ |
| --- | --- |
| `toStatus(status)` | API status → frontend; `CONFIRMED → APPROVED` |
| `toApiStatus(status)` | frontend → API; `APPROVED → CONFIRMED` |
| `toBooking(booking)` | แปลง ID เป็น string, `classroomId → roomId`, ใช้ Day.js แตก startAt เป็น date/start และ endAt เป็น end; attendees/equipment/note ตามชื่อ frontend; reason เลือก `cancelReason ?? adminNote`; แปลง classroom ที่แนบมาเป็น `room` |
| `toPayload(draft)` | ส่ง `classroomId,purpose,attendeeCount,requestedEquipment,startAt,endAt`; description ส่งเฉพาะ note ที่ไม่ว่าง; ไม่ส่ง `editingId` |

ตัวอย่างการแปลง payload โดยไม่ส่งคำขอจริง:

```ts
// ตัวอย่างข้อมูล BookingDraft
const draft = { roomId: 'room-id', date: '2026-10-27', start: '09:00', end: '10:00',
  attendees: 10, purpose: 'ประชุมโครงงาน', equipment: ['Projector'], note: '' }
// ตัวอย่าง HTTP body หลัง toPayload
const body = { classroomId: 'room-id', purpose: 'ประชุมโครงงาน', attendeeCount: 10,
  requestedEquipment: ['Projector'],
  startAt: '2026-10-27T09:00:00+07:00', endAt: '2026-10-27T10:00:00+07:00' }
```

ตัวอย่างข้างบนแสดงข้อมูลก่อนและหลังการแปลง ไม่ได้เรียก API หรือบันทึกรายการจริง

## 5. ผู้ใช้และกฎระบบ — `src/shared/api/users.ts`

[เปิดซอร์ส](../../src/shared/api/users.ts) · ทุกเมธอดใช้ user client รวม `businessRules`

| เมธอด | HTTP / path | พารามิเตอร์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| `usersApi.directory(search?)` | GET `/users/directory` | optional search query | `UserProfile[]`; ยังไม่มีหน้าปัจจุบันเรียก |
| `usersApi.me()` | GET `/users/me` | ไม่มี | `UserProfile` |
| `usersApi.updateMe(input)` | PATCH `/users/me` | `ProfileInput`; เพิ่ม `name` จากชื่อและนามสกุล trim | `UserProfile` |
| `usersApi.changePassword(currentPassword, newPassword)` | PATCH `/users/me/password` | รหัสเดิมและใหม่ | `null` ตาม contract |
| `usersApi.myBookings(filters = {})` | GET `/users/me/bookings` | `status,page,limit`; status แปลงด้วย helper | `{ items: Booking[], total, page, limit }` |
| `usersApi.businessRules()` | GET `/config/business-rules` | ไม่มี | `BusinessRules` |

- `toProfile(user)` คืน ID จริงแบบ string, เพิ่ม `userCode: string|null`, `name` และข้อมูล `User`; แยกชื่อสำรองจาก `name`, ยุบ role เช่น auth แต่ไม่ใช้ userCode แทน ID
- `toApiBookingStatus(status)` แปลง `APPROVED → CONFIRMED`
- `UserProfile = User + { userCode, name }`; `ProfileInput` มี `firstName,lastName,phone,email`
- `BusinessRules` มี `bookingCancelMinutes`, `bookingMaxDurationHours`, `bookingMaxAdvanceDays`, `bookingOpenTime`, `bookingCloseTime`, `bookingCheckinEarlyMinutes`, `bookingCheckinLateMinutes`, `bookingReminderMinutes`, `roles`, `bookingStatuses` การมีฟิลด์ใน type ไม่ได้แปลว่าหน้าจอใช้ครบทุกค่า

## 6. การแจ้งเตือน — `src/shared/api/notifications.ts`

[เปิดซอร์ส](../../src/shared/api/notifications.ts) · ทุกเมธอดต้องระบุ `portal` เพื่อเลือก token

| เมธอด | HTTP / path | พารามิเตอร์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| `notificationsApi.list(portal, filters = {})` | GET `/notifications` | `NotificationFilters` ได้แก่ `isRead,page,limit`; แปลง boolean isRead เป็น string | `{ items: BookingNotification[], total }` |
| `notificationsApi.unreadCount(portal)` | GET `/notifications/unread-count` | portal | number จาก `data.count` |
| `notificationsApi.markAllRead(portal)` | PATCH `/notifications/read-all` | portal | `{ updated: number }` |
| `notificationsApi.markRead(portal, id)` | PATCH `/notifications/{id}/read` | portal และ ID | `BookingNotification` |

`kindFor(type)` ตรวจ substring แบบ case-sensitive ตามลำดับ REMINDER → REJECT → CANCEL → CONFIRM/APPROV → BOOKING; `toNotification(item)` แปลง ID เป็น string, bookingId null ได้ และใช้ kind จาก helper โดยคง `readAt` ตาม API ปัจจุบันไม่ใช้ `isRead` เพื่อสร้าง readAt สำรอง ดังนั้น UI ที่กรองด้วย `readAt` ต้องได้รับค่าจาก API สอดคล้องกัน

## 7. อัปโหลด — `src/shared/api/uploads.ts`

[เปิดซอร์ส](../../src/shared/api/uploads.ts) · ใช้ admin client

| ชื่อ | HTTP / input | ผลลัพธ์/หน้าที่ |
| --- | --- | --- |
| `uploadsApi.uploadImage(file)` | POST `/admin/uploads/images`; `File` ใส่ `FormData` ชื่อ `image` | `UploadedImage = { key: string; url: string }` |
| `uploadsApi.deleteImage(key)` | DELETE `/admin/uploads/images/{key}` | `null` ตาม contract |
| `uploadedImageKey(url)` | string หรือ undefined | parse เทียบ `window.location.origin`, ใช้ segment สุดท้ายของ pathname ถ้าตรง regex คืน key; อื่น ๆ คืน null |
| `KEY_PATTERN` | `/^[0-9a-f-]+\.(jpg\|png\|webp\|gif)$/i` | ตรวจรูปแบบชื่อไฟล์ ไม่ได้ตรวจ ownership หรือ host |
| `R2_PUBLIC_BASE_URL` | env หรือ URL R2 สาธารณะสำรอง | export ไว้ แต่ helper ด้านบนยังไม่ได้ใช้ตรวจ origin |

การตรวจ MIME/ขนาด 5 MB อยู่ที่ `RoomEditor.beforeUpload` ไม่อยู่ใน API service การอัปโหลดเริ่มทันทีเมื่อเลือกไฟล์ และการลบเริ่มทันทีที่กดปุ่ม ไม่รอการบันทึกข้อมูลห้อง

## 8. การจัดการระบบ — `src/shared/api/admin.ts`

[เปิดซอร์ส](../../src/shared/api/admin.ts) · ทุกเมธอดใช้ admin client

### Type และ helper

| ชื่อ | หน้าที่ |
| --- | --- |
| `AdminUser` | `User` + `userCode: string\|null` และ `name` |
| `AdminBooking` | `Booking` + `bookingCode`, `user?`, `classroom?`, `adminNote?`, `cancelReason?` |
| `AdminRoomInput` | ใช้ฟิลด์ห้องที่เกี่ยวข้อง, floor เป็น string, ภาพเป็น `imageUrl?` |
| `AdminUserInput` | `name,email` และ optional userCode/ชื่อแยก/phone/password/role/status |
| `AdminFilters` | `search,status,page,limit,building,role,classroomId,userId,startDate,endDate,action,entity` |
| `DashboardSummary` | ยอด users/activeUsers/classrooms/bookings/pending/confirmed/inUse/completed/noShow/cancelled/todayBookings และ mostBookedClassroom nullable |
| `AuditLog` | ID, userId/entityId nullable, action/entity/createdAt และ user ที่แนบมา |
| `ReportFilters` | status/classroomId/userId/startDate/endDate + userRole/building/floor/category/search |
| `ReportSummary` | users/classrooms/bookings, byStatus, bookingsGraph ที่มี timezone/startDate/endDate/data, statusPie ที่มี total/data |
| `toUser(user)` | สร้าง `AdminUser` ด้วย ID จริง แยกชื่อสำรองและคง role เดิม |
| `toAdminBooking(booking)` | ต่อยอด `toBooking`, bookingCode สำรอง ID, แปลง user/classroom และคง note/reason แยกไว้ |
| `toApiBookingFilters(filters)` | เปลี่ยน APPROVED เป็น CONFIRMED; อื่น ๆ คืน filters เดิม |
| `toReportSummary(summary)` | แปลง status เฉพาะ `statusPie.data`; `byStatus` ยังเป็นค่าจาก backend |
| `toAdminRoomInput(room)` | floor เป็น string, image เป็น imageUrl, placeholder ส่ง null; เลือกฟิลด์สำหรับสร้าง/แก้ห้อง |
| `list<T>(path, params?)` | GET รายการด้วย admin client; unwrap envelope และ meta; fallback page=1/limit=20/total=0 |
| `toAuditLog(log)` | ID/userId/entityId เป็น string หรือ null และแปลง user |
| `bookingAction(id, action, payload?)` | PATCH `/admin/bookings/{id}/{action}` แล้วแปลงเป็น AdminBooking |
| `adminDate(value)` | Day.js → `YYYY-MM-DD`; export อยู่แต่ยังไม่มีผู้เรียกในหน้า |

### Dashboard และห้องเรียน

| เมธอด | HTTP / path | Input → ผลลัพธ์ |
| --- | --- | --- |
| `adminApi.dashboardSummary()` | GET `/admin/dashboard/summary` | ไม่มี → summary พร้อมแปลง mostBookedClassroom เป็น Room หากมี |
| `adminApi.recentBookings(limit = 10)` | GET `/admin/dashboard/recent-bookings` | limit query → `AdminBooking[]` |
| `adminApi.classrooms(filters = {})` | GET `/admin/classrooms` | AdminFilters → รายการ Room พร้อม meta |
| `adminApi.classroom(id)` | GET `/admin/classrooms/{id}` | ID → `{ room: Room, bookings: AdminBooking[] }` |
| `adminApi.createClassroom(room)` | POST `/admin/classrooms` | Room ผ่าน toAdminRoomInput → Room |
| `adminApi.updateClassroom(id, room)` | PATCH `/admin/classrooms/{id}` | เช่นเดียวกัน → Room |
| `adminApi.setClassroomStatus(id, status)` | PATCH `/admin/classrooms/{id}/status` | `{ status }` → Room |
| `adminApi.deactivateClassroom(id)` | DELETE `/admin/classrooms/{id}` | ID → Room; UI ใช้เป็นปิดใช้งาน |

### การจอง

| เมธอด | HTTP / path | Input → ผลลัพธ์ |
| --- | --- | --- |
| `adminApi.bookings(filters = {})` | GET `/admin/bookings` | filters แปลง status → รายการ AdminBooking พร้อม meta |
| `adminApi.booking(id)` | GET `/admin/bookings/{id}` | ID → `{ booking: AdminBooking, history: AuditLog[] }` |
| `adminApi.approveBooking(id)` | PATCH `/admin/bookings/{id}/approve` | ไม่มี body → AdminBooking |
| `adminApi.rejectBooking(id, adminNote)` | PATCH `/admin/bookings/{id}/reject` | `{ adminNote }` → AdminBooking |
| `adminApi.cancelBooking(id, reason)` | PATCH `/admin/bookings/{id}/cancel` | `{ reason }` → AdminBooking |
| `adminApi.startBooking(id)` | PATCH `/admin/bookings/{id}/start` | ไม่มี body → AdminBooking |
| `adminApi.completeBooking(id)` | PATCH `/admin/bookings/{id}/complete` | ไม่มี body → AdminBooking |
| `adminApi.noShowBooking(id, reason?)` | PATCH `/admin/bookings/{id}/no-show` | ส่ง `{ reason }` เมื่อมีค่า → AdminBooking |

### ผู้ใช้

| เมธอด | HTTP / path | Input → ผลลัพธ์ |
| --- | --- | --- |
| `adminApi.users(filters = {})` | GET `/admin/users` | AdminFilters → รายการ AdminUser พร้อม meta |
| `adminApi.user(id)` | GET `/admin/users/{id}` | ID → `{ user: AdminUser, bookings: AdminBooking[] }` |
| `adminApi.createUser(input)` | POST `/admin/users` | AdminUserInput ที่ต้องมี password → AdminUser |
| `adminApi.updateUser(id, input)` | PATCH `/admin/users/{id}` | ข้อมูลทั่วไป ยกเว้น password/role/status → AdminUser |
| `adminApi.setUserRole(id, role)` | PATCH `/admin/users/{id}/role` | `{ role }` → AdminUser |
| `adminApi.setUserStatus(id, status)` | PATCH `/admin/users/{id}/status` | `{ status }` → AdminUser |
| `adminApi.resetUserPassword(id, newPassword)` | PATCH `/admin/users/{id}/reset-password` | `{ newPassword }` → null |
| `adminApi.deactivateUser(id)` | DELETE `/admin/users/{id}` | ID → AdminUser |

### รายงานและบันทึกการดำเนินการ

| เมธอด | HTTP / path | Input → ผลลัพธ์ |
| --- | --- | --- |
| `adminApi.reportsSummary()` | GET `/admin/reports/summary` | ไม่มี filters → ReportSummary ผ่าน adapter |
| `adminApi.reportsBookings(filters = {})` | GET `/admin/reports/bookings` | ReportFilters ผ่าน status mapping → `{ total, byStatus, rows: AdminBooking[] }` |
| `adminApi.reportsClassrooms(filters = {})` | GET `/admin/reports/classrooms` | ReportFilters → `{ classroom: Room, bookingCount, totalHours }[]` |
| `adminApi.reportsUsers(filters = {})` | GET `/admin/reports/users` | ReportFilters → `{ user: AdminUser\|null, bookingCount }[]` |
| `adminApi.exportBookings(filters = {})` | GET `/admin/reports/export` | ReportFilters, `responseType: 'blob'` → Blob โดยไม่ unwrap JSON |
| `adminApi.auditLogs(filters = {})` | GET `/admin/audit-logs` | AdminFilters → รายการ AuditLog พร้อม meta |

## 9. Query hooks — `src/shared/hooks/queries.ts`

[เปิดซอร์ส](../../src/shared/hooks/queries.ts)

ทุก hook คืนผลของ `useQuery` มี `data/isLoading/error/refetch/isFetching` ตาม TanStack Query; `data` อาจยัง undefined ไม่ใช่ array โดยตรง ให้เข้าถึงโครงสร้างผลลัพธ์ API ตามตารางด้านบน

| Hook และ input | Query key | Query function / เงื่อนไข |
| --- | --- | --- |
| `useClassrooms(filters = {})` | `['classrooms', filters]` | `classroomsApi.list` |
| `useClassroom(id)` | `['classrooms', id]` | `classroomsApi.get`; enabled เมื่อมี ID |
| `useClassroomsAvailability(range)` | `['classrooms', 'availability', range]` | `classroomsApi.availability`; enabled เมื่อ classroomIds มีสมาชิก |
| `useClassroomSchedule(range)` | `['classrooms', 'schedule', range]` | `classroomsApi.schedule`; เงื่อนไขเดียวกัน |
| `useBookings(filters = {})` | `['bookings', filters]` | `bookingsApi.list`; ยังไม่มีหน้าปัจจุบันเรียก |
| `useBooking(id)` | `['bookings', id]` | `bookingsApi.get`; enabled เมื่อมี ID |
| `useNotifications(portal, filters = {})` | `['notifications', portal, filters]` | `notificationsApi.list` |
| `useUnreadNotificationCount(portal)` | `['notifications', portal, 'unread-count']` | `notificationsApi.unreadCount` |
| `useMyProfile()` | `['users', 'me']` | `usersApi.me` |
| `useMyBookings()` | `['users', 'me', 'bookings']` | `usersApi.myBookings({ limit: 100 })`; hook ไม่รับ filters |
| `useBusinessRules()` | `['config', 'business-rules']` | `usersApi.businessRules`; staleTime 5 นาที |
| `useAdminDashboard()` | `['admin', 'dashboard']` | `adminApi.dashboardSummary` |
| `useAdminReportSummary()` | `['admin', 'reports', 'summary']` | `adminApi.reportsSummary` |
| `useAdminRecentBookings()` | `['admin', 'recent-bookings']` | `adminApi.recentBookings(8)` |
| `useAdminClassrooms(filters = {})` | `['admin', 'classrooms', filters]` | `adminApi.classrooms` |
| `useAdminClassroom(id)` | `['admin', 'classrooms', id]` | `adminApi.classroom`; enabled เมื่อมี ID |
| `useAdminBookings(filters = {}, options = {})` | `['admin', 'bookings', filters]` | `adminApi.bookings`; `options.live` เปิด refetch ทุก 10 วินาที ไม่ polling ใน background |
| `useAdminBooking(id)` | `['admin', 'bookings', id]` | `adminApi.booking`; enabled เมื่อมี ID |
| `useAdminUsers(filters = {})` | `['admin', 'users', filters]` | `adminApi.users` |
| `useAdminUser(id)` | `['admin', 'users', id]` | `adminApi.user`; enabled เมื่อมี ID |
| `useAdminReports(filters = {})` | `['admin', 'reports', filters]` | `Promise.all` summary/bookings/classrooms/users → `{ summary, bookings, classrooms, users }` |
| `useAuditLogs(filters = {})` | `['admin', 'audit-logs', filters]` | `adminApi.auditLogs` |

Query keys ไม่ได้รวม account ID; portal แยกแค่ notifications ตามตาราง หากแก้ session/cache ให้ตรวจทุกกลุ่มที่ผูกกับตัวตน

### `useAction<T, R>(action, success?)`

Input คือ async function `(value: T) => Promise<R>` และข้อความสำเร็จ optional; output คือผลของ `useMutation` เช่น `mutate`, `mutateAsync`, `isPending`, `error`

เมื่อสำเร็จ สั่ง invalidate query prefixes `['notifications']`, `['bookings']`, `['classrooms']`, `['users']`, `['admin']` ด้วย `void` จึงไม่รอให้โหลดข้อมูลใหม่ทั้งหมดเสร็จก่อน callback ของผู้เรียก; ถ้ามี success จะแสดง message สำเร็จ เมื่อ error แสดง `error.message` ไม่ invalidate ในกรณีล้มเหลว

ไม่ได้ invalidate `['config']`, ไม่ clear session/draft/modal ให้เอง และไม่ได้ทำ optimistic update ฟอร์ม availability check ก็ใช้ hook นี้ จึงเกิด invalidation หลังตรวจเวลาว่างสำเร็จทั้งที่ยังไม่ได้แก้ข้อมูล

ตัวอย่างอ้างอิงแบบเดียวกับโค้ดเดิม:

```tsx
const cancel = useAction(
  (id: string) => bookingsApi.cancel(id),
  t('bookingCancelledSuccess'),
)
// เช่นใน handler ของปุ่ม เมื่อผู้ใช้ยืนยันแล้ว
cancel.mutate(booking.id, { onSuccess: closeDetails })
```

ตัวแปร `booking` และ `closeDetails` เป็นข้อมูล/handler ของคอมโพเนนต์ผู้เรียก หลีกเลี่ยงเรียกตัวอย่างนี้ระหว่าง render

## 10. ขอบเขตหลังถอดระบบข้อมูลจำลอง

`queries.ts` เรียกเฉพาะโมดูล API ไม่มี hook อ่านฐานข้อมูลภายในเครื่อง และ `useAction` invalidate เฉพาะ notifications/bookings/classrooms/users/admin เท่านั้น การแจ้งเตือนและการตรวจเวลาว่างมาจาก backend

Tests ของทุก API module แทน HTTP adapter เฉพาะระหว่างทดสอบ เพื่อทดสอบ request contracts และการแปลงข้อมูลจริง รวม login/register ที่ต้องใช้ backend ID ดู [คู่มือ Vitest](testing.md) สำหรับรายการไฟล์และ query/cache tests ตัวช่วยทดสอบไม่ถูกนำเข้า runtime ของแอป และไม่เรียก backend จริง
