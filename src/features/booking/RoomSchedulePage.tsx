import { useState } from "react";
import { App, Button, DatePicker, Select } from "antd";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { classroomsApi } from "../../api/classrooms";
import { useClassrooms, useClassroomSchedule } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { overlaps } from "../../utils/bookingRules";
import { bookingLabels } from "../../constants/bookingStatus";
import styles from "./Booking.module.css";
export function RoomSchedulePage() {
  const [params] = useSearchParams();
  const [roomId, setRoomId] = useState(params.get("room") || "");
  const [date, setDate] = useState(dayjs());
  const [checkingSlot, setCheckingSlot] = useState("");
  const roomsQuery = useClassrooms({ limit: 100 });
  const navigate = useNavigate();
  const { message } = App.useApp();
  const rooms = roomsQuery.data?.items ?? [];
  const selectedRoomId = roomId || rooms[0]?.id || "";
  const scheduleQuery = useClassroomSchedule(
    selectedRoomId
      ? {
          startAt: date.startOf("day").toISOString(),
          endAt: date.endOf("day").toISOString(),
          classroomIds: [selectedRoomId],
        }
      : undefined,
  );
  const room = rooms.find((item) => item.id === selectedRoomId);
  const schedule = scheduleQuery.data?.rooms.find(
    (item) => item.id === selectedRoomId,
  );
  const selectSlot = async (start: string, end: string) => {
    const slotId = `${start}-${end}`;
    setCheckingSlot(slotId);
    try {
      const result = await classroomsApi.availabilityForRoom(selectedRoomId, {
        startAt: dayjs(`${date.format("YYYY-MM-DD")}T${start}`).toISOString(),
        endAt: dayjs(`${date.format("YYYY-MM-DD")}T${end}`).toISOString(),
      });
      if (!result.available) {
        void message.error("ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาอื่น");
        void scheduleQuery.refetch();
        return;
      }
      navigate(
        `/booking?room=${selectedRoomId}&date=${date.format("YYYY-MM-DD")}&start=${start}&end=${end}`,
      );
    } catch (error) {
      void message.error((error as Error).message);
    } finally {
      setCheckingSlot("");
    }
  };
  return (
    <>
      <PageHeader
        title="ตารางการใช้ห้อง"
        subtitle="ตรวจสอบเวลาว่าง และเลือกช่วงเวลาที่ต้องการใช้งาน"
      />
      <QueryState
        isLoading={roomsQuery.isLoading || scheduleQuery.isLoading}
        error={roomsQuery.error ?? scheduleQuery.error}
        retry={() => {
          void roomsQuery.refetch();
          void scheduleQuery.refetch();
        }}
      >
        <Panel>
          <div className={styles.scheduleTools}>
            <Select
              aria-label="ห้องเรียน"
              value={selectedRoomId || undefined}
              onChange={setRoomId}
              options={rooms.map((r) => ({
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
            const booking = schedule?.bookings.find(
              (b) =>
                overlaps(
                  start,
                  end,
                  dayjs(b.startAt).format("HH:mm"),
                  dayjs(b.endAt).format("HH:mm"),
                ),
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
                    {bookingLabels[booking.status]} · {dayjs(booking.startAt).format("HH:mm")}–
                    {dayjs(booking.endAt).format("HH:mm")}
                  </div>
                ) : room?.status !== "ACTIVE" || past ? (
                  <div className={`${styles.occupied} ${styles.unavailable}`}>
                    {past ? "พ้นช่วงเวลาจอง" : "ไม่พร้อมใช้งาน"}
                  </div>
                ) : (
                  <button
                    disabled={checkingSlot === `${start}-${end}`}
                    onClick={() => void selectSlot(start, end)}
                  >
                    <span>
                      {checkingSlot === `${start}-${end}`
                        ? "กำลังตรวจสอบ..."
                        : "ว่าง · จองช่วงเวลานี้"}
                    </span>
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
