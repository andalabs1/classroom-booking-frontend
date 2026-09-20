import { useState } from "react";
import { Button, DatePicker, Input, Select } from "antd";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { adminApi, type ReportFilters } from "../../api/admin";
import { useAdminClassrooms, useAdminReports } from "../../services/queries";
import { PageHeader, Panel, QueryState, DataTable } from "../../components/common/Common";
import { getBookingLabels } from "../../constants/bookingStatus";
import type { BookingStatus, Role } from "../../types";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";

export function ReportsPage() {
  const { t } = useTranslation();
  const bookingLabels = getBookingLabels(t);
  const [range, setRange] = useState<[string, string]>([dayjs().subtract(14, "day").format("YYYY-MM-DD"), dayjs().add(7, "day").format("YYYY-MM-DD")]);
  const [roomId, setRoomId] = useState<string>();
  const [status, setStatus] = useState<BookingStatus>();
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState<string>();
  const [floor, setFloor] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [userRole, setUserRole] = useState<Role>();
  const filters: ReportFilters = {
    startDate: range[0],
    endDate: range[1],
    classroomId: roomId,
    status,
    search: search.trim() || undefined,
    building,
    floor,
    category,
    userRole,
  };
  const query = useAdminReports(filters);
  const rooms = useAdminClassrooms({ limit: 100 });
  const roomOptions = rooms.data?.items ?? [];
  const uniqueValues = (values: string[]) => [...new Set(values)].sort();
  const download = async () => {
    const blob = await adminApi.exportBookings(filters);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `booking-report-${range[0]}-to-${range[1]}.csv`; link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader title={t("adminReports")} subtitle={t("adminReportsSubtitle")} action={<Button icon={<Download size={16} />} onClick={() => void download()}>{t("adminExportCsv")}</Button>} />
      <QueryState isLoading={query.isLoading || rooms.isLoading} error={query.error ?? rooms.error} retry={() => { void query.refetch(); void rooms.refetch(); }}>
        <Panel>
          <div className={styles.filters}>
            <DatePicker.RangePicker value={[dayjs(range[0]), dayjs(range[1])]} allowClear={false} onChange={(value) => value?.[0] && value?.[1] && setRange([value[0].format("YYYY-MM-DD"), value[1].format("YYYY-MM-DD")])} />
            <Input allowClear placeholder={t("adminSearchBookings")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select allowClear placeholder={t("adminAllRooms")} value={roomId} onChange={setRoomId} options={roomOptions.map((room) => ({ value: room.id, label: room.code }))} />
            <Select allowClear placeholder={t("adminAllStatuses")} value={status} onChange={setStatus} options={Object.entries(bookingLabels).map(([value, label]) => ({ value, label }))} />
            <Select allowClear placeholder={t("adminAllBuildings")} value={building} onChange={setBuilding} options={uniqueValues(roomOptions.map((room) => room.building)).map((value) => ({ value, label: value }))} />
            <Select allowClear placeholder={t("adminAllFloors")} value={floor} onChange={setFloor} options={uniqueValues(roomOptions.map((room) => String(room.floor))).map((value) => ({ value, label: value }))} />
            <Select allowClear placeholder={t("adminAllCategories")} value={category} onChange={setCategory} options={uniqueValues(roomOptions.map((room) => room.category)).map((value) => ({ value, label: value }))} />
            <Select allowClear placeholder={t("adminAllRoles")} value={userRole} onChange={setUserRole} options={(["USER", "STUDENT", "TEACHER", "STAFF", "ADMIN"] as Role[]).map((value) => ({ value, label: value }))} />
          </div>
        </Panel>
        <div className={`${styles.metrics} ${styles.reportMetrics}`}>
          {[
            { label: t("adminTotalBookings"), value: query.data?.bookings.total }, { label: t("adminTotalUsers"), value: query.data?.summary.users }, { label: t("adminTotalClassrooms"), value: query.data?.summary.classrooms },
            { label: t("adminPendingBookings"), value: query.data?.bookings.byStatus.find((item) => item.status === "PENDING")?._count._all ?? 0 }, { label: t("adminMostBookedRoom"), value: query.data?.classrooms[0]?.classroom.code ?? "—" },
          ].map((metric) => <div className={styles.metric} key={metric.label}><span>{metric.label}</span><strong>{metric.value ?? 0}</strong></div>)}
        </div>
        {query.data && <><Analytics bookings={query.data.bookings.rows} rooms={roomOptions} start={range[0]} end={range[1]} report />
          <div className={styles.charts}>
            <Panel><h2 className={styles.chartTitle}>{t("adminRoomUsage")}</h2><DataTable dataSource={query.data.classrooms} pagination={false} columns={[{ title: t("adminRoom"), render: (_, row) => row.classroom.code }, { title: t("adminBookingCount"), dataIndex: "bookingCount" }, { title: t("adminHours"), dataIndex: "totalHours" }]} /></Panel>
            <Panel><h2 className={styles.chartTitle}>{t("adminTopBookers")}</h2><DataTable dataSource={query.data.users} pagination={false} columns={[{ title: t("adminUsers"), render: (_, row) => row.user?.name ?? "—" }, { title: t("adminBookingCount"), dataIndex: "bookingCount" }]} /></Panel>
          </div>
        </>}
      </QueryState>
    </>
  );
}
