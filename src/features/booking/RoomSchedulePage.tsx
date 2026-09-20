import { useMemo, useState } from "react";
import { App, Button, DatePicker, Segmented, Select } from "antd";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { classroomsApi } from "../../api/classrooms";
import { useClassrooms, useClassroomSchedule } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { overlaps } from "../../utils/bookingRules";
import { getBookingLabels } from "../../constants/bookingStatus";
import { getThaiImportantDays } from "../../constants/thaiImportantDays";
import styles from "./Booking.module.css";

type ScheduleView = "day" | "week" | "month";

function getScheduleRange(date: dayjs.Dayjs, view: ScheduleView) {
  const start = view === "day" ? date.startOf("day") : date.startOf(view);
  const end = view === "day" ? date.endOf("day") : date.endOf(view);
  return { start, end };
}

export function RoomSchedulePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [roomId, setRoomId] = useState(params.get("room") || "");
  const [date, setDate] = useState(dayjs());
  const [view, setView] = useState<ScheduleView>("day");
  const [checkingSlot, setCheckingSlot] = useState("");
  const roomsQuery = useClassrooms({ limit: 100 });
  const navigate = useNavigate();
  const { message } = App.useApp();
  const rooms = roomsQuery.data?.items ?? [];
  const selectedRoomId = roomId || rooms[0]?.id || "";
  const range = useMemo(() => getScheduleRange(date, view), [date, view]);
  const visibleDays = useMemo(
    () =>
      Array.from(
        { length: range.end.diff(range.start, "day") + 1 },
        (_, index) => range.start.add(index, "day"),
      ),
    [range.end, range.start],
  );
  const calendarDays = useMemo(
    () =>
      view === "month"
        ? [...Array<dayjs.Dayjs | null>(range.start.day()).fill(null), ...visibleDays]
        : visibleDays,
    [range.start, view, visibleDays],
  );
  const scheduleQuery = useClassroomSchedule(
    selectedRoomId
      ? {
          startAt: range.start.toISOString(),
          endAt: range.end.add(1, "day").startOf("day").toISOString(),
          classroomIds: [selectedRoomId],
        }
      : undefined,
  );
  const room = rooms.find((item) => item.id === selectedRoomId);
  const schedule = scheduleQuery.data?.rooms.find(
    (item) => item.id === selectedRoomId,
  );
  const bookingLabels = getBookingLabels(t);
  const weekdayLabels = [
    t("roomScheduleSunday"),
    t("roomScheduleMonday"),
    t("roomScheduleTuesday"),
    t("roomScheduleWednesday"),
    t("roomScheduleThursday"),
    t("roomScheduleFriday"),
    t("roomScheduleSaturday"),
  ];
  const selectSlot = async (start: string, end: string) => {
    const slotId = `${start}-${end}`;
    setCheckingSlot(slotId);
    try {
      const result = await classroomsApi.availabilityForRoom(selectedRoomId, {
        startAt: dayjs(`${date.format("YYYY-MM-DD")}T${start}`).toISOString(),
        endAt: dayjs(`${date.format("YYYY-MM-DD")}T${end}`).toISOString(),
      });
      if (!result.available) {
        void message.error(t("roomScheduleConflict"));
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
        title={t("roomScheduleTitle")}
        subtitle={t("roomScheduleSubtitle")}
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
              aria-label={t("roomScheduleSelectRoom")}
              value={selectedRoomId || undefined}
              onChange={setRoomId}
              options={rooms.map((r) => ({
                value: r.id,
                label: `${r.code} · ${r.name}`,
              }))}
            />
            <Button
              aria-label={t("roomSchedulePrevious")}
              icon={<ArrowLeft size={16} />}
              onClick={() => setDate(date.subtract(1, view))}
            />
            <DatePicker
              aria-label={t("roomScheduleDate")}
              value={date}
              allowClear={false}
              onChange={(value) => value && setDate(value)}
              picker={view === "month" ? "month" : undefined}
              format={view === "month" ? "MMM YYYY" : "DD MMM YYYY"}
            />
            <Button
              aria-label={t("roomScheduleNext")}
              icon={<ArrowRight size={16} />}
              onClick={() => setDate(date.add(1, view))}
            />
            <Button onClick={() => setDate(dayjs())}>{t("roomScheduleToday")}</Button>
            <Segmented
              aria-label={t("roomScheduleView")}
              value={view}
              onChange={(value) => setView(value as ScheduleView)}
              options={[
                { value: "day", label: t("adminDaily") },
                { value: "week", label: t("adminWeekly") },
                { value: "month", label: t("adminMonthly") },
              ]}
            />
          </div>
          <h2>
            {room?.name} {room?.code}
          </h2>
          <p className={styles.hint}>
            {room?.building} · {t("roomScheduleFloor")} {room?.floor} · {room?.capacity} {t("roomScheduleSeats")}
          </p>
          <div className={styles.legend}>
            <span>
              <i />
              {t("roomScheduleAvailable")}
            </span>
            <span>
              <i />
              {t("roomScheduleBooked")}
            </span>
            <span>
              <i />
              {t("roomSchedulePending")}
            </span>
            <span>
              <i className={styles.importantDot} />
              {t("roomScheduleImportantDay")}
            </span>
          </div>
          {view === "day" ? Array.from({ length: 12 }, (_, i) => {
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
                    {past ? t("roomSchedulePast") : t("roomScheduleUnavailable")}
                  </div>
                ) : (
                  <button
                    disabled={checkingSlot === `${start}-${end}`}
                    onClick={() => void selectSlot(start, end)}
                  >
                    <span>
                      {checkingSlot === `${start}-${end}`
                        ? t("roomScheduleChecking")
                        : t("roomScheduleBookSlot")}
                    </span>
                    <Plus size={16} />
                  </button>
                )}
              </div>
            );
          }) : (
            <div className={styles.scheduleCalendarScroll}>
              <div className={styles.scheduleCalendar}>
                {weekdayLabels.map((label) => (
                  <span className={styles.scheduleWeekday} key={label}>{label}</span>
                ))}
                {calendarDays.map((day, index) => {
                  if (!day) return <span aria-hidden="true" className={styles.scheduleCalendarBlank} key={`blank-${index}`} />;
                  const bookings = schedule?.bookings.filter((booking) =>
                    dayjs(booking.startAt).isSame(day, "day"),
                  ) ?? [];
                  const isToday = day.isSame(dayjs(), "day");
                  const isWeekend = day.day() === 0 || day.day() === 6;
                  const importantDays = getThaiImportantDays(day.format("YYYY-MM-DD"));
                  return (
                    <button
                      className={`${styles.scheduleDayCard} ${isToday ? styles.scheduleToday : ""} ${isWeekend ? styles.scheduleWeekend : ""}`}
                      key={day.format("YYYY-MM-DD")}
                      type="button"
                      onClick={() => {
                        setDate(day);
                        setView("day");
                      }}
                      title={t("roomScheduleOpenDaily")}
                    >
                      <span className={styles.scheduleDayDate}>{day.date()}</span>
                      {importantDays.map((importantDay) => (
                        <span className={styles.scheduleImportantDay} key={importantDay.labelKey}>
                          {t(importantDay.labelKey)}
                        </span>
                      ))}
                      {room?.status !== "ACTIVE" ? (
                        <span className={styles.unavailable}>{t("roomScheduleUnavailable")}</span>
                      ) : bookings.length ? (
                        <span className={styles.scheduleEvents}>
                          {bookings.map((booking) => (
                            <span className={booking.status === "PENDING" ? styles.scheduleEventPending : styles.scheduleEvent} key={booking.id}>
                              {dayjs(booking.startAt).format("HH:mm")}–{dayjs(booking.endAt).format("HH:mm")} · {bookingLabels[booking.status]}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className={styles.scheduleFree}>{t("roomScheduleAvailable")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      </QueryState>
    </>
  );
}
