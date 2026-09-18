import { NotificationBell } from "../features/notifications/NotificationBell";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { App, Avatar, Button, Drawer, Dropdown, Tooltip } from "antd";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { userMenuConfig } from "../config/userMenuConfig";
import { adminMenuConfig } from "../config/adminMenuConfig";
import { useAuth } from "../stores/authStore";
import { authApi } from "../api/auth";
import styles from "./AppLayout.module.css";
export function AppLayout({ admin = false }: { admin?: boolean }) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { modal } = App.useApp();
  const menus = admin ? adminMenuConfig : userMenuConfig;
  const active = menus.find(
    (m) =>
      location.pathname === m.path ||
      location.pathname.startsWith(m.path + "/"),
  );
  const help = () =>
    modal.info({
      title: "ศูนย์ช่วยเหลือ",
      content: (
        <>
          <p>เลือกห้อง → ดูตาราง → กรอกข้อมูล → ยืนยันการจอง</p>
          <p>
            จองห้องได้เวลา 08:00–20:00 น. รายการจะรอการอนุมัติจากเจ้าหน้าที่
            สามารถแก้ไขรายการรออนุมัติหรือยกเลิกก่อนเวลาเริ่มใช้งาน
          </p>
          <p>ติดต่อฝ่ายอาคารสถานที่: 02-123-4567 ต่อ 101</p>
        </>
      ),
    });
  const sidebar = (
    <>
      <Link
        to="/rooms"
        className={styles.brand}
        aria-label="Classroom หน้าห้องเรียน"
        onClick={() => setDrawer(false)}
      >
        <span className={styles.brandIcon}>
          <BookOpen size={24} />
        </span>
        <span>
          Classroom<span className={styles.brandSub}>BOOKING SYSTEM</span>
        </span>
      </Link>
      <div className={styles.sectionLabel}>
        {admin ? "ADMIN WORKSPACE" : "WORKSPACE"}
      </div>
      <nav className={styles.nav}>
        {menus.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={admin ? item.title : t(item.key)}
            title={collapsed ? (admin ? item.title : t(item.key)) : undefined}
            onClick={() => setDrawer(false)}
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            <item.icon size={19} />
            <span>{admin ? item.title : t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Sparkles size={18} />
          </span>
          <strong>พื้นที่ดี ๆ เริ่มต้นการเรียนรู้</strong>
          <p>
            เลือกห้องที่เหมาะกับคุณ
            <br />
            แล้วมาเรียนรู้ไปด้วยกัน
          </p>
          <Button
            type="link"
            onClick={() => {
              setDrawer(false);
              navigate("/room-schedule");
            }}
          >
            ดูตารางการใช้ห้อง <ChevronRight size={14} />
          </Button>
        </div>
        <button
          className={styles.help}
          onClick={() => {
            setDrawer(false);
            help();
          }}
        >
          <CircleHelp size={18} />
          ศูนย์ช่วยเหลือ
        </button>
        {user?.role === "ADMIN" && (
          <Link
            className={styles.help}
            to={admin ? "/rooms" : "/admin/dashboard"}
            onClick={() => setDrawer(false)}
          >
            <ShieldCheck size={18} />
            {admin ? "หน้าผู้ใช้งาน" : "Admin Back Office"}
          </Link>
        )}
        <div className={styles.sidebarFoot}>
          <span>Classroom Booking</span>
          <span>v1.0</span>
        </div>
      </div>
    </>
  );
  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <Drawer
        title="เมนูหลัก"
        open={drawer}
        onClose={() => setDrawer(false)}
        placement="left"
        size={260}
        styles={{ body: { padding: 0 } }}
      >
        {sidebar}
      </Drawer>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <Button
              className={styles.mobileToggle}
              type="text"
              aria-label="เปิดเมนู"
              icon={<Menu size={21} />}
              onClick={() => setDrawer(true)}
            />
            <Button
              className={styles.desktopToggle}
              type="text"
              aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
              aria-expanded={!collapsed}
              icon={<PanelLeftClose size={18} />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span>{admin ? "ผู้ดูแลระบบ" : "หน้าหลัก"}</span>
            <ChevronRight size={13} />
            <strong>
              {active ? (admin ? active.title : t(active.key)) : "รายละเอียด"}
            </strong>
          </div>
          <div className={styles.headerRight}>
            {user && <NotificationBell key={user.id} user={user} />}
            <ThemeToggle />
            <Tooltip title="Change language">
              <Button
                type="text"
                size="small"
                onClick={() => {
                  const lang = i18n.language === "th" ? "en" : "th";
                  void i18n.changeLanguage(lang);
                  localStorage.setItem("classroom-language", lang);
                }}
              >
                {i18n.language.toUpperCase()} <ChevronDown size={11} />
              </Button>
            </Tooltip>
            <span className={styles.headerDivider} />
            {user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "logout",
                      label: t("logout"),
                      icon: <LogOut size={14} />,
                      onClick: async () => {
                        try {
                          await authApi.logout();
                        } finally {
                          logout();
                        }
                        navigate("/login");
                      },
                    },
                  ],
                }}
              >
                <button
                  className={styles.profile}
                  aria-label={`เมนูบัญชี ${user.firstName} ${user.lastName}`}
                >
                  <Avatar className={styles.avatar}>
                    {user.firstName.slice(0, 1)}
                  </Avatar>
                  <span>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>
                      {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "นักศึกษา"}
                    </small>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </Dropdown>
            ) : (
              <Button onClick={() => navigate("/login")}>เข้าสู่ระบบ</Button>
            )}
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Classroom Booking System</span>
          <span>
            <GraduationCap size={14} />
            พื้นที่สำหรับทุกการเรียนรู้
          </span>
        </footer>
      </div>
    </div>
  );
}
