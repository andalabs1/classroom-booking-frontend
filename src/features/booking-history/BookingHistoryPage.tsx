import { useState } from "react";
import { App, Button, DatePicker, Modal, Select, Space, Tooltip } from "antd";
import dayjs from "dayjs";
import { CheckCircle, Eye, Pencil, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookingsApi } from "../../api/bookings";
import { useBooking, useMyBookings, useAction } from "../../services/queries";
import type { Booking } from "../../types";
import { getBookingLabels } from "../../constants/bookingStatus";
import { canChangeBooking } from "../../utils/bookingRules";
import {
  PageHeader,
  Panel,
  DataTable,
  QueryState,
} from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import { BookingSummary } from "../booking/BookingSummary";
import styles from "../booking/Booking.module.css";
export function BookingHistoryPage() {
  const { t } = useTranslation();
  const query = useMyBookings();
  const [status, setStatus] = useState<string>();
  const [roomId, setRoomId] = useState<string>();
  const [range, setRange] = useState<[string, string]>();
  const [selectedLocal, setSelected] = useState<Booking>();
  const [params, setParams] = useSearchParams();
  const selected =
    selectedLocal ??
    query.data?.items.find((b) => b.id === params.get("booking"));
  const bookingQuery = useBooking(selected?.id);
  const closeDetails = () => {
    setSelected(undefined);
    const next = new URLSearchParams(params);
    next.delete("booking");
    setParams(next, { replace: true });
  };
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const cancel = useAction(
    (id: string) => bookingsApi.cancel(id),
    t("bookingCancelledSuccess"),
  );
  const checkIn = useAction(
    (id: string) => bookingsApi.checkIn(id),
    t("bookingCheckinSuccess"),
  );
  const rows = query.data?.items
    .filter(
      (b) =>
        (!status || b.status === status) &&
        (!roomId || b.roomId === roomId) &&
        (!range || (b.date >= range[0] && b.date <= range[1])),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader
        title={t("history")}
        subtitle={t("historySubtitle")}
        action={
          <Button type="primary" onClick={() => navigate("/booking")}>
            {t("bookingCreateTitle")}
          </Button>
        }
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <Panel>
          <div className={styles.filterRow}>
            <DatePicker.RangePicker
              onChange={(v) =>
                setRange(
                  v?.[0] && v?.[1]
                    ? [v[0].format("YYYY-MM-DD"), v[1].format("YYYY-MM-DD")]
                    : undefined,
                )
              }
            />
            <Select
              allowClear
              placeholder={t("historyAllRooms")}
              value={roomId}
              onChange={setRoomId}
              options={query.data?.items.flatMap((booking) =>
                booking.room
                  ? [{ value: booking.room.id, label: booking.room.code }]
                  : [],
              )}
            />
            <Select
              allowClear
              placeholder={t("historyAllStatuses")}
              value={status}
              onChange={setStatus}
              options={Object.entries(getBookingLabels(t)).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <DataTable<Booking>
            dataSource={rows}
            columns={[
              { title: t("historyBookingId"), dataIndex: "id", width: 240 },
              {
                title: t("historyRoom"),
                render: (_, b) =>
                  b.room?.code,
              },
              {
                title: t("historyDate"),
                dataIndex: "date",
                render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
              },
              { title: t("historyTime"), render: (_, b) => `${b.start}–${b.end}` },
              {
                title: t("historyCreatedAt"),
                dataIndex: "createdAt",
                render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
              },
              {
                title: t("historyStatus"),
                render: (_, b) => <BookingStatusTag status={b.status} />,
              },
              {
                title: t("historyActions"),
                render: (_, b) => (
                  <Space>
                    <Tooltip title={t("historyView")}>
                      <Button
                        size="small"
                        aria-label={t("historyView")}
                        icon={<Eye size={14} />}
                        onClick={() => setSelected(b)}
                      />
                    </Tooltip>
                    {canChangeBooking(b) && (
                      <>
                        {b.status === "PENDING" && (
                          <Tooltip title={t("historyEdit")}>
                            <Button
                              size="small"
                              aria-label={t("historyEdit")}
                              icon={<Pencil size={14} />}
                              onClick={() =>
                                navigate("/booking", {
                                  state: { draft: { ...b, editingId: b.id } },
                                })
                              }
                            />
                          </Tooltip>
                        )}
                        <Tooltip title={t("historyCancel")}>
                          <Button
                            size="small"
                            danger
                            aria-label={t("historyCancel")}
                            icon={<X size={14} />}
                            onClick={() =>
                              modal.confirm({
                                title: t("historyCancelConfirm"),
                                content: `${b.id} · ${b.date}`,
                                okText: t("historyCancelOk"),
                                cancelText: t("historyCancelBack"),
                                onOk: () => cancel.mutateAsync(b.id),
                              })
                            }
                          />
                        </Tooltip>
                      </>
                    )}
                    {b.status === "APPROVED" && (
                      <Tooltip title={t("historyCheckin")}>
                        <Button
                          size="small"
                          aria-label={t("historyCheckin")}
                          icon={<CheckCircle size={14} />}
                          loading={checkIn.isPending}
                          onClick={() => checkIn.mutate(b.id)}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Panel>
      </QueryState>
      <Modal
        open={!!selected}
        onCancel={closeDetails}
        title={selected?.id}
        footer={<Button onClick={closeDetails}>{t("historyClose")}</Button>}
      >
        {selected && (
          <>
            <BookingStatusTag status={bookingQuery.data?.status ?? selected.status} />
            <BookingSummary
              draft={bookingQuery.data ?? selected}
              room={bookingQuery.data?.room ?? selected.room}
            />
            {(bookingQuery.data?.reason ?? selected.reason) && (
              <p>{t("historyReason", { reason: bookingQuery.data?.reason ?? selected.reason })}</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
