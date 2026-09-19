import { Tag } from "antd";
import { useTranslation } from "react-i18next";
import type { BookingStatus, Room } from "../../types";
import { bookingColors, getBookingLabels } from "../../constants/bookingStatus";
export function BookingStatusTag({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return (
    <Tag color={bookingColors[status]} variant="filled">
      {getBookingLabels(t)[status]}
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
  const { t } = useTranslation();
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
          ? t("roomBusy")
          : t("roomVacant")
        : status === "MAINTENANCE"
          ? t("adminMaintenance")
          : t("adminInactive")}
    </Tag>
  );
}
