import { useState } from "react";
import { Alert, Button, Result, Space, Steps } from "antd";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [draft] = useState(getDraft);
  const [created, setCreated] = useState<Booking>();
  const roomQuery = useClassroom(draft?.roomId);
  const navigate = useNavigate();
  const mutation = useAction(
    (value: BookingDraft) =>
      value.editingId
        ? bookingsApi.update(value.editingId, value)
        : bookingsApi.create(value),
    t("bookingSuccessTitle"),
  );
  if (!draft) return <Navigate to="/booking" replace />;
  const room = roomQuery.data;
  if (created)
    return (
      <Panel>
        <Result
          status="success"
          title={t("bookingSuccessTitle")}
          subTitle={t("bookingSuccessSubtitle")}
          extra={
            <Space wrap>
              <Button
                type="primary"
                onClick={() => navigate("/booking-history")}
              >
                {t("bookingViewHistory")}
              </Button>
              <Button onClick={() => navigate("/rooms")}>
                {t("bookingBackToRooms")}
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
        title={t("bookingConfirmTitle")}
        subtitle={t("bookingConfirmSubtitle")}
      />
      <Steps
        className={styles.steps}
        current={1}
        items={[
          { title: t("bookingStepDetails") },
          { title: t("bookingStepConfirm") },
          { title: t("bookingStepCompleted") },
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
            title={t("bookingConfirmAvailability")}
          />
          {mutation.error && (
            <Alert type="error" title={mutation.error.message} />
          )}
          <div className={styles.actions}>
            <Button
              disabled={mutation.isPending}
              onClick={() => navigate("/booking", { state: { draft } })}
            >
              {t("bookingBack")}
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
              {t("bookingConfirm")}
            </Button>
          </div>
        </Panel>
      </QueryState>
    </>
  );
}
