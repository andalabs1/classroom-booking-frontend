import { useDeferredValue, useState } from "react";
import { App, Button, DatePicker, Form, Input, Modal, Select, Timeline } from "antd";
import { CircleCheck, CircleX, Eye, Play, SquareCheckBig, UserX, X } from "lucide-react";
import { adminApi, type AdminBooking } from "../../api/admin";
import { useAction, useAdminBooking, useAdminBookings, useAdminClassrooms } from "../../services/queries";
import { bookingLabels } from "../../constants/bookingStatus";
import type { BookingStatus } from "../../types";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Admin.module.css";

type NoteAction = "reject" | "cancel" | "no-show";

export function AdminBookingsPage() {
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<BookingStatus>();
  const [roomId, setRoomId] = useState<string>();
  const [range, setRange] = useState<[string, string]>();
  const [detailId, setDetailId] = useState<string>();
  const [noteAction, setNoteAction] = useState<{ id: string; action: NoteAction }>();
  const [note, setNote] = useState("");
  const query = useAdminBookings({ search: deferredSearch || undefined, status, classroomId: roomId, startDate: range?.[0], endDate: range?.[1], limit: 100 });
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
    "อัปเดตสถานะการจองสำเร็จ",
  );
  const confirm = (booking: AdminBooking, action: "approve" | "start" | "complete") => modal.confirm({
    title: "ยืนยันการเปลี่ยนสถานะ?", content: `${booking.bookingCode} · ${booking.date} ${booking.start}–${booking.end}`,
    okText: "ยืนยัน", cancelText: "กลับ", onOk: () => change.mutateAsync({ id: booking.id, action }),
  });

  return (
    <>
      <PageHeader title="จัดการการจอง" subtitle="ตรวจสอบคำขอ อนุมัติ และติดตามการใช้ห้องเรียน" />
      <QueryState isLoading={query.isLoading || rooms.isLoading} error={query.error ?? rooms.error} retry={() => { void query.refetch(); void rooms.refetch(); }}>
        <Panel>
          <div className={styles.filters}>
            <Input allowClear placeholder="ค้นหารหัสการจอง ผู้จอง หรือห้อง" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select allowClear placeholder="ทุกห้อง" value={roomId} onChange={setRoomId} options={rooms.data?.items.map((room) => ({ value: room.id, label: `${room.code} · ${room.name}` }))} />
            <Select allowClear placeholder="ทุกสถานะ" value={status} onChange={setStatus} options={Object.entries(bookingLabels).map(([value, label]) => ({ value, label }))} />
            <DatePicker.RangePicker onChange={(value) => setRange(value?.[0] && value?.[1] ? [value[0].format("YYYY-MM-DD"), value[1].format("YYYY-MM-DD")] : undefined)} />
          </div>
          <DataTable<AdminBooking> dataSource={query.data?.items} columns={[
            { title: "Booking ID", dataIndex: "bookingCode" },
            { title: "ผู้จอง", render: (_, booking) => booking.user?.name ?? booking.userId },
            { title: "ห้อง", render: (_, booking) => booking.classroom?.code ?? booking.roomId },
            { title: "วันที่", dataIndex: "date" }, { title: "เวลา", render: (_, booking) => `${booking.start}–${booking.end}` },
            { title: "สถานะ", render: (_, booking) => <BookingStatusTag status={booking.status} /> },
            { title: "การดำเนินการ", width: 250, render: (_, booking) => <div className={styles.actions}>
              <Button size="small" aria-label="ดูรายละเอียดการจอง" icon={<Eye size={14} />} onClick={() => setDetailId(booking.id)} />
              {booking.status === "PENDING" && <><Button size="small" aria-label="อนุมัติ" icon={<CircleCheck size={14} />} onClick={() => confirm(booking, "approve")} /><Button size="small" danger aria-label="ปฏิเสธ" icon={<CircleX size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "reject" }); setNote(""); }} /></>}
              {booking.status === "APPROVED" && <><Button size="small" aria-label="เริ่มใช้งาน" icon={<Play size={14} />} onClick={() => confirm(booking, "start")} /><Button size="small" aria-label="ไม่เข้าใช้งาน" icon={<UserX size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "no-show" }); setNote(""); }} /></>}
              {booking.status === "IN_USE" && <Button size="small" aria-label="เสร็จสิ้น" icon={<SquareCheckBig size={14} />} onClick={() => confirm(booking, "complete")} />}
              {["PENDING", "APPROVED"].includes(booking.status) && <Button size="small" danger aria-label="ยกเลิก" icon={<X size={14} />} onClick={() => { setNoteAction({ id: booking.id, action: "cancel" }); setNote(""); }} />}
            </div> },
          ]} />
        </Panel>
      </QueryState>
      <Modal open={Boolean(detailId)} title="รายละเอียดการจอง" onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>ปิด</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <><p><strong>{detail.data.booking.bookingCode}</strong> · {detail.data.booking.user?.name ?? "—"}</p><BookingStatusTag status={detail.data.booking.status} /><Timeline items={detail.data.history.map((item) => ({ children: `${item.action} · ${item.user?.name ?? "ระบบ"} · ${item.createdAt.slice(0, 16)}` }))} /></>}
        </QueryState>
      </Modal>
      <Modal open={Boolean(noteAction)} title={noteAction?.action === "reject" ? "ปฏิเสธการจอง" : noteAction?.action === "cancel" ? "ยกเลิกการจอง" : "ระบุเหตุผลไม่เข้าใช้งาน"} onCancel={() => setNoteAction(undefined)} okText="ยืนยัน" cancelText="กลับ" okButtonProps={{ danger: noteAction?.action !== "no-show", disabled: !note.trim(), loading: change.isPending }} onOk={() => noteAction && change.mutate({ id: noteAction.id, action: noteAction.action, note }, { onSuccess: () => setNoteAction(undefined) })}>
        <Form.Item label="เหตุผล" required><Input.TextArea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} /></Form.Item>
      </Modal>
    </>
  );
}
