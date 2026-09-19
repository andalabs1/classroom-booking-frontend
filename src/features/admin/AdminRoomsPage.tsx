import { useDeferredValue, useState } from "react";
import { App, Button, Descriptions, Form, Image, Input, InputNumber, Modal, Select, Upload, type UploadProps } from "antd";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { adminApi } from "../../api/admin";
import { localImageKey, uploadsApi } from "../../api/uploads";
import { useAction, useAdminClassroom, useAdminClassrooms } from "../../services/queries";
import type { Room } from "../../types";
import { equipmentOptions } from "../../constants/bookingStatus";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import { RoomStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Admin.module.css";

const emptyRoom: Room = { id: "", code: "", name: "", building: "", floor: 1, capacity: 30, description: "", equipment: [], status: "ACTIVE", image: "/room-placeholder.svg", category: "ห้องเรียน" };

function RoomEditor({ room, onClose }: { room: Room; onClose: () => void }) {
  const [form] = Form.useForm<Room>();
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const imageUrl = Form.useWatch("image", form);
  const save = useAction((values: Room) => room.id ? adminApi.updateClassroom(room.id, values) : adminApi.createClassroom(values), room.id ? "บันทึกห้องเรียนสำเร็จ" : "เพิ่มห้องเรียนสำเร็จ");
  const removeImage = useAction(uploadsApi.deleteImage, "ลบรูปภาพแล้ว");
  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    const accepted = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!accepted.includes(file.type)) {
      void message.error("รองรับเฉพาะ JPEG, PNG, WebP และ GIF");
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      void message.error("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    void uploadsApi
      .uploadImage(file)
      .then((image) => {
        form.setFieldValue("image", image.url);
        void message.success("อัปโหลดรูปภาพสำเร็จ");
      })
      .catch((error: Error) => void message.error(error.message))
      .finally(() => setUploading(false));
    return false;
  };
  return (
    <Modal open title={room.id ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"} onCancel={onClose} footer={null} width={680}>
      <Form form={form} layout="vertical" initialValues={room} onFinish={(values) => save.mutate(values, { onSuccess: onClose })}>
        <div className={styles.formGrid}>
          <Form.Item label="รหัสห้อง" name="code" rules={[{ required: true, message: "กรุณากรอกรหัสห้อง" }]}><Input /></Form.Item>
          <Form.Item label="ชื่อห้อง" name="name" rules={[{ required: true, message: "กรุณากรอกชื่อห้อง" }]}><Input /></Form.Item>
          <Form.Item label="อาคาร" name="building" rules={[{ required: true, message: "กรุณากรอกอาคาร" }]}><Input /></Form.Item>
          <Form.Item label="ชั้น" name="floor" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="ความจุ" name="capacity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="ประเภท" name="category" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="สถานะ" name="status"><Select options={[{ value: "ACTIVE", label: "พร้อมใช้งาน" }, { value: "MAINTENANCE", label: "ปิดปรับปรุง" }, { value: "INACTIVE", label: "ไม่พร้อมใช้งาน" }]} /></Form.Item>
          <Form.Item label="อุปกรณ์" name="equipment"><Select mode="multiple" options={equipmentOptions.map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item className={styles.full} label="รายละเอียด" name="description" rules={[{ required: true, message: "กรุณากรอกรายละเอียด" }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item className={styles.full} label="รูปภาพห้อง" name="image" rules={[{ type: "url", message: "กรุณากรอก URL รูปภาพที่ถูกต้อง" }]}>
            <Input placeholder="วาง URL รูปภาพ หรืออัปโหลดไฟล์ด้านล่าง" />
          </Form.Item>
          <div className={`${styles.full} ${styles.imageActions}`}>
            <Upload accept="image/jpeg,image/png,image/webp,image/gif" showUploadList={false} beforeUpload={beforeUpload}>
              <Button loading={uploading}>อัปโหลดรูปภาพ</Button>
            </Upload>
            {imageUrl && imageUrl !== "/room-placeholder.svg" && <Image width={96} height={64} preview src={imageUrl} alt="ตัวอย่างรูปห้อง" className={styles.imagePreview} />}
            {localImageKey(imageUrl) && <Button danger loading={removeImage.isPending} onClick={() => removeImage.mutate(localImageKey(imageUrl)!, { onSuccess: () => form.setFieldValue("image", "/room-placeholder.svg") })}>ลบรูปที่อัปโหลด</Button>}
          </div>
        </div>
        <Button block type="primary" htmlType="submit" loading={save.isPending}>บันทึก</Button>
      </Form>
    </Modal>
  );
}

export function AdminRoomsPage() {
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<Room>();
  const [detailId, setDetailId] = useState<string>();
  const query = useAdminClassrooms({ search: deferredSearch || undefined, limit: 100 });
  const detail = useAdminClassroom(detailId);
  const status = useAction(({ id, active }: { id: string; active: boolean }) => adminApi.setClassroomStatus(id, active ? "INACTIVE" : "AVAILABLE"), "อัปเดตสถานะห้องเรียนสำเร็จ");
  const remove = useAction(adminApi.deactivateClassroom, "ปิดใช้งานห้องเรียนแล้ว");

  return (
    <>
      <PageHeader title="จัดการห้องเรียน" subtitle="จัดการข้อมูลห้อง อุปกรณ์ และความพร้อมใช้งาน" action={<Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing(emptyRoom)}>เพิ่มห้อง</Button>} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}><Input allowClear placeholder="ค้นหาชื่อห้อง / รหัสห้อง / อาคาร" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <DataTable<Room> dataSource={query.data?.items} columns={[
            { title: "รหัสห้อง", dataIndex: "code" }, { title: "ชื่อห้อง", dataIndex: "name" }, { title: "อาคาร", dataIndex: "building" }, { title: "ชั้น", dataIndex: "floor" }, { title: "ความจุ", dataIndex: "capacity" },
            { title: "สถานะ", render: (_, room) => <RoomStatusTag status={room.status} /> },
            { title: "การดำเนินการ", render: (_, room) => <div className={styles.actions}>
              <Button size="small" aria-label="ดูรายละเอียดห้อง" icon={<Eye size={14} />} onClick={() => setDetailId(room.id)} />
              <Button size="small" aria-label="แก้ไขห้อง" icon={<Pencil size={14} />} onClick={() => setEditing(room)} />
              <Button size="small" aria-label="เปลี่ยนสถานะห้อง" icon={<Power size={14} />} onClick={() => status.mutate({ id: room.id, active: room.status === "ACTIVE" })} />
              <Button size="small" danger aria-label="ปิดใช้งานห้อง" icon={<Trash2 size={14} />} onClick={() => modal.confirm({ title: "ปิดใช้งานห้องนี้?", content: room.code, okText: "ยืนยัน", cancelText: "กลับ", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(room.id) })} />
            </div> },
          ]} />
        </Panel>
      </QueryState>
      {editing && <RoomEditor room={editing} onClose={() => setEditing(undefined)} />}
      <Modal open={Boolean(detailId)} title="รายละเอียดห้อง" onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>ปิด</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <Descriptions column={1} items={[
            { key: "code", label: "รหัสห้อง", children: detail.data.room.code },
            { key: "name", label: "ชื่อห้อง", children: detail.data.room.name },
            { key: "bookings", label: "จำนวนการจอง", children: detail.data.bookings.length },
          ]} />}
        </QueryState>
      </Modal>
    </>
  );
}
