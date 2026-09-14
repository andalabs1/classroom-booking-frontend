import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { App, Button, DatePicker, Form, Input, Modal, Select } from "antd";
import { Eye, CircleCheck, CircleX, X } from "lucide-react";
import { useDatabase, useAction } from "../../services/queries";
import { mockService } from "../../services/mockService";
import { useAuth } from "../../stores/authStore";
import type { Booking, BookingStatus } from "../../types";
import { bookingLabels } from "../../constants/bookingStatus";
import { canChangeBooking } from "../../utils/bookingRules";
import {
  DataTable,
  PageHeader,
  Panel,
  QueryState,
} from "../../components/common/Common";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import { BookingSummary } from "../booking/BookingSummary";
import styles from "./Admin.module.css";
export function AdminBookingsPage() {
  const query = useDatabase();
  const user = useAuth((s) => s.user)!;
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const [room, setRoom] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [range, setRange] = useState<[string, string]>();
  const [selectedLocal, setSelected] = useState<Booking>();
  const [params, setParams] = useSearchParams();
  const selected =
    selectedLocal ??
    query.data?.bookings.find((b) => b.id === params.get("booking"));
  const closeDetails = () => {
    setSelected(undefined);
    const next = new URLSearchParams(params);
    next.delete("booking");
    setParams(next, { replace: true });
  };
  const [reject, setReject] = useState<Booking>();
  const [reason, setReason] = useState("");
  const action = useAction(
    (v: { id: string; status: BookingStatus; reason?: string }) =>
      mockService.status(v.id, v.status, user.id, v.reason),
    "อัปเดตสถานะการจองสำเร็จ",
  );
  const rows = query.data?.bookings
    .filter(
      (b) =>
        (!search ||
          `${b.id} ${query.data?.users.find((u) => u.id === b.userId)?.firstName} ${query.data?.users.find((u) => u.id === b.userId)?.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!room || room === b.roomId) &&
        (!status || status === b.status) &&
        (!range || (b.date >= range[0] && b.date <= range[1])),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirm = (b: Booking, next: BookingStatus) =>
    modal.confirm({
      title:
        next === "APPROVED" ? "ยืนยันอนุมัติการจอง?" : "ยืนยันยกเลิกการจอง?",
      content: `${b.id} · ${b.date} ${b.start}–${b.end}`,
      okText: "ยืนยัน",
      cancelText: "กลับ",
      onOk: () => action.mutateAsync({ id: b.id, status: next }),
    });
  return (
    <>
      <PageHeader
        title="จัดการการจอง"
        subtitle="ตรวจสอบคำขอ อนุมัติ และติดตามการใช้ห้องเรียน"
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <Panel>
          <div className={styles.filters}>
            <Input
              allowClear
              placeholder="ค้นหาเลขที่การจอง / ผู้จอง"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              allowClear
              placeholder="ทุกห้อง"
              onChange={setRoom}
              options={query.data?.rooms.map((r) => ({
                value: r.id,
                label: r.code,
              }))}
            />
            <Select
              allowClear
              placeholder="ทุกสถานะ"
              onChange={setStatus}
              options={Object.entries(bookingLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <DatePicker.RangePicker
              onChange={(v) =>
                setRange(
                  v?.[0] && v?.[1]
                    ? [v[0].format("YYYY-MM-DD"), v[1].format("YYYY-MM-DD")]
                    : undefined,
                )
              }
            />
          </div>
          <DataTable<Booking>
            dataSource={rows}
            columns={[
              { title: "Booking ID", dataIndex: "id", width: 220 },
              {
                title: "ผู้จอง",
                render: (_, b) =>
                  query.data?.users.find((u) => u.id === b.userId)?.firstName,
              },
              {
                title: "ห้อง",
                render: (_, b) =>
                  query.data?.rooms.find((r) => r.id === b.roomId)?.code,
              },
              { title: "วันที่", dataIndex: "date" },
              { title: "เวลา", render: (_, b) => `${b.start}–${b.end}` },
              { title: "วัตถุประสงค์", dataIndex: "purpose", width: 160 },
              {
                title: "วันที่ทำรายการ",
                render: (_, b) => b.createdAt.slice(0, 10),
              },
              {
                title: "สถานะ",
                render: (_, b) => <BookingStatusTag status={b.status} />,
              },
              {
                title: "Actions",
                width: 150,
                render: (_, b) => (
                  <div className={styles.actions}>
                    <Button
                      size="small"
                      aria-label="ดูรายละเอียด"
                      icon={<Eye size={14} />}
                      onClick={() => setSelected(b)}
                    />
                    {b.status === "PENDING" && (
                      <>
                        <Button
                          size="small"
                          aria-label="อนุมัติ"
                          icon={<CircleCheck size={14} />}
                          onClick={() => confirm(b, "APPROVED")}
                        />
                        <Button
                          size="small"
                          danger
                          aria-label="ปฏิเสธ"
                          icon={<CircleX size={14} />}
                          onClick={() => {
                            setReject(b);
                            setReason("");
                          }}
                        />
                      </>
                    )}
                    {canChangeBooking(b) && (
                      <Button
                        size="small"
                        danger
                        aria-label="ยกเลิก"
                        icon={<X size={14} />}
                        onClick={() => confirm(b, "CANCELLED")}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      </QueryState>
      <Modal
        title={selected?.id}
        open={!!selected}
        onCancel={closeDetails}
        footer={<Button onClick={closeDetails}>ปิด</Button>}
      >
        {selected && (
          <>
            <BookingStatusTag status={selected.status} />
            <BookingSummary
              draft={selected}
              room={query.data?.rooms.find((r) => r.id === selected.roomId)}
            />
            {selected.reason && <p>เหตุผล: {selected.reason}</p>}
          </>
        )}
      </Modal>
      <Modal
        title="ยืนยันปฏิเสธการจอง"
        open={!!reject}
        onCancel={() => setReject(undefined)}
        okText="ยืนยันปฏิเสธ"
        cancelText="กลับ"
        okButtonProps={{
          danger: true,
          disabled: !reason.trim(),
          loading: action.isPending,
        }}
        onOk={() =>
          reject &&
          action.mutate(
            { id: reject.id, status: "REJECTED", reason },
            { onSuccess: () => setReject(undefined) },
          )
        }
      >
        <p>{reject?.id}</p>
        <Form.Item label="เหตุผลที่ไม่อนุมัติ" required>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </Form.Item>
      </Modal>
    </>
  );
}
