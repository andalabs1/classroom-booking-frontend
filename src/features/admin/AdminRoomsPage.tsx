import { fieldLabels } from "../../config/fieldLabels";
import { RoomImage } from "../../components/common/RoomImage";
import { useState } from "react";
import { App, Button, Form, Input, InputNumber, Modal, Select } from "antd";
import { Eye, Pencil, Plus, Power } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useDatabase, useAction } from "../../services/queries";
import { mockService } from "../../services/mockService";
import { useAuth } from "../../stores/authStore";
import type { Room } from "../../types";
import { equipmentOptions } from "../../constants/bookingStatus";
import {
  DataTable,
  PageHeader,
  Panel,
  QueryState,
} from "../../components/common/Common";
import { RoomStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Admin.module.css";
const roomSchema = z.object({
  id: z.string(),
  code: z.string().trim().min(1, "กรุณากรอกรหัสห้อง"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อห้อง"),
  building: z.string().trim().min(1, "กรุณากรอกอาคาร"),
  floor: z.number().int().min(1),
  capacity: z.number().int().min(1),
  description: z.string().trim().min(1, "กรุณากรอกรายละเอียด"),
  equipment: z.array(z.string()),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  image: z
    .string()
    .url("กรุณากรอก URL รูปภาพ")
    .refine((v) => /^https?:\/\//.test(v), "ใช้ URL http หรือ https"),
  category: z.string().min(1),
});
function RoomEditor({ room, onClose }: { room: Room; onClose: () => void }) {
  const user = useAuth((s) => s.user)!;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Room>({ resolver: zodResolver(roomSchema), defaultValues: room });
  const action = useAction(
    (v: Room) => mockService.saveRoom(v, user.id),
    "บันทึกห้องเรียนสำเร็จ",
  );
  return (
    <Modal
      open
      title={room.id ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}
      onCancel={onClose}
      footer={null}
      width={680}
    >
      <Form
        layout="vertical"
        onFinish={handleSubmit((v) =>
          action.mutate(
            { ...v, id: v.id || crypto.randomUUID() },
            { onSuccess: onClose },
          ),
        )}
      >
        <div className={styles.formGrid}>
          {(
            [
              { name: "code", label: "รหัสห้อง" },
              { name: "name", label: "ชื่อห้อง" },
              { name: "building", label: "อาคาร" },
            ] as const
          ).map(({ name, label }) => (
            <Form.Item
              key={name}
              label={label}
              required
              validateStatus={errors[name] ? "error" : ""}
              help={errors[name]?.message}
            >
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    aria-label={fieldLabels[field.name] ?? field.name}
                  />
                )}
              />
            </Form.Item>
          ))}
          {(["floor", "capacity"] as const).map((name) => (
            <Form.Item
              key={name}
              label={name === "floor" ? "ชั้น" : "ความจุ"}
              required
              validateStatus={errors[name] ? "error" : ""}
              help={errors[name]?.message}
            >
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    aria-label={fieldLabels[field.name] ?? field.name}
                    min={1}
                    onChange={(v) => field.onChange(v ?? 0)}
                    style={{ width: "100%" }}
                  />
                )}
              />
            </Form.Item>
          ))}
          <Form.Item label="ประเภท">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  options={["ห้องเรียน", "ห้องปฏิบัติการ", "ห้องประชุม"].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="สถานะ">
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  options={[
                    { value: "ACTIVE", label: "พร้อมใช้งาน" },
                    { value: "MAINTENANCE", label: "ปิดปรับปรุง" },
                    { value: "INACTIVE", label: "ไม่พร้อมใช้งาน" },
                  ]}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="อุปกรณ์">
            <Controller
              name="equipment"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  mode="multiple"
                  options={equipmentOptions.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              )}
            />
          </Form.Item>
          <Form.Item
            className={styles.full}
            label="รายละเอียด"
            required
            validateStatus={errors.description ? "error" : ""}
            help={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  rows={3}
                />
              )}
            />
          </Form.Item>
          <Form.Item
            className={styles.full}
            label="URL รูปภาพ"
            required
            validateStatus={errors.image ? "error" : ""}
            help={errors.image?.message}
          >
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  placeholder="https://..."
                />
              )}
            />
          </Form.Item>
        </div>
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={action.isPending}
        >
          บันทึก
        </Button>
      </Form>
    </Modal>
  );
}
export function AdminRoomsPage() {
  const query = useDatabase();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Room>();
  const user = useAuth((s) => s.user)!;
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const action = useAction(
    (room: Room) => mockService.saveRoom(room, user.id),
    "อัปเดตห้องเรียนสำเร็จ",
  );
  const empty: Room = {
    id: "",
    code: "",
    name: "",
    building: "",
    floor: 1,
    capacity: 30,
    description: "",
    equipment: [],
    status: "ACTIVE",
    image: "",
    category: "ห้องเรียน",
  };
  return (
    <>
      <PageHeader
        title="จัดการห้องเรียน"
        subtitle="จัดการข้อมูลห้อง อุปกรณ์ และความพร้อมใช้งาน"
        action={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setEditing(empty)}
          >
            เพิ่มห้อง
          </Button>
        }
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
              placeholder="ค้นหาชื่อห้อง / รหัสห้อง / อาคาร"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DataTable<Room>
            dataSource={query.data?.rooms.filter((r) =>
              `${r.name} ${r.code} ${r.building}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )}
            columns={[
              { title: "ลำดับ", render: (_, _r, i) => i + 1, width: 60 },
              {
                title: "ชื่อห้อง",
                sorter: (a, b) => a.code.localeCompare(b.code),
                render: (_, r) => (
                  <div className={styles.roomCell}>
                    <RoomImage
                      className={styles.thumbnail}
                      src={r.image}
                      alt=""
                    />
                    <span>
                      {r.code}
                      <small>{r.name}</small>
                    </span>
                  </div>
                ),
              },
              { title: "อาคาร", dataIndex: "building" },
              { title: "ชั้น", dataIndex: "floor" },
              {
                title: "ความจุ",
                dataIndex: "capacity",
                sorter: (a, b) => a.capacity - b.capacity,
              },
              {
                title: "อุปกรณ์",
                render: (_, r) => r.equipment.join(", "),
                width: 180,
              },
              {
                title: "สถานะ",
                render: (_, r) => <RoomStatusTag status={r.status} />,
              },
              {
                title: "การดำเนินการ",
                render: (_, r) => (
                  <div className={styles.actions}>
                    <Button
                      size="small"
                      aria-label="ดูห้อง"
                      icon={<Eye size={14} />}
                      onClick={() => navigate(`/rooms/${r.id}`)}
                    />
                    <Button
                      size="small"
                      aria-label="แก้ไขห้อง"
                      icon={<Pencil size={14} />}
                      onClick={() => setEditing(r)}
                    />
                    <Button
                      size="small"
                      aria-label={
                        r.status === "ACTIVE" ? "ปิดใช้งาน" : "เปิดใช้งาน"
                      }
                      icon={<Power size={14} />}
                      onClick={() =>
                        modal.confirm({
                          title:
                            r.status === "ACTIVE"
                              ? "ปิดใช้งานห้องนี้?"
                              : "เปิดใช้งานห้องนี้?",
                          content: r.code,
                          okText: "ยืนยัน",
                          cancelText: "กลับ",
                          onOk: () =>
                            action.mutateAsync({
                              ...r,
                              status:
                                r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                            }),
                        })
                      }
                    />
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      </QueryState>
      {editing && (
        <RoomEditor room={editing} onClose={() => setEditing(undefined)} />
      )}
    </>
  );
}
