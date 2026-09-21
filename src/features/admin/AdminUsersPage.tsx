import { useDeferredValue, useState } from "react";
import { App, Button, Descriptions, Form, Input, Modal, Select, Tag, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { Eye, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { adminApi, type AdminUser, type AdminUserInput } from "../../api/admin";
import { useAction, useAdminUser, useAdminUsers } from "../../services/queries";
import type { Role, User } from "../../types";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import styles from "./Admin.module.css";

const roles: Role[] = ["USER", "STUDENT", "TEACHER", "STAFF", "ADMIN"];
const statuses: User["status"][] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const statusLabelKeys: Record<User["status"], string> = { ACTIVE: "adminUserActive", INACTIVE: "adminUserInactive", SUSPENDED: "adminUserSuspended" };
type UserValues = AdminUserInput & { password?: string };

function UserEditor({ user, onClose }: { user?: AdminUser; onClose: () => void }) {
  const { t } = useTranslation();
  const statusLabels = Object.fromEntries(statuses.map((status) => [status, t(statusLabelKeys[status])])) as Record<User["status"], string>;
  const [form] = Form.useForm<UserValues>();
  const save = useAction(async (values: UserValues) => {
    const name = `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim() || values.name;
    if (!user) return adminApi.createUser({ ...values, name, password: values.password! });
    await adminApi.updateUser(user.id, { name, userCode: values.userCode, firstName: values.firstName, lastName: values.lastName, phone: values.phone, email: values.email });
    if (values.role && values.role !== user.role) await adminApi.setUserRole(user.id, values.role);
    if (values.status && values.status !== user.status) await adminApi.setUserStatus(user.id, values.status);
  }, user ? t("adminUserSaved") : t("adminUserAdded"));
  const initialValues: UserValues = user ?? { name: "", userCode: "", firstName: "", lastName: "", phone: "", email: "", password: "", role: "USER", status: "ACTIVE" };
  return (
    <Modal open title={user ? t("adminEditUser") : t("adminAddUser")} onCancel={onClose} footer={null}>
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={(values) => save.mutate(values, { onSuccess: onClose })}>
        <div className={styles.formGrid}>
          <Form.Item label={t("adminFirstName")} name="firstName" rules={[{ required: true, message: t("validationFirstName") }]}><Input /></Form.Item>
          <Form.Item label={t("adminLastName")} name="lastName" rules={[{ required: true, message: t("validationLastName") }]}><Input /></Form.Item>
          <Form.Item label={t("adminUserCode")} name="userCode"><Input /></Form.Item>
          <Form.Item label={t("adminPhone")} name="phone" rules={[{ pattern: /^0[0-9]{8,9}$/, message: t("adminInvalidPhone") }]}><Input /></Form.Item>
          <Form.Item className={styles.full} label={t("adminEmail")} name="email" rules={[{ required: true, type: "email", message: t("validationEmail") }]}><Input /></Form.Item>
          {!user && <Form.Item className={styles.full} label={t("adminInitialPassword")} name="password" rules={[{ required: true, min: 8, message: t("adminInitialPasswordError") }]}><Input.Password /></Form.Item>}
          <Form.Item label="Role" name="role"><Select options={roles.map((role) => ({ value: role, label: role }))} /></Form.Item>
          <Form.Item label="Status" name="status"><Select options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))} /></Form.Item>
        </div>
        <Button block type="primary" htmlType="submit" loading={save.isPending}>{t("adminSave")}</Button>
      </Form>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const statusLabels = Object.fromEntries(statuses.map((status) => [status, t(statusLabelKeys[status])])) as Record<User["status"], string>;
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<AdminUser | null>();
  const [detailId, setDetailId] = useState<string>();
  const [resetId, setResetId] = useState<string>();
  const [newPassword, setNewPassword] = useState("");
  const query = useAdminUsers({ search: deferredSearch || undefined, limit: 100 });
  const detail = useAdminUser(detailId);
  const status = useAction(({ id, current }: { id: string; current: User["status"] }) => adminApi.setUserStatus(id, current === "ACTIVE" ? "SUSPENDED" : "ACTIVE"), t("adminUserStatusUpdated"));
  const remove = useAction(adminApi.deactivateUser, t("adminUserDeactivated"));
  const reset = useAction(({ id, password }: { id: string; password: string }) => adminApi.resetUserPassword(id, password), t("adminPasswordResetSuccess"));

  return (
    <>
      <PageHeader title={t("adminUsers")} subtitle={t("adminUsersSubtitle")} action={<Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing(null)}>{t("adminAddUser")}</Button>} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}><Input allowClear placeholder={t("adminSearchUsers")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <DataTable<AdminUser> dataSource={query.data?.items} columns={[
            { title: t("adminUserCode"), render: (_, user) => user.userCode ?? user.id }, { title: t("adminFirstName"), render: (_, user) => user.name }, { title: t("adminEmail"), dataIndex: "email" }, { title: t("adminPhone"), dataIndex: "phone" },
            { title: "Role", dataIndex: "role", render: (role: Role) => <Tag color={role === "ADMIN" ? "purple" : "default"}>{role}</Tag> },
            { title: "Status", render: (_, user) => <Tag color={user.status === "ACTIVE" ? "green" : "red"}>{statusLabels[user.status]}</Tag> },
            { title: t("adminActions"), width: 190, render: (_, user) => <div className={styles.actions}>
              <Tooltip title={t("adminViewUser")}><Button size="small" aria-label={t("adminViewUser")} icon={<Eye size={14} />} onClick={() => setDetailId(user.id)} /></Tooltip>
              <Tooltip title={t("adminEditUserAction")}><Button size="small" aria-label={t("adminEditUserAction")} icon={<Pencil size={14} />} onClick={() => setEditing(user)} /></Tooltip>
              <Tooltip title={t("adminChangeUserStatus")}><Button size="small" aria-label={t("adminChangeUserStatus")} icon={<Power size={14} />} onClick={() => status.mutate({ id: user.id, current: user.status })} /></Tooltip>
              <Tooltip title={t("adminDeactivateUser")}><Button size="small" danger aria-label={t("adminDeactivateUser")} icon={<Trash2 size={14} />} onClick={() => modal.confirm({ title: t("adminDeactivateUserConfirm"), content: user.name, okText: t("adminConfirm"), cancelText: t("adminBack"), okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(user.id) })} /></Tooltip>
            </div> },
          ]} />
        </Panel>
      </QueryState>
      {editing !== undefined && <UserEditor user={editing ?? undefined} onClose={() => setEditing(undefined)} />}
      <Modal open={Boolean(detailId)} title={t("adminUserDetail")} onCancel={() => setDetailId(undefined)} footer={<Button onClick={() => setDetailId(undefined)}>{t("adminClose")}</Button>}>
        <QueryState isLoading={detail.isLoading} error={detail.error} retry={detail.refetch}>
          {detail.data && <><Descriptions column={1} items={[
            { key: "name", label: t("adminFirstName"), children: detail.data.user.name }, { key: "email", label: t("adminEmail"), children: detail.data.user.email }, { key: "bookings", label: t("adminBookingCount"), children: detail.data.bookings.length },
          ]} /><Button icon={<KeyRound size={14} />} onClick={() => { setResetId(detail.data!.user.id); setNewPassword(""); }}>{t("adminPasswordReset")}</Button></>}
        </QueryState>
      </Modal>
      <Modal open={Boolean(resetId)} title={t("adminPasswordReset")} onCancel={() => setResetId(undefined)} okText={t("adminSave")} cancelText={t("adminBack")} okButtonProps={{ disabled: newPassword.length < 8, loading: reset.isPending }} onOk={() => resetId && reset.mutate({ id: resetId, password: newPassword }, { onSuccess: () => setResetId(undefined) })}>
        <Input.Password placeholder={t("adminNewPasswordPlaceholder")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </Modal>
    </>
  );
}
