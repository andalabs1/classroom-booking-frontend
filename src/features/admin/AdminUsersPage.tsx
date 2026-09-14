import { fieldLabels } from "../../config/fieldLabels";
import { useState } from "react";
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Tag,
} from "antd";
import { Eye, Pencil, Power } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDatabase, useAction } from "../../services/queries";
import { mockService } from "../../services/mockService";
import { useAuth } from "../../stores/authStore";
import type { User } from "../../types";
import {
  DataTable,
  PageHeader,
  Panel,
  QueryState,
} from "../../components/common/Common";
import styles from "./Admin.module.css";
const schema = z.object({
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  phone: z.string().regex(/^0[0-9]{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  role: z.enum(["USER", "ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});
type Values = z.infer<typeof schema>;
const statusLabels = {
  ACTIVE: "เปิดใช้งาน",
  INACTIVE: "ปิดใช้งาน",
  SUSPENDED: "ระงับผู้ใช้งาน",
};
function UserEditor({ user, onClose }: { user: User; onClose: () => void }) {
  const actor = useAuth((s) => s.user)!;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: user });
  const action = useAction(
    (values: Values) => mockService.saveUser({ ...user, ...values }, actor.id),
    "แก้ไขข้อมูลสำเร็จ",
  );
  return (
    <Modal open onCancel={onClose} title="แก้ไขผู้ใช้งาน" footer={null}>
      <Form
        layout="vertical"
        onFinish={handleSubmit((values) =>
          action.mutate(values, { onSuccess: onClose }),
        )}
      >
        {(
          [
            { name: "firstName", label: "ชื่อ" },
            { name: "lastName", label: "นามสกุล" },
            { name: "email", label: "Email" },
            { name: "phone", label: "เบอร์โทรศัพท์" },
          ] as const
        ).map(({ name, label }) => (
          <Form.Item
            key={name}
            label={label}
            validateStatus={errors[name] ? "error" : ""}
            help={errors[name]?.message}
          >
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                />
              )}
            />
          </Form.Item>
        ))}
        <Form.Item label="Role">
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                {...field}
                aria-label={fieldLabels[field.name] ?? field.name}
                options={["USER", "ADMIN"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                {...field}
                aria-label={fieldLabels[field.name] ?? field.name}
                options={Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            )}
          />
        </Form.Item>
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
export function AdminUsersPage() {
  const query = useDatabase();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User>();
  const [selected, setSelected] = useState<User>();
  const user = useAuth((s) => s.user)!;
  const { modal } = App.useApp();
  const action = useAction(
    (u: User) => mockService.saveUser(u, user.id),
    "อัปเดตผู้ใช้งานสำเร็จ",
  );
  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้งาน"
        subtitle="ดูแลบัญชีผู้ใช้งาน สิทธิ์ และสถานะการเข้าถึงระบบ"
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
              placeholder="ค้นหาชื่อ รหัสผู้ใช้ หรืออีเมล"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DataTable<User>
            dataSource={query.data?.users.filter((u) =>
              `${u.firstName} ${u.lastName} ${u.id} ${u.email}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )}
            columns={[
              { title: "User ID", dataIndex: "id" },
              {
                title: "ชื่อ",
                render: (_, u) => `${u.firstName} ${u.lastName}`,
              },
              { title: "Email", dataIndex: "email" },
              { title: "เบอร์โทรศัพท์", dataIndex: "phone" },
              {
                title: "Role",
                dataIndex: "role",
                render: (v: string) => (
                  <Tag color={v === "ADMIN" ? "purple" : "default"}>{v}</Tag>
                ),
              },
              {
                title: "Status",
                render: (_, u) => (
                  <Tag color={u.status === "ACTIVE" ? "green" : "red"}>
                    {statusLabels[u.status]}
                  </Tag>
                ),
              },
              {
                title: "วันที่สมัคร",
                render: (_, u) => u.registeredAt.slice(0, 10),
              },
              {
                title: "Actions",
                render: (_, u) => (
                  <div className={styles.actions}>
                    <Button
                      size="small"
                      aria-label="ดูข้อมูลผู้ใช้"
                      icon={<Eye size={14} />}
                      onClick={() => setSelected(u)}
                    />
                    <Button
                      size="small"
                      aria-label="แก้ไขผู้ใช้"
                      icon={<Pencil size={14} />}
                      onClick={() => setEditing(u)}
                    />
                    <Button
                      size="small"
                      aria-label="เปลี่ยนสถานะผู้ใช้"
                      disabled={u.id === user.id}
                      icon={<Power size={14} />}
                      onClick={() =>
                        modal.confirm({
                          title:
                            u.status === "ACTIVE"
                              ? "ระงับผู้ใช้งาน?"
                              : "เปิดใช้งานผู้ใช้?",
                          content: `${u.firstName} ${u.lastName}`,
                          okText: "ยืนยัน",
                          cancelText: "กลับ",
                          onOk: () =>
                            action.mutateAsync({
                              ...u,
                              status:
                                u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
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
        <UserEditor user={editing} onClose={() => setEditing(undefined)} />
      )}
      <Modal
        open={!!selected}
        title="ข้อมูลผู้ใช้งาน"
        onCancel={() => setSelected(undefined)}
        footer={<Button onClick={() => setSelected(undefined)}>ปิด</Button>}
      >
        {selected && (
          <Descriptions
            column={1}
            items={[
              {
                key: "name",
                label: "ชื่อ",
                children: `${selected.firstName} ${selected.lastName}`,
              },
              { key: "id", label: "รหัสผู้ใช้งาน", children: selected.id },
              { key: "email", label: "Email", children: selected.email },
              {
                key: "phone",
                label: "เบอร์โทรศัพท์",
                children: selected.phone,
              },
              { key: "role", label: "Role", children: selected.role },
              {
                key: "status",
                label: "Status",
                children: statusLabels[selected.status],
              },
            ]}
          />
        )}
      </Modal>
    </>
  );
}
