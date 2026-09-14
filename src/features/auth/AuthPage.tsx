import { ThemeToggle } from "../../components/common/ThemeToggle";
import { fieldLabels } from "../../config/fieldLabels";
import { App, Alert, Button, Form, Input, Segmented } from "antd";
import { BookOpen, ArrowRight, Mail, LockKeyhole } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAction } from "../../services/queries";
import { mockService } from "../../services/mockService";
import { useAuth } from "../../stores/authStore";
import styles from "./Auth.module.css";
const loginSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้หรืออีเมล"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
    id: z.string().trim().min(3, "กรุณากรอกรหัสผู้ใช้งาน"),
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    phone: z.string().regex(/^0[0-9]{8,9}$/, "เบอร์โทรต้องมี 9–10 หลัก"),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
export function LoginPage() {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "student@university.ac.th",
      password: "Demo1234!",
    },
  });
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuth((s) => s.setUser);
  const mutation = useAction((data: LoginValues) =>
    mockService.login(data.username, data.password),
  );
  const { modal } = App.useApp();
  return (
    <div className={styles.auth}>
      <ThemeToggle className={styles.themeToggle} />
      <div className={styles.authCard}>
        <Link className={styles.logo} to="/rooms">
          <BookOpen size={25} />
          Classroom
        </Link>
        <span className={styles.eyebrow}>YOUR LEARNING SPACE</span>
        <h1>ยินดีต้อนรับกลับมา</h1>
        <p>เข้าสู่ระบบเพื่อค้นหาและจองห้องเรียนของคุณ</p>
        <div className={styles.demo}>
          <strong>ทดลองใช้งานระบบ</strong>
          <Segmented
            block
            options={[
              { label: "นักศึกษา", value: "student" },
              { label: "ผู้ดูแลระบบ", value: "admin" },
            ]}
            onChange={(v) => {
              setValue("username", `${v}@university.ac.th`);
              setValue("password", "Demo1234!");
            }}
          />
          <small>รหัสผ่านสำหรับบัญชีตัวอย่าง: Demo1234!</small>
        </div>
        <Form
          layout="vertical"
          onFinish={handleSubmit((data) =>
            mutation.mutate(data, {
              onSuccess: (user) => {
                setUser(user);
                const from = (location.state as { from?: string } | null)?.from;
                navigate(
                  from && from.startsWith("/") && !from.startsWith("//")
                    ? from
                    : user.role === "ADMIN"
                      ? "/admin/dashboard"
                      : "/rooms",
                );
              },
            }),
          )}
        >
          <Form.Item
            label="ชื่อผู้ใช้หรืออีเมล"
            required
            validateStatus={errors.username ? "error" : ""}
            help={errors.username?.message}
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  prefix={<Mail size={16} />}
                  autoComplete="username"
                />
              )}
            />
          </Form.Item>
          <Form.Item
            label="รหัสผ่าน"
            required
            validateStatus={errors.password ? "error" : ""}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  aria-label={fieldLabels[field.name] ?? field.name}
                  prefix={<LockKeyhole size={16} />}
                  autoComplete="current-password"
                />
              )}
            />
          </Form.Item>
          <Button
            type="link"
            className={styles.forgot}
            onClick={() =>
              modal.info({
                title: "ลืมรหัสผ่าน",
                content:
                  "สำหรับระบบต้นแบบ ใช้รหัสผ่าน Demo1234! กับบัญชีตัวอย่าง หากเป็นบัญชีที่ลงทะเบียนใหม่ กรุณาติดต่อผู้ดูแลระบบที่ฝ่ายอาคารสถานที่เพื่อขอความช่วยเหลือ",
              })
            }
          >
            ลืมรหัสผ่าน
          </Button>
          {mutation.error && (
            <Alert type="error" title={mutation.error.message} />
          )}
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
          >
            เข้าสู่ระบบ <ArrowRight size={17} />
          </Button>
        </Form>
        <p className={styles.switch}>
          ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
        </p>
        <Link className={styles.browse} to="/rooms">
          ดูห้องเรียนก่อนเข้าสู่ระบบ
        </Link>
      </div>
      <div className={styles.caption}>
        Classroom Booking System · พื้นที่สำหรับทุกการเรียนรู้
      </div>
    </div>
  );
}
export function RegisterPage() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      id: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
  const navigate = useNavigate();
  const mutation = useAction(
    (data: RegisterValues) =>
      mockService.register({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "USER",
        status: "ACTIVE",
        registeredAt: new Date().toISOString(),
      }),
    "สมัครสมาชิกสำเร็จ",
  );
  const fields: { name: keyof RegisterValues; label: string }[] = [
    { name: "firstName", label: "ชื่อ" },
    { name: "lastName", label: "นามสกุล" },
    { name: "id", label: "รหัสนักศึกษา / รหัสผู้ใช้งาน" },
    { name: "email", label: "Email" },
    { name: "phone", label: "เบอร์โทรศัพท์" },
    { name: "password", label: "Password" },
    { name: "confirmPassword", label: "Confirm Password" },
  ];
  return (
    <div className={styles.auth}>
      <ThemeToggle className={styles.themeToggle} />
      <div className={`${styles.authCard} ${styles.register}`}>
        <Link className={styles.logo} to="/rooms">
          <BookOpen size={25} />
          Classroom
        </Link>
        <h1>สมัครสมาชิก</h1>
        <p>เริ่มต้นจองพื้นที่การเรียนรู้ของคุณ</p>
        <Form
          layout="vertical"
          onFinish={handleSubmit((data) =>
            mutation.mutate(data, { onSuccess: () => navigate("/login") }),
          )}
        >
          <div className={styles.registerGrid}>
            {fields.map(({ name, label }) => (
              <Form.Item
                key={name}
                label={label}
                required
                validateStatus={errors[name] ? "error" : ""}
                help={errors[name]?.message}
              >
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) =>
                    name.toLowerCase().includes("password") ? (
                      <Input.Password
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                        autoComplete="new-password"
                      />
                    ) : (
                      <Input
                        {...field}
                        aria-label={fieldLabels[field.name] ?? field.name}
                      />
                    )
                  }
                />
              </Form.Item>
            ))}
          </div>
          {mutation.error && (
            <Alert type="error" title={mutation.error.message} />
          )}
          <Button
            block
            htmlType="submit"
            type="primary"
            loading={mutation.isPending}
          >
            สมัครสมาชิก
          </Button>
        </Form>
        <p className={styles.switch}>
          มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}
