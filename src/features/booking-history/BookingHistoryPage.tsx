import { useState } from "react";
import { App, Button, DatePicker, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import { CheckCircle, Eye, Pencil, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { bookingsApi } from "../../api/bookings";
import { useBooking, useBookings, useAction } from "../../services/queries";
import type { Booking } from "../../types";
import { bookingLabels } from "../../constants/bookingStatus";
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
  const query = useBookings({ scope: "mine", limit: 100 });
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
    "ยกเลิกการจองสำเร็จ",
  );
  const checkIn = useAction(
    (id: string) => bookingsApi.checkIn(id),
    "เช็กอินสำเร็จ",
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
        title="ประวัติการจอง"
        subtitle="ติดตามสถานะ และจัดการรายการจองของคุณ"
        action={
          <Button type="primary" onClick={() => navigate("/booking")}>
            จองห้องเรียน
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
              placeholder="ทุกห้อง"
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
              placeholder="ทุกสถานะ"
              value={status}
              onChange={setStatus}
              options={Object.entries(bookingLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <DataTable<Booking>
            dataSource={rows}
            columns={[
              { title: "เลขที่การจอง", dataIndex: "id", width: 240 },
              {
                title: "ห้อง",
                render: (_, b) =>
                  b.room?.code,
              },
              {
                title: "วันที่",
                dataIndex: "date",
                render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
              },
              { title: "เวลา", render: (_, b) => `${b.start}–${b.end}` },
              {
                title: "วันที่ทำรายการ",
                dataIndex: "createdAt",
                render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
              },
              {
                title: "สถานะ",
                render: (_, b) => <BookingStatusTag status={b.status} />,
              },
              {
                title: "การดำเนินการ",
                render: (_, b) => (
                  <Space>
                    <Button
                      size="small"
                      aria-label="ดูรายละเอียด"
                      icon={<Eye size={14} />}
                      onClick={() => setSelected(b)}
                    />
                    {canChangeBooking(b) && (
                      <>
                        {b.status === "PENDING" && (
                          <Button
                            size="small"
                            aria-label="แก้ไข"
                            icon={<Pencil size={14} />}
                            onClick={() =>
                              navigate("/booking", {
                                state: { draft: { ...b, editingId: b.id } },
                              })
                            }
                          />
                        )}
                        <Button
                          size="small"
                          danger
                          aria-label="ยกเลิกการจอง"
                          icon={<X size={14} />}
                          onClick={() =>
                            modal.confirm({
                              title: "ยกเลิกการจองนี้?",
                              content: `${b.id} · ${b.date}`,
                              okText: "ยืนยันยกเลิก",
                              cancelText: "กลับ",
                              onOk: () => cancel.mutateAsync(b.id),
                            })
                          }
                        />
                      </>
                    )}
                    {b.status === "APPROVED" && (
                      <Button
                        size="small"
                        aria-label="เช็กอิน"
                        icon={<CheckCircle size={14} />}
                        loading={checkIn.isPending}
                        onClick={() => checkIn.mutate(b.id)}
                      />
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
        footer={<Button onClick={closeDetails}>ปิด</Button>}
      >
        {selected && (
          <>
            <BookingStatusTag status={bookingQuery.data?.status ?? selected.status} />
            <BookingSummary
              draft={bookingQuery.data ?? selected}
              room={bookingQuery.data?.room ?? selected.room}
            />
            {(bookingQuery.data?.reason ?? selected.reason) && (
              <p>เหตุผล: {bookingQuery.data?.reason ?? selected.reason}</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
