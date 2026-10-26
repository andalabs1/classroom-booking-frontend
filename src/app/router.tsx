import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { Skeleton } from "antd";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage, RegisterPage } from "../features/auth/pages/AuthPage";
import { RoomListPage } from "../features/rooms/pages/RoomListPage";
import { RoomDetailPage } from "../features/rooms/pages/RoomDetailPage";
import { RoomSchedulePage } from "../features/booking/pages/RoomSchedulePage";
import { BookingPage } from "../features/booking/pages/BookingPage";
import { BookingConfirmPage } from "../features/booking/pages/BookingConfirmPage";
import { BookingHistoryPage } from "../features/booking-history/pages/BookingHistoryPage";
import { ProfilePage } from "../features/profile/pages/ProfilePage";
import { PermissionGuard } from "../shared/components/permission/PermissionGuard";
import { ErrorPage } from "../shared/pages/ErrorPage";
// แยก bundle ของหน้า admin เพื่อให้หน้าผู้ใช้ทั่วไปไม่ต้องโหลดโค้ดจัดการและกราฟทั้งหมดทันที
const DashboardPage = lazy(() =>
  import("../features/admin/pages/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const AdminRoomsPage = lazy(() =>
  import("../features/admin/pages/AdminRoomsPage").then((m) => ({
    default: m.AdminRoomsPage,
  })),
);
const AdminBookingsPage = lazy(() =>
  import("../features/admin/pages/AdminBookingsPage").then((m) => ({
    default: m.AdminBookingsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../features/admin/pages/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../features/admin/pages/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
const AuditLogsPage = lazy(() =>
  import("../features/admin/pages/AuditLogsPage").then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/admin/login", element: <LoginPage portal="admin" /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <AppLayout />,
    errorElement: <ErrorPage code="500" />,
    children: [
      { index: true, element: <Navigate to="/rooms" replace /> },
      { path: "/rooms", element: <RoomListPage /> },
      { path: "/rooms/:roomId", element: <RoomDetailPage /> },
      { path: "/room-schedule", element: <RoomSchedulePage /> },
      {
        element: (
          <PermissionGuard>
            <Outlet />
          </PermissionGuard>
        ),
        children: [
          { path: "/booking", element: <BookingPage /> },
          { path: "/booking/confirm", element: <BookingConfirmPage /> },
          { path: "/booking-history", element: <BookingHistoryPage /> },
          { path: "/profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <PermissionGuard role="ADMIN">
        <Suspense fallback={<Skeleton active />}>
          <AppLayout admin />
        </Suspense>
      </PermissionGuard>
    ),
    errorElement: <ErrorPage code="500" />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "rooms", element: <AdminRoomsPage /> },
      { path: "bookings", element: <AdminBookingsPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "audit-logs", element: <AuditLogsPage /> },
    ],
  },
  { path: "/403", element: <ErrorPage code="403" /> },
  { path: "/500", element: <ErrorPage code="500" /> },
  { path: "*", element: <ErrorPage /> },
]);

/**
 * แสดง router ที่แยก public/user/admin routes และโหลดหน้า admin แบบ lazy เมื่อเข้าใช้งาน
 */
export function ApplicationRouter() {
  return <RouterProvider router={router} />;
}
