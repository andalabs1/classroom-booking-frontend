import { useDeferredValue, useState } from "react";
import { App, Button, Descriptions, Form, Image, Input, InputNumber, Modal, Select, Tooltip, Upload, type UploadProps } from "antd";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [form] = Form.useForm<Room>();
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const imageUrl = Form.useWatch("image", form);
  const save = useAction((values: Room) => room.id ? adminApi.updateClassroom(room.id, values) : adminApi.createClassroom(values), room.id ? t("adminRoomSaved") : t("adminRoomAdded"));
  const removeImage = useAction(uploadsApi.deleteImage, t("adminImageDeleted"));
  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    const accepted = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!accepted.includes(file.type)) {
      void message.error(t("adminImageTypeError"));
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      void message.error(t("adminImageSizeError"));
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    void uploadsApi
      .uploadImage(file)
      .then((image) => {
        form.setFieldValue("image", image.url);
        void message.success(t("adminImageUploaded"));
      })
      .catch((error: Error) => void message.error(error.message))
      .finally(() => setUploading(false));
    return false;
  };
  return (
    <Modal
      open
      title={room.id ? t("adminEditRoom") : t("adminAddRoom")}
      onCancel={onClose}
      width={760}
      className={styles.roomEditorModal}
      style={{ top: 24 }}
      styles={{ body: { maxHeight: "calc(100vh - 184px)", overflowY: "auto" } }}
      footer={
        <Button type="primary" htmlType="submit" form="room-editor-form" loading={save.isPending}>
          {t("adminSave")}
        </Button>
      }
    >
      <Form id="room-editor-form" form={form} layout="vertical" initialValues={room} onFinish={(values) => save.mutate(values, { onSuccess: onClose })}>
        <div className={styles.formGrid}>
          <Form.Item label={t("adminRoomCode")} name="code" rules={[{ required: true, message: t("adminRequiredRoomCode") }]}><Input /></Form.Item>
          <Form.Item label={t("adminRoomName")} name="name" rules={[{ required: true, message: t("adminRequiredRoomName") }]}><Input /></Form.Item>
          <Form.Item label={t("adminBuilding")} name="building" rules={[{ required: true, message: t("adminRequiredBuilding") }]}><Input /></Form.Item>
          <Form.Item label={t("adminFloor")} name="floor" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label={t("adminCapacity")} name="capacity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label={t("adminCategory")} name="category" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label={t("adminStatus")} name="status"><Select options={[{ value: "ACTIVE", label: t("adminAvailable") }, { value: "MAINTENANCE", label: t("adminMaintenance") }, { value: "INACTIVE", label: t("adminInactive") }]} /></Form.Item>
          <Form.Item label={t("adminEquipment")} name="equipment"><Select mode="multiple" options={equipmentOptions.map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item className={styles.full} label={t("adminDescription")} name="description" rules={[{ required: true, message: t("adminRequiredDescription") }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item className={styles.full} label={t("adminRoomImage")} name="image" rules={[{ type: "url", message: t("adminInvalidImageUrl") }]}>
            <Input placeholder={t("adminImagePlaceholder")} />
          </Form.Item>
          <div className={`${styles.full} ${styles.imageActions}`}>
            <Upload accept="image/jpeg,image/png,image/webp,image/gif" showUploadList={false} beforeUpload={beforeUpload}>
              <Button loading={uploading}>{t("adminUploadImage")}</Button>
            </Upload>
            {imageUrl && imageUrl !== "/room-placeholder.svg" && <Image width={96} height={64} preview src={imageUrl} alt={t("adminImagePreview")} className={styles.imagePreview} />}
            {localImageKey(imageUrl) && <Button danger loading={removeImage.isPending} onClick={() => removeImage.mutate(localImageKey(imageUrl)!, { onSuccess: () => form.setFieldValue("image", "/room-placeholder.svg") })}>{t("adminDeleteUploadedImage")}</Button>}
          </div>
        </div>
      </Form>
    </Modal>
  );
}

export function AdminRoomsPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<Room>();
  const [detailId, setDetailId] = useState<string>();
  const query = useAdminClassrooms({ search: deferredSearch || undefined, limit: 100 });
  const detail = useAdminClassroom(detailId);
  const status = useAction(({ id, active }: { id: string; active: boolean }) => adminApi.setClassroomStatus(id, active ? "INACTIVE" : "AVAILABLE"), t("adminRoomStatusUpdated"));
  const remove = useAction(adminApi.deactivateClassroom, t("adminRoomDeactivated"));

  return (
    <>
      <PageHeader title={t("adminRooms")} subtitle={t("adminRoomsSubtitle")} action={<Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing(emptyRoom)}>{t("adminAddRoom")}</Button>} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}><Input allowClear placeholder={t("adminSearchRooms")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <DataTable<Room> dataSource={query.data?.items} columns={[
            { title: t("adminRoomCode"), dataIndex: "code" }, { title: t("adminRoomName"), dataIndex: "name" }, { title: t("adminBuilding"), dataIndex: "building" }, { title: t("adminFloor"), dataIndex: "floor" }, { title: t("adminCapacity"), dataIndex: "capacity" },
            { title: t("adminStatus"), render: (_, room) => <RoomStatusTag status={room.status} /> },
            { title: t("adminActions"), render: (_, room) => <div className={styles.actions}>
              <Tooltip title={t("adminViewRoom")}><Button size="small" aria-label={t("adminViewRoom")} icon={<Eye size={14} />} onClick={() => setDetailId(room.id)} /></Tooltip>
              <Tooltip title={t("adminEditRoomAction")}><Button size="small" aria-label={t("adminEditRoomAction")} icon={<Pencil size={14} />} onClick={() => setEditing(room)} /></Tooltip>
              <Tooltip title={t("adminChangeRoomStatus")}><Button size="small" aria-label={t("adminChangeRoomStatus")} icon={<Power size={14} />} onClick={() => status.mutate({ id: room.id, active: room.status === "ACTIVE" })} /></Tooltip>
              <Tooltip title={t("adminDeactivateRoom")}><Button size="small" danger aria-label={t("adminDeactivateRoom")} icon={<Trash2 size={14} />} onClick={() => modal.confirm({ title: t("adminDeactivateRoomConfirm"), content: room.code, okText: t("adminConfirm"), cancelText: t("adminBack"), okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(room.id) })} /></Tooltip>
            </div> },
          ]} />
        </Panel>
      </QueryState>
      {editing && <RoomEditor room={editing} onClose={() => setEditing(undefined)} />}
      <Modal open={Boolean(detailId)} title={t("adminRoomDetail")} onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>{t("adminClose")}</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <Descriptions column={1} items={[
            { key: "code", label: t("adminRoomCode"), children: detail.data.room.code },
            { key: "name", label: t("adminRoomName"), children: detail.data.room.name },
            { key: "bookings", label: t("adminBookingCount"), children: detail.data.bookings.length },
          ]} />}
        </QueryState>
      </Modal>
    </>
  );
}
