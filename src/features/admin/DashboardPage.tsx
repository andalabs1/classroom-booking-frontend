import dayjs from "dayjs";
import { Button } from "antd";
import { Link } from "react-router-dom";
import { useDatabase } from "../../services/queries";
import {
  DataTable,
  PageHeader,
  Panel,
  QueryState,
} from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import type { Booking } from "../../types";
import { Analytics } from "./Analytics";
import styles from "./Admin.module.css";
export function DashboardPage() {
  const query = useDatabase();
  const db = query.data;
  const bookings = db?.bookings ?? [];
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`ภาพรวมการใช้ห้องเรียน · ${dayjs().format("DD MMMM YYYY")}`}
        action={
          <Link to="/admin/bookings">
            <Button type="primary">จัดการการจอง</Button>
          </Link>
        }
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <div className={styles.metrics}>
          {[
            { label: "จำนวนห้องเรียนทั้งหมด", value: db?.rooms.length },
            {
              label: "จำนวนการจองวันนี้",
              value: bookings.filter(
                (b) => b.date === dayjs().format("YYYY-MM-DD"),
              ).length,
            },
            {
              label: "รายการรออนุมัติ",
              value: bookings.filter((b) => b.status === "PENDING").length,
            },
            { label: "ผู้ใช้งานทั้งหมด", value: db?.users.length },
          ].map((m) => (
            <div className={styles.metric} key={m.label}>
              <span>{m.label}</span>
              <strong>{m.value ?? 0}</strong>
            </div>
          ))}
        </div>
        <Analytics
          bookings={bookings}
          rooms={db?.rooms ?? []}
          start={dayjs().subtract(6, "day").format("YYYY-MM-DD")}
          end={dayjs().format("YYYY-MM-DD")}
        />
        <Panel>
          <h2>การจองล่าสุด</h2>
          <DataTable<Booking>
            dataSource={[...bookings]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 8)}
            columns={[
              { title: "Booking ID", dataIndex: "id" },
              {
                title: "ผู้จอง",
                render: (_, b) =>
                  db?.users.find((u) => u.id === b.userId)?.firstName,
              },
              {
                title: "ห้อง",
                render: (_, b) =>
                  db?.rooms.find((r) => r.id === b.roomId)?.code,
              },
              { title: "วันที่", dataIndex: "date" },
              { title: "เวลา", render: (_, b) => `${b.start}–${b.end}` },
              {
                title: "สถานะ",
                render: (_, b) => <BookingStatusTag status={b.status} />,
              },
            ]}
          />
        </Panel>
      </QueryState>
    </>
  );
}
