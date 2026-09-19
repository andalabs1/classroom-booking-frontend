import { useDeferredValue, useState } from "react";
import { App, Button, Descriptions, Form, Input, Modal, Select, Tag } from "antd";
import { Eye, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { adminApi, type AdminUser, type AdminUserInput } from "../../api/admin";
import { useAction, useAdminUser, useAdminUsers } from "../../services/queries";
import type { Role, User } from "../../types";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import styles from "./Admin.module.css";

const roles: Role[] = ["USER", "STUDENT", "TEACHER", "STAFF", "ADMIN"];
const statuses: User["status"][] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const statusLabels: Record<User["status"], string> = { ACTIVE: "เปิดใช้งาน", INACTIVE: "ปิดใช้งาน", SUSPENDED: "ระงับผู้ใช้งาน" };
type UserValues = AdminUserInput & { password?: string };

function UserEditor({ user, onClose }: { user?: AdminUser; onClose: () => void }) {
  const [form] = Form.useForm<UserValues>();
  const save = useAction(async (values: UserValues) => {
    const name = `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim() || values.name;
    if (!user) return adminApi.createUser({ ...values, name, password: values.password! });
    await adminApi.updateUser(user.id, { name, userCode: values.userCode, firstName: values.firstName, lastName: values.lastName, phone: values.phone, email: values.email });
    if (values.role && values.role !== user.role) await adminApi.setUserRole(user.id, values.role);
    if (values.status && values.status !== user.status) await adminApi.setUserStatus(user.id, values.status);
  }, user ? "บันทึกข้อมูลผู้ใช้งานสำเร็จ" : "เพิ่มผู้ใช้งานสำเร็จ");
  const initialValues: UserValues = user ?? { name: "", userCode: "", firstName: "", lastName: "", phone: "", email: "", password: "", role: "USER", status: "ACTIVE" };
  return (
    <Modal open title={user ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"} onCancel={onClose} footer={null}>
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={(values) => save.mutate(values, { onSuccess: onClose })}>
        <div className={styles.formGrid}>
          <Form.Item label="ชื่อ" name="firstName" rules={[{ required: true, message: "กรุณากรอกชื่อ" }]}><Input /></Form.Item>
          <Form.Item label="นามสกุล" name="lastName" rules={[{ required: true, message: "กรุณากรอกนามสกุล" }]}><Input /></Form.Item>
          <Form.Item label="รหัสผู้ใช้งาน" name="userCode"><Input /></Form.Item>
          <Form.Item label="เบอร์โทรศัพท์" name="phone" rules={[{ pattern: /^0[0-9]{8,9}$/, message: "เบอร์โทรไม่ถูกต้อง" }]}><Input /></Form.Item>
          <Form.Item className={styles.full} label="อีเมล" name="email" rules={[{ required: true, type: "email", message: "อีเมลไม่ถูกต้อง" }]}><Input /></Form.Item>
          {!user && <Form.Item className={styles.full} label="รหัสผ่านเริ่มต้น" name="password" rules={[{ required: true, min: 8, message: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" }]}><Input.Password /></Form.Item>}
          <Form.Item label="Role" name="role"><Select options={roles.map((role) => ({ value: role, label: role }))} /></Form.Item>
          <Form.Item label="Status" name="status"><Select options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))} /></Form.Item>
        </div>
        <Button block type="primary" htmlType="submit" loading={save.isPending}>บันทึก</Button>
      </Form>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<AdminUser | null>();
  const [detailId, setDetailId] = useState<string>();
  const [resetId, setResetId] = useState<string>();
  const [newPassword, setNewPassword] = useState("");
  const query = useAdminUsers({ search: deferredSearch || undefined, limit: 100 });
  const detail = useAdminUser(detailId);
  const status = useAction(({ id, current }: { id: string; current: User["status"] }) => adminApi.setUserStatus(id, current === "ACTIVE" ? "SUSPENDED" : "ACTIVE"), "อัปเดตสถานะผู้ใช้งานสำเร็จ");
  const remove = useAction(adminApi.deactivateUser, "ปิดใช้งานผู้ใช้แล้ว");
  const reset = useAction(({ id, password }: { id: string; password: string }) => adminApi.resetUserPassword(id, password), "รีเซ็ตรหัสผ่านแล้ว");

  return (
    <>
      <PageHeader title="จัดการผู้ใช้งาน" subtitle="ดูแลบัญชีผู้ใช้งาน สิทธิ์ และสถานะการเข้าถึงระบบ" action={<Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing(null)}>เพิ่มผู้ใช้งาน</Button>} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}><Input allowClear placeholder="ค้นหาชื่อ รหัสผู้ใช้ หรืออีเมล" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <DataTable<AdminUser> dataSource={query.data?.items} columns={[
            { title: "รหัสผู้ใช้งาน", render: (_, user) => user.userCode ?? user.id }, { title: "ชื่อ", render: (_, user) => user.name }, { title: "อีเมล", dataIndex: "email" }, { title: "เบอร์โทรศัพท์", dataIndex: "phone" },
            { title: "Role", dataIndex: "role", render: (role: Role) => <Tag color={role === "ADMIN" ? "purple" : "default"}>{role}</Tag> },
            { title: "Status", render: (_, user) => <Tag color={user.status === "ACTIVE" ? "green" : "red"}>{statusLabels[user.status]}</Tag> },
            { title: "การดำเนินการ", width: 190, render: (_, user) => <div className={styles.actions}>
              <Button size="small" aria-label="ดูข้อมูลผู้ใช้" icon={<Eye size={14} />} onClick={() => setDetailId(user.id)} />
              <Button size="small" aria-label="แก้ไขผู้ใช้" icon={<Pencil size={14} />} onClick={() => setEditing(user)} />
              <Button size="small" aria-label="เปลี่ยนสถานะผู้ใช้" icon={<Power size={14} />} onClick={() => status.mutate({ id: user.id, current: user.status })} />
              <Button size="small" danger aria-label="ปิดใช้งานผู้ใช้" icon={<Trash2 size={14} />} onClick={() => modal.confirm({ title: "ปิดใช้งานผู้ใช้นี้?", content: user.name, okText: "ยืนยัน", cancelText: "กลับ", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(user.id) })} />
            </div> },
          ]} />
        </Panel>
      </QueryState>
      {editing !== undefined && <UserEditor user={editing ?? undefined} onClose={() => setEditing(undefined)} />}
      <Modal open={Boolean(detailId)} title="ข้อมูลผู้ใช้งาน" onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>ปิด</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <><Descriptions column={1} items={[
            { key: "name", label: "ชื่อ", children: detail.data.user.name }, { key: "email", label: "อีเมล", children: detail.data.user.email }, { key: "bookings", label: "จำนวนการจอง", children: detail.data.bookings.length },
          ]} /><Button icon={<KeyRound size={14} />} onClick={() => { setResetId(detail.data!.user.id); setNewPassword(""); }}>รีเซ็ตรหัสผ่าน</Button></>}
        </QueryState>
      </Modal>
      <Modal open={Boolean(resetId)} title="รีเซ็ตรหัสผ่าน" onCancel={() => setResetId(undefined)} okText="บันทึก" cancelText="กลับ" okButtonProps={{ disabled: newPassword.length < 8, loading: reset.isPending }} onOk={() => resetId && reset.mutate({ id: resetId, password: newPassword }, { onSuccess: () => setResetId(undefined) })}>
        <Input.Password placeholder="รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </Modal>
    </>
  );
}
