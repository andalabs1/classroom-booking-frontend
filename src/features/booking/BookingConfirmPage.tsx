import { useState } from "react";
import { Alert, Button, Result, Space, Steps } from "antd";
import { Navigate, useNavigate } from "react-router-dom";
import { bookingsApi } from "../../api/bookings";
import { useAction, useClassroom } from "../../services/queries";
import type { Booking, BookingDraft } from "../../types";
import { bookingSchema } from "../../schemas/bookingSchema";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { BookingSummary } from "./BookingSummary";
import { BookingStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Booking.module.css";
function getDraft() {
  try {
    return bookingSchema.parse(
      JSON.parse(sessionStorage.getItem("booking-draft") || "null"),
    );
  } catch {
    return null;
  }
}
export function BookingConfirmPage() {
  const [draft] = useState(getDraft);
  const [created, setCreated] = useState<Booking>();
  const roomQuery = useClassroom(draft?.roomId);
  const navigate = useNavigate();
  const mutation = useAction(
    (value: BookingDraft) =>
      value.editingId
        ? bookingsApi.update(value.editingId, value)
        : bookingsApi.create(value),
    "จองห้องสำเร็จ",
  );
  if (!draft) return <Navigate to="/booking" replace />;
  const room = roomQuery.data;
  if (created)
    return (
      <Panel>
        <Result
          status="success"
          title="จองห้องเรียนสำเร็จ"
          subTitle="ระบบได้รับคำขอแล้ว กรุณารอการอนุมัติจากเจ้าหน้าที่"
          extra={
            <Space wrap>
              <Button
                type="primary"
                onClick={() => navigate("/booking-history")}
              >
                ดูประวัติการจอง
              </Button>
              <Button onClick={() => navigate("/rooms")}>
                กลับหน้าห้องเรียน
              </Button>
            </Space>
          }
        />
        <h3 style={{ textAlign: "center" }}>
          {created.id} <BookingStatusTag status={created.status} />
        </h3>
        <BookingSummary draft={created} room={room} />
      </Panel>
    );
  return (
    <>
      <PageHeader
        title="ยืนยันการจอง"
        subtitle="ตรวจสอบรายละเอียดให้ถูกต้องก่อนยืนยัน"
      />
      <Steps
        className={styles.steps}
        current={1}
        items={[
          { title: "ข้อมูลการจอง" },
          { title: "ตรวจสอบและยืนยัน" },
          { title: "จองสำเร็จ" },
        ]}
      />
      <QueryState
        isLoading={roomQuery.isLoading}
        error={roomQuery.error}
        retry={roomQuery.refetch}
      >
        <Panel>
          <BookingSummary draft={draft} room={room} />
          <Alert
            type="info"
            showIcon
            title="ระบบจะตรวจสอบห้องว่างอีกครั้งเมื่อคุณยืนยันการจอง"
          />
          {mutation.error && (
            <Alert type="error" title={mutation.error.message} />
          )}
          <div className={styles.actions}>
            <Button
              disabled={mutation.isPending}
              onClick={() => navigate("/booking", { state: { draft } })}
            >
              ย้อนกลับ
            </Button>
            <Button
              type="primary"
              loading={mutation.isPending}
              onClick={() =>
                mutation.mutate(draft, {
                  onSuccess: (booking) => {
                    setCreated(booking);
                    sessionStorage.removeItem("booking-draft");
                  },
                })
              }
            >
              ยืนยันการจอง
            </Button>
          </div>
        </Panel>
      </QueryState>
    </>
  );
}
