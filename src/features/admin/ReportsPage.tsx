import { useState } from "react";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { useDatabase } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { bookingLabels } from "../../constants/bookingStatus";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";
export function ReportsPage() {
  const query = useDatabase();
  const [range, setRange] = useState<[string, string]>([
    dayjs().subtract(14, "day").format("YYYY-MM-DD"),
    dayjs().add(7, "day").format("YYYY-MM-DD"),
  ]);
  const [room, setRoom] = useState<string>();
  const [building, setBuilding] = useState<string>();
  const [status, setStatus] = useState<string>();
  const rows = (query.data?.bookings ?? []).filter(
    (b) =>
      b.date >= range[0] &&
      b.date <= range[1] &&
      (!room || b.roomId === room) &&
      (!status || b.status === status) &&
      (!building ||
        query.data?.rooms.find((r) => r.id === b.roomId)?.building ===
          building),
  );
  const hours = rows
    .filter((b) => ["APPROVED", "COMPLETED"].includes(b.status))
    .reduce(
      (sum, b) =>
        sum +
        dayjs(`${b.date}T${b.end}`).diff(
          dayjs(`${b.date}T${b.start}`),
          "minute",
        ) /
          60,
      0,
    );
  return (
    <>
      <PageHeader
        title="รายงานและสถิติ"
        subtitle="วิเคราะห์แนวโน้มการจอง และการใช้พื้นที่การเรียนรู้"
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <Panel>
          <div className={styles.filters}>
            <DatePicker.RangePicker
              value={[dayjs(range[0]), dayjs(range[1])]}
              allowClear={false}
              onChange={(v) => {
                if (v?.[0] && v?.[1])
                  setRange([
                    v[0].format("YYYY-MM-DD"),
                    v[1].format("YYYY-MM-DD"),
                  ]);
              }}
            />
            <Select
              allowClear
              placeholder="ทุกห้อง"
              onChange={setRoom}
              options={query.data?.rooms.map((r) => ({
                value: r.id,
                label: r.code,
              }))}
            />
            <Select
              allowClear
              placeholder="ทุกอาคาร"
              onChange={setBuilding}
              options={[
                ...new Set(query.data?.rooms.map((r) => r.building)),
              ].map((value) => ({ value, label: value }))}
            />
            <Select
              allowClear
              placeholder="ทุกสถานะ"
              onChange={setStatus}
              options={Object.entries(bookingLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <p className={styles.reportHint}>
            ชั่วโมงการใช้ห้องรวมเฉพาะรายการอนุมัติและเสร็จสิ้น ·
            กราฟรายวันแสดงได้สูงสุด 366 วัน
          </p>
        </Panel>
        <div className={`${styles.metrics} ${styles.reportMetrics}`}>
          {[
            { label: "จำนวนการจองทั้งหมด", value: rows.length },
            {
              label: "อนุมัติแล้ว",
              value: rows.filter((b) => b.status === "APPROVED").length,
            },
            {
              label: "ไม่อนุมัติ",
              value: rows.filter((b) => b.status === "REJECTED").length,
            },
            {
              label: "ยกเลิก",
              value: rows.filter((b) => b.status === "CANCELLED").length,
            },
            { label: "ชั่วโมงการใช้ห้องทั้งหมด", value: hours },
          ].map((m) => (
            <div className={styles.metric} key={m.label}>
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </div>
          ))}
        </div>
        <Analytics
          bookings={rows}
          rooms={query.data?.rooms ?? []}
          start={range[0]}
          end={range[1]}
          report
        />
      </QueryState>
    </>
  );
}
