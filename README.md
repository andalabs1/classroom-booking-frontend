# Classroom Booking System

Thai-first classroom booking prototype built with React 19, TypeScript strict mode, Vite, Ant Design, and CSS Modules. No Tailwind. Includes a public room catalogue, student booking workflow, and role-protected admin workspace.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The landing route is `/rooms`; booking and history require login. Use the demo account selector on `/login`.

| Role          | Email                    | Password  |
| ------------- | ------------------------ | --------- |
| Student       | student@university.ac.th | Demo1234! |
| Administrator | admin@university.ac.th   | Demo1234! |

These are synthetic demo credentials. Registration also works locally.

## Implemented

- Room cards and list view, search, building/floor/capacity/equipment/status filters, sorting, pagination, room details.
- Daily schedule, previous/next/today controls, clickable available time slots.
- React Hook Form + Zod registration, login, booking, room, and user forms.
- Availability review → confirmation with fresh validation → reference and success result → booking history.
- In-app notification bell with six realistic seeded examples, unread count, all/unread filters, mark-one/all as read, and direct booking-detail links. Notification cards enter in a short stagger, unread indicators pulse gently, and the bell rings periodically while unread items remain; reduced-motion preferences disable these effects. Booking creation/editing alerts the owner and active administrators; approval/rejection alerts the owner, and cancellation also alerts administrators. Read state is per account and persists in the mock database. Updates synchronize across tabs on the same browser origin. No email or browser push permission is required.
- Pending booking edits; future pending/approved booking cancellation; rejection reasons shown in details.
- Admin dashboard, room creation/editing/status changes, booking approval/rejection/cancellation, user editing/suspension, filtered reports.
- ECharts line, bar, donut, and horizontal ranking charts; calculations use the same mock bookings as tables.
- Light/dark mode toggle in the header and authentication pages; theme persists in localStorage (`classroom-theme`) and covers custom surfaces, Ant Design components, and ECharts.
- Responsive navigation, mobile drawer, horizontally scrollable tables, loading/error/empty states, 403/404/500 pages.
- i18next Thai/English infrastructure; navigation and key catalogue labels translated. Detailed workflows currently retain Thai copy for future translation.

## Architecture

`src/features` groups authentication, rooms, booking, history, and administration. `src/services` is the async mock service boundary and TanStack Query hooks. Components never import mock seed data. `src/mocks` owns 10 rooms, 20 users, and 36 bookings with dates relative to first launch. `src/utils/bookingRules.ts` owns availability and change eligibility.

TanStack Query owns cached server-like data; Zustand stores only the signed-in user and mock session. Menu definitions and the Ant Design theme live in `src/config`. Global CSS contains base typography and tokens; page and layout styling uses CSS Modules. Admin routes and charting are dynamically imported.

`src/api/axiosClient.ts` prepares the future HTTP transport: environment base URL, real-token injection, timeout, 401 logout, and normalized errors. It is intentionally not used by mock workflows. `src/api/types.ts` defines API and pagination envelopes. Replace the mock service boundary with real endpoints when the backend is ready.

## Booking rules

Only ACTIVE rooms can be booked. PENDING and APPROVED reservations block overlapping periods (`requestedStart < existingEnd && requestedEnd > existingStart`); adjacent bookings are allowed. Dates/times must be valid and future, start must precede end, hours must fall within 08:00–20:00, and attendees must be a positive integer within capacity. Only PENDING future bookings can be edited; future PENDING/APPROVED bookings can be cancelled. Approval rechecks room status and availability.

Confirmation validates again inside a Web Lock where supported, with synchronous read/validate/write for this local mock. This coordinates tabs on the same browser origin; a real backend must implement atomic availability checks and authorization in a database transaction for multi-user deployment.

## Persistence and prototype boundaries

Mock data persists in localStorage (`classroom-database-v1`). Session data uses `classroom-auth`, draft data uses sessionStorage (`booking-draft`), and language uses `classroom-language`. Clear these keys in browser developer tools to reset the prototype. Changes synchronize across tabs on the same origin, not across devices.

All mock users and synthetic passwords are browser-readable: this is not production authentication. Do not use real credentials or personal data. Password recovery displays administrator guidance; no email is sent. Excel/PDF export is reserved for a future backend/export integration. Room images use remote reference photography and fonts use Google Fonts, with system font fallbacks.

Optional environment variables are listed in `.env.example`. Deployments must rewrite SPA routes to `index.html`.

## Verification

```sh
npm run build
npm run lint
npm run test
```

Unit tests cover interval boundaries, blocking statuses, capacity, dates, room availability, review/confirmation races, registration, role restrictions, approval, rejection, cancellation, and editing. Browser smoke checks cover student booking → success → history, USER → admin 403, admin approval, management pages, chart rendering, and responsive layouts.

## Image credits

The synthetic catalogue uses illustrative facility photographs; room names and capacities do not describe the photographed venues. Sources: [APU / TopUniversities](https://www.topuniversities.com/universities/asia-pacific-university-technology-innovation-apu-malaysia), [Fulda / AK Hessen](https://www.akh.de/baukultur/baukultour/projekte/neubau-campuserweiterung-fakultat-pflege-und-gesun-858), [Prince of Songkla University](https://www.fms.psu.ac.th/computer/?lang=en), [Van Lang University](https://www.vlu.edu.vn/en/about-us/campuses-facilities/main-campus), [Iwate University of Health and Medical Sciences](https://www.iwate-uhms.ac.jp/outline/campusguide/), [University of Alicante](https://cvnet.cpd.ua.es/FichaAula/es/Aula/Ver/0702P2062). Replace reference images with your own university's licensed photos for publication. A local fallback illustration handles unavailable images.
