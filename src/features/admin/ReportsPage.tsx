import { useState } from "react";
import { Button, DatePicker, Select } from "antd";
import { Download } from "lucide-react";
import dayjs from "dayjs";
import { adminApi } from "../../api/admin";
import { useAdminClassrooms, useAdminReports } from "../../services/queries";
import { PageHeader, Panel, QueryState, DataTable } from "../../components/common/Common";
import { bookingLabels } from "../../constants/bookingStatus";
import type { BookingStatus } from "../../types";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";

export function ReportsPage() {
  const [range, setRange] = useState<[string, string]>([dayjs().subtract(14, "day").format("YYYY-MM-DD"), dayjs().add(7, "day").format("YYYY-MM-DD")]);
  const [roomId, setRoomId] = useState<string>();
  const [status, setStatus] = useState<BookingStatus>();
  const filters = { startDate: range[0], endDate: range[1], classroomId: roomId, status };
  const query = useAdminReports(filters);
  const rooms = useAdminClassrooms({ limit: 100 });
  const download = async () => {
    const blob = await adminApi.exportBookings(filters);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "booking-report.csv"; link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader title="รายงานและสถิติ" subtitle="วิเคราะห์แนวโน้มการจอง และการใช้พื้นที่การเรียนรู้" action={<Button icon={<Download size={16} />} onClick={() => void download()}>Export CSV</Button>} />
      <QueryState isLoading={query.isLoading || rooms.isLoading} error={query.error ?? rooms.error} retry={() => { void query.refetch(); void rooms.refetch(); }}>
        <Panel>
          <div className={styles.filters}>
            <DatePicker.RangePicker value={[dayjs(range[0]), dayjs(range[1])]} allowClear={false} onChange={(value) => value?.[0] && value?.[1] && setRange([value[0].format("YYYY-MM-DD"), value[1].format("YYYY-MM-DD")])} />
            <Select allowClear placeholder="ทุกห้อง" value={roomId} onChange={setRoomId} options={rooms.data?.items.map((room) => ({ value: room.id, label: room.code }))} />
            <Select allowClear placeholder="ทุกสถานะ" value={status} onChange={setStatus} options={Object.entries(bookingLabels).map(([value, label]) => ({ value, label }))} />
          </div>
        </Panel>
        <div className={`${styles.metrics} ${styles.reportMetrics}`}>
          {[
            { label: "จำนวนการจองทั้งหมด", value: query.data?.bookings.total }, { label: "จำนวนผู้ใช้งาน", value: query.data?.summary.users }, { label: "จำนวนห้องเรียน", value: query.data?.summary.classrooms },
            { label: "รายการรออนุมัติ", value: query.data?.bookings.byStatus.find((item) => item.status === "PENDING")?._count._all ?? 0 }, { label: "ห้องที่ถูกจองสูงสุด", value: query.data?.classrooms[0]?.classroom.code ?? "—" },
          ].map((metric) => <div className={styles.metric} key={metric.label}><span>{metric.label}</span><strong>{metric.value ?? 0}</strong></div>)}
        </div>
        {query.data && <><Analytics bookings={query.data.bookings.rows} rooms={rooms.data?.items ?? []} start={range[0]} end={range[1]} report />
          <div className={styles.charts}>
            <Panel><h2 className={styles.chartTitle}>การใช้ห้อง</h2><DataTable dataSource={query.data.classrooms} pagination={false} columns={[{ title: "ห้อง", render: (_, row) => row.classroom.code }, { title: "จำนวนการจอง", dataIndex: "bookingCount" }, { title: "ชั่วโมง", dataIndex: "totalHours" }]} /></Panel>
            <Panel><h2 className={styles.chartTitle}>ผู้จองสูงสุด</h2><DataTable dataSource={query.data.users} pagination={false} columns={[{ title: "ผู้ใช้", render: (_, row) => row.user?.name ?? "—" }, { title: "จำนวนการจอง", dataIndex: "bookingCount" }]} /></Panel>
          </div>
        </>}
      </QueryState>
    </>
  );
}
