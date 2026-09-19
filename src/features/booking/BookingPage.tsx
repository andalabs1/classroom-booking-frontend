import { fieldLabels } from "../../config/fieldLabels";
import { RoomImage } from "../../components/common/RoomImage";
import { useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Steps,
  TimePicker,
} from "antd";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { classroomsApi } from "../../api/classrooms";
import { useBusinessRules, useClassrooms, useAction } from "../../services/queries";
import { bookingSchema } from "../../schemas/bookingSchema";
import type { BookingDraft } from "../../types";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import styles from "./Booking.module.css";
export function BookingPage() {
  const { t } = useTranslation();
  const query = useClassrooms({ limit: 100 });
  const rulesQuery = useBusinessRules();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const initial = (location.state as { draft?: BookingDraft } | null)?.draft;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BookingDraft>({
    resolver: zodResolver(bookingSchema),
    defaultValues: initial ?? {
      roomId: params.get("room") || "",
      date: params.get("date") || dayjs().add(1, "day").format("YYYY-MM-DD"),
      start: params.get("start") || "09:00",
      end: params.get("end") || "10:00",
      attendees: 1,
      purpose: "",
      equipment: [],
      note: "",
    },
  });
  const roomId = useWatch({ control, name: "roomId" });
  const room = query.data?.items.find((r) => r.id === roomId);
  const check = useAction(async (draft: BookingDraft) => {
    const availability = await classroomsApi.availabilityForRoom(draft.roomId, {
      startAt: `${draft.date}T${draft.start}:00+07:00`,
      endAt: `${draft.date}T${draft.end}:00+07:00`,
    });
    if (!availability.available)
      throw new Error("ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้มีผู้ใช้งานแล้ว");
  });
  const submit = handleSubmit(async (draft) => {
    try {
      setError("");
      await check.mutateAsync(draft);
      sessionStorage.setItem("booking-draft", JSON.stringify(draft));
      navigate("/booking/confirm");
    } catch (e) {
      setError((e as Error).message);
    }
  });
  return (
    <>
      <PageHeader
        title={initial?.editingId ? "แก้ไขการจอง" : "จองห้องเรียน"}
        subtitle="ระบุรายละเอียดการใช้งาน และตรวจสอบข้อมูลก่อนยืนยัน"
      />
      <Steps
        className={styles.steps}
        current={0}
        items={[
          { title: "ข้อมูลการจอง" },
          { title: "ตรวจสอบและยืนยัน" },
          { title: "จองสำเร็จ" },
        ]}
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <div className={styles.layout}>
          <Panel>
            <h2>ข้อมูลการจอง</h2>
            {error && <Alert type="error" showIcon title={error} />}
            <Form layout="vertical" onFinish={submit}>
              <div className={styles.formGrid}>
                <Form.Item
                  className={styles.full}
                  label="ห้องเรียน"
                  required
                  validateStatus={errors.roomId ? "error" : ""}
                  help={errors.roomId?.message}
                >
                  <Controller
                    control={control}
                    name="roomId"
                    render={({ field }) => (
                      <Select
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        placeholder="เลือกห้องเรียน"
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("equipment", []);
                        }}
                        options={query.data?.items.map((r) => ({
                          value: r.id,
                          label: `${r.code} · ${r.name} (${r.capacity} ที่นั่ง)`,
                          disabled: r.status !== "ACTIVE",
                        }))}
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item
                  label="วันที่ใช้งาน"
                  required
                  validateStatus={errors.date ? "error" : ""}
                  help={errors.date?.message}
                >
                  <Controller
                    control={control}
                    name="date"
                    render={({ field }) => (
                      <DatePicker
                        style={{ width: "100%" }}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(v) =>
                          field.onChange(v?.format("YYYY-MM-DD") || "")
                        }
                        disabledDate={(d) => d.isBefore(dayjs(), "day")}
                        format="DD/MM/YYYY"
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item
                  label="จำนวนผู้ใช้งาน"
                  required
                  validateStatus={errors.attendees ? "error" : ""}
                  help={errors.attendees?.message}
                >
                  <Controller
                    control={control}
                    name="attendees"
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        onChange={(v) => field.onChange(v ?? 0)}
                        min={1}
                        max={room?.capacity}
                        style={{ width: "100%" }}
                        suffix="คน"
                      />
                    )}
                  />
                </Form.Item>
                {(["start", "end"] as const).map((name, i) => (
                  <Form.Item
                    key={name}
                    label={i ? "เวลาสิ้นสุด" : "เวลาเริ่มต้น"}
                    required
                    validateStatus={errors[name] ? "error" : ""}
                    help={errors[name]?.message}
                  >
                    <Controller
                      control={control}
                      name={name}
                      render={({ field }) => (
                        <TimePicker
                          style={{ width: "100%" }}
                          format="HH:mm"
                          minuteStep={30}
                          value={
                            field.value
                              ? dayjs(`2000-01-01T${field.value}`)
                              : null
                          }
                          onChange={(v) =>
                            field.onChange(v?.format("HH:mm") || "")
                          }
                          needConfirm={false}
                        />
                      )}
                    />
                  </Form.Item>
                ))}
                <Form.Item
                  className={styles.full}
                  label="วัตถุประสงค์การใช้งาน"
                  required
                  validateStatus={errors.purpose ? "error" : ""}
                  help={errors.purpose?.message}
                >
                  <Controller
                    control={control}
                    name="purpose"
                    render={({ field }) => (
                      <Input.TextArea
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        rows={3}
                        placeholder="เช่น ประชุมกลุ่มโครงงาน หรือนำเสนอผลงาน"
                        maxLength={500}
                        showCount
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item className={styles.full} label="อุปกรณ์ที่ต้องการ">
                  <Controller
                    control={control}
                    name="equipment"
                    render={({ field }) => (
                      <Select
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        mode="multiple"
                        placeholder="เลือกอุปกรณ์"
                        options={room?.equipment.map((value) => ({
                          value,
                          label: value,
                        }))}
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item className={styles.full} label="หมายเหตุ">
                  <Controller
                    control={control}
                    name="note"
                    render={({ field }) => (
                      <Input.TextArea
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        rows={2}
                        maxLength={500}
                        placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                      />
                    )}
                  />
                </Form.Item>
              </div>
              <div className={styles.actions}>
                <Button onClick={() => navigate("/rooms")}>ยกเลิก</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={check.isPending}
                >
                  ตรวจสอบข้อมูลการจอง
                </Button>
              </div>
            </Form>
          </Panel>
          <aside>
            <Panel>
              {room ? (
                <>
                  <RoomImage
                    className={styles.roomPreview}
                    src={room.image}
                    alt={room.name}
                  />
                  <h2>
                    {room.name} {room.code}
                  </h2>
                  <p className={styles.hint}>
                    {room.building} · ชั้น {room.floor}
                    <br />
                    รองรับผู้ใช้งาน {room.capacity} คน
                  </p>
                </>
              ) : (
                <h2>เลือกพื้นที่การเรียนรู้ของคุณ</h2>
              )}
              <Alert
                type="info"
                showIcon
                title="ข้อควรทราบก่อนจอง"
                description={t("bookingRulesInfo", {
                  open: rulesQuery.data?.bookingOpenTime ?? "08:00",
                  close: rulesQuery.data?.bookingCloseTime ?? "20:00",
                  days: rulesQuery.data?.bookingMaxAdvanceDays ?? 90,
                })}
              />
            </Panel>
          </aside>
        </div>
      </QueryState>
    </>
  );
}
