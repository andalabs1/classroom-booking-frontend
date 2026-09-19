import dayjs from "dayjs";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import {
  useAdminBookings,
  useAdminClassrooms,
  useAdminDashboard,
  useAdminRecentBookings,
} from "../../services/queries";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import type { AdminBooking } from "../../api/admin";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const summary = useAdminDashboard();
  const recent = useAdminRecentBookings();
  const chartStart = dayjs().subtract(6, "day").format("YYYY-MM-DD");
  const chartEnd = dayjs().add(7, "day").format("YYYY-MM-DD");
  const chartBookings = useAdminBookings({
    startDate: chartStart,
    endDate: chartEnd,
    limit: 100,
  });
  const chartRooms = useAdminClassrooms({ limit: 100 });
  const error =
    summary.error ?? recent.error ?? chartBookings.error ?? chartRooms.error;
  const isLoading =
    summary.isLoading ||
    recent.isLoading ||
    chartBookings.isLoading ||
    chartRooms.isLoading;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`ภาพรวมการใช้ห้องเรียน · ย้อนหลัง 7 วัน และล่วงหน้า 7 วัน`}
        action={<Button type="primary" onClick={() => navigate("/admin/bookings")}>จัดการการจอง</Button>}
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        retry={() => {
          void summary.refetch();
          void recent.refetch();
          void chartBookings.refetch();
          void chartRooms.refetch();
        }}
      >
        <div className={styles.metrics}>
          {[
            { label: "จำนวนห้องเรียนทั้งหมด", value: summary.data?.classrooms },
            { label: "จำนวนการจองวันนี้", value: summary.data?.todayBookings },
            { label: "รายการรออนุมัติ", value: summary.data?.pending },
            { label: "ผู้ใช้งานที่เปิดใช้งาน", value: summary.data?.activeUsers },
          ].map((metric) => (
            <div className={styles.metric} key={metric.label}>
              <span>{metric.label}</span><strong>{metric.value ?? 0}</strong>
            </div>
          ))}
        </div>
        <Analytics
          bookings={chartBookings.data?.items ?? []}
          rooms={chartRooms.data?.items ?? []}
          start={chartStart}
          end={chartEnd}
        />
        <Panel>
          <h2>การจองล่าสุด</h2>
          <DataTable<AdminBooking>
            dataSource={recent.data ?? []}
            pagination={false}
            columns={[
              { title: "Booking ID", dataIndex: "bookingCode" },
              { title: "ผู้จอง", render: (_, booking) => booking.user?.name ?? "—" },
              { title: "ห้อง", render: (_, booking) => booking.classroom?.code ?? "—" },
              { title: "วันที่", dataIndex: "date" },
              { title: "เวลา", render: (_, booking) => `${booking.start}–${booking.end}` },
              { title: "สถานะ", render: (_, booking) => <BookingStatusTag status={booking.status} /> },
            ]}
          />
        </Panel>
      </QueryState>
    </>
  );
}
