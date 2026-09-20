import dayjs from "dayjs";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useAdminBookings,
  useAdminClassrooms,
  useAdminDashboard,
  useAdminRecentBookings,
  useAdminReportSummary,
} from "../../services/queries";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import type { AdminBooking } from "../../api/admin";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const summary = useAdminDashboard();
  const reportSummary = useAdminReportSummary();
  const recent = useAdminRecentBookings();
  const chartStart = dayjs().subtract(6, "day").format("YYYY-MM-DD");
  const chartEnd = dayjs().format("YYYY-MM-DD");
  const chartBookings = useAdminBookings({
    startDate: chartStart,
    endDate: chartEnd,
    limit: 100,
  });
  const chartRooms = useAdminClassrooms({ limit: 100 });
  const error =
    summary.error ?? reportSummary.error ?? recent.error ?? chartBookings.error ?? chartRooms.error;
  const isLoading =
    summary.isLoading ||
    reportSummary.isLoading ||
    recent.isLoading ||
    chartBookings.isLoading ||
    chartRooms.isLoading;

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        subtitle={t("adminDashboardSubtitle")}
        action={<Button type="primary" onClick={() => navigate("/admin/bookings")}>{t("adminManageBookings")}</Button>}
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        retry={() => {
          void summary.refetch();
          void reportSummary.refetch();
          void recent.refetch();
          void chartBookings.refetch();
          void chartRooms.refetch();
        }}
      >
        <div className={styles.metrics}>
          {[
            { label: t("adminTotalClassrooms"), value: summary.data?.classrooms },
            { label: t("adminTodayBookings"), value: summary.data?.todayBookings },
            { label: t("adminPendingBookings"), value: summary.data?.pending },
            { label: t("adminActiveUsers"), value: summary.data?.activeUsers },
          ].map((metric) => (
            <div className={styles.metric} key={metric.label}>
              <span>{metric.label}</span><strong>{metric.value ?? 0}</strong>
            </div>
          ))}
        </div>
        <Analytics
          bookings={chartBookings.data?.items ?? []}
          rooms={chartRooms.data?.items ?? []}
          start={reportSummary.data?.bookingsGraph.startDate ?? chartStart}
          end={reportSummary.data?.bookingsGraph.endDate ?? chartEnd}
          trendData={reportSummary.data?.bookingsGraph.data}
          statusData={reportSummary.data?.statusPie.data}
        />
        <Panel>
          <h2>{t("adminRecentBookings")}</h2>
          <DataTable<AdminBooking>
            dataSource={recent.data ?? []}
            pagination={false}
            columns={[
              { title: t("adminBookingId"), dataIndex: "bookingCode" },
              { title: t("adminBooker"), render: (_, booking) => booking.user?.name ?? "—" },
              { title: t("adminRoom"), render: (_, booking) => booking.classroom?.code ?? "—" },
              { title: t("adminDate"), dataIndex: "date" },
              { title: t("adminTime"), render: (_, booking) => `${booking.start}–${booking.end}` },
              { title: t("adminStatus"), render: (_, booking) => <BookingStatusTag status={booking.status} /> },
            ]}
          />
        </Panel>
      </QueryState>
    </>
  );
}
