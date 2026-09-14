import { Descriptions } from "antd";
import dayjs from "dayjs";
import type { BookingDraft, Room } from "../../types";
import styles from "./Booking.module.css";
export function BookingSummary({
  draft,
  room,
}: {
  draft: BookingDraft;
  room?: Room;
}) {
  return (
    <Descriptions
      column={1}
      className={styles.summary}
      items={[
        {
          key: "room",
          label: "ห้องเรียน",
          children: `${room?.code ?? ""} · ${room?.name ?? "ไม่พบห้อง"}`,
        },
        {
          key: "date",
          label: "วันที่ใช้งาน",
          children: dayjs(draft.date).format("DD MMMM YYYY"),
        },
        {
          key: "time",
          label: "เวลา",
          children: `${draft.start}–${draft.end} น.`,
        },
        {
          key: "attendees",
          label: "จำนวนผู้ใช้งาน",
          children: `${draft.attendees} คน`,
        },
        { key: "purpose", label: "วัตถุประสงค์", children: draft.purpose },
        {
          key: "equipment",
          label: "อุปกรณ์",
          children: draft.equipment.join(", ") || "ไม่ระบุ",
        },
        { key: "note", label: "หมายเหตุ", children: draft.note || "—" },
      ]}
    />
  );
}
