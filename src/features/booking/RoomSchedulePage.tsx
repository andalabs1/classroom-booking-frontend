import { useState } from "react";
import { Button, DatePicker, Select } from "antd";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDatabase } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { overlaps } from "../../utils/bookingRules";
import { bookingLabels } from "../../constants/bookingStatus";
import styles from "./Booking.module.css";
export function RoomSchedulePage() {
  const [params] = useSearchParams();
  const [roomId, setRoomId] = useState(params.get("room") || "room-1");
  const [date, setDate] = useState(dayjs());
  const query = useDatabase();
  const navigate = useNavigate();
  const room = query.data?.rooms.find((r) => r.id === roomId);
  return (
    <>
      <PageHeader
        title="ตารางการใช้ห้อง"
        subtitle="ตรวจสอบเวลาว่าง และเลือกช่วงเวลาที่ต้องการใช้งาน"
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <Panel>
          <div className={styles.scheduleTools}>
            <Select
              aria-label="ห้องเรียน"
              value={roomId}
              onChange={setRoomId}
              options={query.data?.rooms.map((r) => ({
                value: r.id,
                label: `${r.code} · ${r.name}`,
              }))}
            />
            <Button
              aria-label="วันก่อนหน้า"
              icon={<ArrowLeft size={16} />}
              onClick={() => setDate(date.subtract(1, "day"))}
            />
            <DatePicker
              aria-label="วันที่"
              value={date}
              allowClear={false}
              onChange={(value) => value && setDate(value)}
              format="DD MMM YYYY"
            />
            <Button
              aria-label="วันถัดไป"
              icon={<ArrowRight size={16} />}
              onClick={() => setDate(date.add(1, "day"))}
            />
            <Button onClick={() => setDate(dayjs())}>วันนี้</Button>
          </div>
          <h2>
            {room?.name} {room?.code}
          </h2>
          <p className={styles.hint}>
            {room?.building} · ชั้น {room?.floor} · {room?.capacity} ที่นั่ง
          </p>
          <div className={styles.legend}>
            <span>
              <i />
              ว่าง
            </span>
            <span>
              <i />
              ถูกจอง
            </span>
            <span>
              <i />
              อยู่ระหว่างอนุมัติ
            </span>
          </div>
          {Array.from({ length: 12 }, (_, i) => {
            const start = `${String(i + 8).padStart(2, "0")}:00`;
            const end = `${String(i + 9).padStart(2, "0")}:00`;
            const booking = query.data?.bookings.find(
              (b) =>
                b.roomId === roomId &&
                b.date === date.format("YYYY-MM-DD") &&
                (["PENDING", "APPROVED"].includes(b.status) ||
                  (b.status === "COMPLETED" &&
                    dayjs(`${b.date}T${b.end}`).isBefore(dayjs()))) &&
                overlaps(start, end, b.start, b.end),
            );
            const past = dayjs(
              `${date.format("YYYY-MM-DD")}T${start}`,
            ).isBefore(dayjs());
            return (
              <div className={styles.slot} key={start}>
                <span className={styles.slotTime}>
                  {start} – {end}
                </span>
                {booking ? (
                  <div
                    className={`${styles.occupied} ${booking.status === "PENDING" ? styles.pending : ""}`}
                  >
                    {bookingLabels[booking.status]} · {booking.start}–
                    {booking.end}
                  </div>
                ) : room?.status !== "ACTIVE" || past ? (
                  <div className={`${styles.occupied} ${styles.unavailable}`}>
                    {past ? "พ้นช่วงเวลาจอง" : "ไม่พร้อมใช้งาน"}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      navigate(
                        `/booking?room=${roomId}&date=${date.format("YYYY-MM-DD")}&start=${start}&end=${end}`,
                      )
                    }
                  >
                    <span>ว่าง · จองช่วงเวลานี้</span>
                    <Plus size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </Panel>
      </QueryState>
    </>
  );
}
