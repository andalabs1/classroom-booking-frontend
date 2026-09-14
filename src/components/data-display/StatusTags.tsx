import { Tag } from "antd";
import type { BookingStatus, Room } from "../../types";
import { bookingColors, bookingLabels } from "../../constants/bookingStatus";
export function BookingStatusTag({ status }: { status: BookingStatus }) {
  return (
    <Tag color={bookingColors[status]} variant="filled">
      {bookingLabels[status]}
    </Tag>
  );
}
export function RoomStatusTag({
  status,
  busy = false,
}: {
  status: Room["status"];
  busy?: boolean;
}) {
  return (
    <Tag
      variant="filled"
      color={
        status === "ACTIVE"
          ? busy
            ? "orange"
            : "green"
          : status === "MAINTENANCE"
            ? "gold"
            : "default"
      }
    >
      ● &nbsp;
      {status === "ACTIVE"
        ? busy
          ? "มีการใช้งาน"
          : "ว่าง"
        : status === "MAINTENANCE"
          ? "ปิดปรับปรุง"
          : "ไม่พร้อมใช้งาน"}
    </Tag>
  );
}
