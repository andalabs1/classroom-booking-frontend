import { NotificationBell } from '../features/notifications/NotificationBell'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { App, Avatar, Button, Drawer, Dropdown, Tooltip } from 'antd'
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
  UserRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { userMenuConfig } from '../config/userMenuConfig'
import { adminMenuConfig } from '../config/adminMenuConfig'
import { getAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import styles from './AppLayout.module.css'
export function AppLayout({ admin = false }: { admin?: boolean }) {
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const portal = admin ? 'admin' : 'user'
  const authStore = getAuthStore(portal)
  const user = authStore((s) => s.user)
  const logout = authStore((s) => s.logout)
  const { modal } = App.useApp()
  const menus = admin ? adminMenuConfig : userMenuConfig
  const active = menus.find((m) => location.pathname === m.path || location.pathname.startsWith(m.path + '/'))
  const help = () =>
    modal.info({
      title: t('helpTitle'),
      content: (
        <>
          <p>{t('helpFlow')}</p>
          <p>{t('helpDescription')}</p>
          <p>{t('helpContact')}</p>
        </>
      ),
    })
  const sidebar = (
    <>
      <Link to="/rooms" className={styles.brand} aria-label={t('brandAria')} onClick={() => setDrawer(false)}>
        <span className={styles.brandIcon}>
          <BookOpen size={24} />
        </span>
        <span>
          Classroom<span className={styles.brandSub}>BOOKING SYSTEM</span>
        </span>
      </Link>
      <div className={styles.sectionLabel}>{admin ? t('authAdminWorkspace') : t('sidebarWorkspace')}</div>
      <nav className={styles.nav}>
        {menus.map((item) => {
          const link = (
            <NavLink
              to={item.path}
              aria-label={t(item.key)}
              onClick={() => setDrawer(false)}
              className={({ isActive }) => (isActive ? styles.active : '')}
            >
              <item.icon size={19} />
              <span>{t(item.key)}</span>
            </NavLink>
          )
          return collapsed ? (
            <Tooltip key={item.path} title={t(item.key)} placement="right">
              {link}
            </Tooltip>
          ) : (
            <span key={item.path}>{link}</span>
          )
        })}
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Sparkles size={18} />
          </span>
          <strong>{t('sidebarTipTitle')}</strong>
          <p>{t('sidebarTipDescription')}</p>
          <Button
            type="link"
            onClick={() => {
              setDrawer(false)
              navigate('/room-schedule')
            }}
          >
            {t('roomsSchedule')} <ChevronRight size={14} />
          </Button>
        </div>
        <button
          className={styles.help}
          onClick={() => {
            setDrawer(false)
            help()
          }}
        >
          <CircleHelp size={18} />
          {t('helpTitle')}
        </button>
        {user?.role === 'ADMIN' && (
          <Link className={styles.help} to={admin ? '/rooms' : '/admin/dashboard'} onClick={() => setDrawer(false)}>
            <ShieldCheck size={18} />
            {admin ? t('sidebarAdminToUser') : t('sidebarUserToAdmin')}
          </Link>
        )}
        <div className={styles.sidebarFoot}>
          <span>Classroom Booking</span>
          <span>v1.0</span>
        </div>
      </div>
    </>
  )
  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <Drawer title={t('menuMain')} open={drawer} onClose={() => setDrawer(false)} placement="left" size={260} styles={{ body: { padding: 0 } }}>
        {sidebar}
      </Drawer>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <Button
              className={styles.mobileToggle}
              type="text"
              aria-label={t('openMenu')}
              icon={<Menu size={21} />}
              onClick={() => setDrawer(true)}
            />
            <Button
              className={styles.desktopToggle}
              type="text"
              aria-label={collapsed ? t('expandMenu') : t('collapseMenu')}
              aria-expanded={!collapsed}
              icon={<PanelLeftClose size={18} />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span>{admin ? t('breadcrumbAdmin') : t('breadcrumbUser')}</span>
            <ChevronRight size={13} />
            <strong>{active ? t(active.key) : t('details')}</strong>
          </div>
          <div className={styles.headerRight}>
            {!admin && user && <NotificationBell key={user.id} user={user} />}
            <ThemeToggle />
            <Tooltip title={t('languageToggle')}>
              <Button
                type="text"
                size="small"
                onClick={() => {
                  const lang = i18n.language === 'th' ? 'en' : 'th'
                  void i18n.changeLanguage(lang)
                  localStorage.setItem('classroom-language', lang)
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
                      key: 'profile',
                      label: t('profile'),
                      icon: <UserRound size={14} />,
                      onClick: () => navigate('/profile'),
                    },
                    {
                      key: 'logout',
                      label: t('logout'),
                      icon: <LogOut size={14} />,
                      onClick: async () => {
                        try {
                          await authApi.logout(portal)
                        } finally {
                          logout()
                        }
                        navigate(admin ? '/admin/login' : '/login')
                      },
                    },
                  ],
                }}
              >
                <button className={styles.profile} aria-label={t('accountMenu', { name: `${user.firstName} ${user.lastName}` })}>
                  <Avatar className={styles.avatar}>{user.firstName.slice(0, 1)}</Avatar>
                  <span>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>{user.role === 'ADMIN' ? t('profileAdmin') : t('student')}</small>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </Dropdown>
            ) : (
              <Button onClick={() => navigate(admin ? '/admin/login' : '/login')}>{t('authLogin')}</Button>
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
            {t('footerTagline')}
          </span>
        </footer>
      </div>
    </div>
  )
}
