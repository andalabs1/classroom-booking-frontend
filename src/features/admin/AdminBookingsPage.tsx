import { useDeferredValue, useState } from "react";
import { App, Badge, Button, DatePicker, Form, Input, Modal, Select, Timeline, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { CircleCheck, CircleX, Eye, Play, SquareCheckBig, UserX, X } from "lucide-react";
import { adminApi, type AdminBooking } from "../../api/admin";
import { useAction, useAdminBooking, useAdminBookings, useAdminClassrooms } from "../../services/queries";
import { getBookingLabels } from "../../constants/bookingStatus";
import type { BookingStatus } from "../../types";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Admin.module.css";

type NoteAction = "reject" | "cancel" | "no-show";

export function AdminBookingsPage() {
  const { t } = useTranslation();
  const bookingLabels = getBookingLabels(t);
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<BookingStatus>();
  const [roomId, setRoomId] = useState<string>();
  const [range, setRange] = useState<[string, string]>();
  const [detailId, setDetailId] = useState<string>();
  const [noteAction, setNoteAction] = useState<{ id: string; action: NoteAction }>();
  const [note, setNote] = useState("");
  const query = useAdminBookings(
    { search: deferredSearch || undefined, status, classroomId: roomId, startDate: range?.[0], endDate: range?.[1], limit: 100 },
    { live: true },
  );
  const rooms = useAdminClassrooms({ limit: 100 });
  const detail = useAdminBooking(detailId);
  const change = useAction(
    ({ id, action, note: value }: { id: string; action: "approve" | "reject" | "cancel" | "start" | "complete" | "no-show"; note?: string }) => {
      switch (action) {
        case "approve": return adminApi.approveBooking(id);
        case "reject": return adminApi.rejectBooking(id, value ?? "");
        case "cancel": return adminApi.cancelBooking(id, value ?? "");
        case "start": return adminApi.startBooking(id);
        case "complete": return adminApi.completeBooking(id);
        case "no-show": return adminApi.noShowBooking(id, value);
      }
    },
    t("adminBookingUpdated"),
  );
  const confirm = (booking: AdminBooking, action: "approve" | "start" | "complete") => modal.confirm({
    title: t("adminConfirmStatus"), content: `${booking.bookingCode} · ${booking.date} ${booking.start}–${booking.end}`,
    okText: t("adminConfirm"), cancelText: t("adminBack"), onOk: () => change.mutateAsync({ id: booking.id, action }),
  });

  return (
    <>
      <PageHeader title={t("adminBookings")} subtitle={t("adminBookingSubtitle")} />
      <QueryState isLoading={query.isLoading || rooms.isLoading} error={query.error ?? rooms.error} retry={() => { void query.refetch(); void rooms.refetch(); }}>
        <Panel>
          <div className={styles.filters}>
            <Input allowClear placeholder={t("adminSearchBookings")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select allowClear placeholder={t("adminAllRooms")} value={roomId} onChange={setRoomId} options={rooms.data?.items.map((room) => ({ value: room.id, label: `${room.code} · ${room.name}` }))} />
            <Select allowClear placeholder={t("adminAllStatuses")} value={status} onChange={setStatus} options={Object.entries(bookingLabels).map(([value, label]) => ({ value, label }))} />
            <DatePicker.RangePicker onChange={(value) => setRange(value?.[0] && value?.[1] ? [value[0].format("YYYY-MM-DD"), value[1].format("YYYY-MM-DD")] : undefined)} />
          </div>
          <div className={styles.liveStatus} aria-live="polite">
            <Badge status={query.isFetching ? "processing" : "success"} />
            {t("adminLiveUpdates")}
          </div>
          <DataTable<AdminBooking> dataSource={query.data?.items} columns={[
            { title: t("adminBookingId"), dataIndex: "bookingCode" },
            { title: t("adminBooker"), render: (_, booking) => booking.user?.name ?? booking.userId },
            { title: t("adminRoom"), render: (_, booking) => booking.classroom?.code ?? booking.roomId },
            { title: t("adminDate"), dataIndex: "date" }, { title: t("adminTime"), render: (_, booking) => `${booking.start}–${booking.end}` },
            { title: t("adminStatus"), render: (_, booking) => <BookingStatusTag status={booking.status} /> },
            { title: t("adminActions"), width: 250, render: (_, booking) => <div className={styles.actions}>
              <Tooltip title={t("adminViewBooking")}><Button size="small" aria-label={t("adminViewBooking")} icon={<Eye size={14} />} onClick={() => setDetailId(booking.id)} /></Tooltip>
              {booking.status === "PENDING" && <><Tooltip title={t("adminApprove")}><Button size="small" aria-label={t("adminApprove")} icon={<CircleCheck size={14} />} onClick={() => confirm(booking, "approve")} /></Tooltip><Tooltip title={t("adminReject")}><Button size="small" danger aria-label={t("adminReject")} icon={<CircleX size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "reject" }); setNote(""); }} /></Tooltip></>}
              {booking.status === "APPROVED" && <><Tooltip title={t("adminStart")}><Button size="small" aria-label={t("adminStart")} icon={<Play size={14} />} onClick={() => confirm(booking, "start")} /></Tooltip><Tooltip title={t("adminNoShow")}><Button size="small" aria-label={t("adminNoShow")} icon={<UserX size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "no-show" }); setNote(""); }} /></Tooltip></>}
              {booking.status === "IN_USE" && <Tooltip title={t("adminComplete")}><Button size="small" aria-label={t("adminComplete")} icon={<SquareCheckBig size={14} />} onClick={() => confirm(booking, "complete")} /></Tooltip>}
              {["PENDING", "APPROVED"].includes(booking.status) && <Tooltip title={t("adminCancel")}><Button size="small" danger aria-label={t("adminCancel")} icon={<X size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "cancel" }); setNote(""); }} /></Tooltip>}
            </div> },
          ]} />
        </Panel>
      </QueryState>
      <Modal open={Boolean(detailId)} title={t("adminBookingDetail")} onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>{t("adminClose")}</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <><p><strong>{detail.data.booking.bookingCode}</strong> · {detail.data.booking.user?.name ?? "—"}</p><BookingStatusTag status={detail.data.booking.status} /><Timeline items={detail.data.history.map((item) => ({ children: `${item.action} · ${item.user?.name ?? t("adminSystem")} · ${item.createdAt.slice(0, 16)}` }))} /></>}
        </QueryState>
      </Modal>
      <Modal open={Boolean(noteAction)} title={noteAction?.action === "reject" ? t("adminRejectBooking") : noteAction?.action === "cancel" ? t("adminCancelBooking") : t("adminNoShowReason")} onCancel={() => setNoteAction(undefined)} okText={t("adminConfirm")} cancelText={t("adminBack")} okButtonProps={{ danger: noteAction?.action !== "no-show", disabled: !note.trim(), loading: change.isPending }} onOk={() => noteAction && change.mutate({ id: noteAction.id, action: noteAction.action, note }, { onSuccess: () => setNoteAction(undefined) })}>
        <Form.Item label={t("adminReason")} required><Input.TextArea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} /></Form.Item>
      </Modal>
    </>
  );
}
