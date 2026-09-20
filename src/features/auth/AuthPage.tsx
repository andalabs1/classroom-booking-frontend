import { ThemeToggle } from "../../components/common/ThemeToggle";
import { fieldLabels } from "../../config/fieldLabels";
import { App, Alert, Button, Form, Input } from "antd";
import { BookOpen, ArrowRight, Mail, LockKeyhole, ShieldCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAction } from "../../services/queries";
import { authApi } from "../../api/auth";
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
type LoginPortal = "user" | "admin";

function AuthVisualPanel() {
  const { t } = useTranslation();

  return (
    <aside className={styles.visualPanel}>
      <img className={styles.visualImage} src="/auth-learning-collage.png" alt="" />
      <div className={styles.visualCopy}>
        <span>{t("authVisualKicker")}</span>
        <h2>{t("authVisualTitle")}</h2>
        <p>{t("authVisualDescription")}</p>
      </div>
    </aside>
  );
}

export function LoginPage({ portal = "user" }: { portal?: LoginPortal }) {
  const { t } = useTranslation();
  const isAdminPortal = portal === "admin";
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuth((s) => s.setSession);
  const mutation = useAction((data: LoginValues) => authApi.login(data));
  const { modal } = App.useApp();
  return (
    <div className={`${styles.auth} ${styles.loginAuth} ${isAdminPortal ? styles.adminAuth : ""}`}>
      <ThemeToggle className={styles.themeToggle} />
      <main className={styles.loginShell}>
        <AuthVisualPanel />
        <section className={styles.loginContent}>
          <div className={styles.authCard}>
            <Link className={styles.logo} to="/rooms">
              <BookOpen size={25} />
              Classroom
            </Link>
            <span className={styles.eyebrow}>{isAdminPortal ? "ADMIN WORKSPACE" : "YOUR LEARNING SPACE"}</span>
            {isAdminPortal && <span className={styles.portalBadge}><ShieldCheck size={14} /> {t("adminPortal")}</span>}
            <h1>{isAdminPortal ? t("adminLoginTitle") : t("userLoginTitle")}</h1>
            <p>{isAdminPortal ? t("adminLoginSubtitle") : t("userLoginSubtitle")}</p>
            <Form
              layout="vertical"
              onFinish={handleSubmit((data) =>
                mutation.mutate(data, {
                  onSuccess: ({ user, token }) => {
                    if ((user.role === "ADMIN") !== isAdminPortal) {
                      modal.error({
                        title: t("wrongPortalTitle"),
                        content: user.role === "ADMIN" ? t("wrongPortalAdmin") : t("wrongPortalUser"),
                      });
                      return;
                    }
                    setSession(user, token);
                    const from = (location.state as { from?: string } | null)?.from;
                    const validFrom = isAdminPortal
                      ? from?.startsWith("/admin/")
                      : from?.startsWith("/") && !from.startsWith("//") && !from.startsWith("/admin/");
                    const destination = validFrom && from
                      ? from
                      : isAdminPortal
                        ? "/admin/dashboard"
                        : "/rooms";
                    navigate(destination);
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
                      "กรุณาติดต่อผู้ดูแลระบบที่ฝ่ายอาคารสถานที่เพื่อขอความช่วยเหลือในการรีเซ็ตรหัสผ่าน",
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
            {isAdminPortal ? (
              <p className={styles.switch}>
                {t("userPortalQuestion")} <Link to="/login">{t("userPortalLink")}</Link>
              </p>
            ) : (
              <p className={styles.switch}>
                {t("noAccountQuestion")} <Link to="/register">{t("registerLink")}</Link>
              </p>
            )}
            <Link className={styles.browse} to="/rooms">
              {t("browseRooms")}
            </Link>
          </div>
          <div className={styles.caption}>
            {isAdminPortal ? "Classroom Booking System · ADMIN" : t("authCaption")}
          </div>
        </section>
      </main>
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
      authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        userCode: data.id,
        email: data.email,
        phone: data.phone,
        password: data.password,
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
    <div className={`${styles.auth} ${styles.loginAuth} ${styles.registerAuth}`}>
      <ThemeToggle className={styles.themeToggle} />
      <main className={styles.loginShell}>
        <AuthVisualPanel />
        <section className={`${styles.loginContent} ${styles.registerContent}`}>
          <div className={`${styles.authCard} ${styles.register}`}>
            <Link className={styles.logo} to="/rooms">
              <BookOpen size={25} />
              Classroom
            </Link>
            <span className={styles.eyebrow}>YOUR LEARNING SPACE</span>
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
          <div className={styles.caption}>Classroom Booking System · พื้นที่สำหรับทุกการเรียนรู้</div>
        </section>
      </main>
    </div>
  );
}
