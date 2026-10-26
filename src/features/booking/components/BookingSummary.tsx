import { Descriptions } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { BookingDraft, Room } from "../../../shared/types/index";
import styles from "../styles/Booking.module.css";
/**
 * แสดงสรุป draft กับข้อมูลห้องที่โหลดแยก โดยจัดวันที่และหัวข้อตามภาษาปัจจุบัน
 */
export function BookingSummary({
  draft,
  room,
}: {
  draft: BookingDraft;
  room?: Room;
}) {
  const { t } = useTranslation();
  return (
    <Descriptions
      column={1}
      className={styles.summary}
      items={[
        {
          key: "room",
          label: t("bookingSummaryRoom"),
          children: `${room?.code ?? ""} · ${room?.name ?? t("bookingSummaryRoomMissing")}`,
        },
        {
          key: "date",
          label: t("bookingSummaryDate"),
          children: dayjs(draft.date).format("DD MMMM YYYY"),
        },
        {
          key: "time",
          label: t("bookingSummaryTime"),
          children: `${draft.start}–${draft.end}`,
        },
        {
          key: "attendees",
          label: t("bookingSummaryAttendees"),
          children: t("bookingSummaryAttendeesValue", { count: draft.attendees }),
        },
        { key: "purpose", label: t("bookingSummaryPurpose"), children: draft.purpose },
        {
          key: "equipment",
          label: t("bookingSummaryEquipment"),
          children: draft.equipment.join(", ") || t("bookingSummaryUnspecified"),
        },
        { key: "note", label: t("bookingSummaryNote"), children: draft.note || "—" },
      ]}
    />
  );
}
