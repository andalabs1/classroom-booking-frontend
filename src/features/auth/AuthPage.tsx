import { ThemeToggle } from '../../components/common/ThemeToggle'
import { App, Alert, Button, Form, Input } from 'antd'
import { BookOpen, ArrowRight, Mail, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAction } from '../../services/queries'
import { authApi } from '../../api/auth'
import { getAuthStore } from '../../stores/authStore'
import styles from './Auth.module.css'
type Translate = (key: string, options?: Record<string, unknown>) => string
type LoginValues = { username: string; password: string }
type RegisterValues = {
  firstName: string
  lastName: string
  id: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}
const createLoginSchema = (t: Translate) =>
  z.object({
    username: z.string().min(1, t('validationUsername')),
    password: z.string().min(1, t('validationPassword')),
  })
const createRegisterSchema = (t: Translate) =>
  z
    .object({
      firstName: z.string().trim().min(1, t('validationFirstName')),
      lastName: z.string().trim().min(1, t('validationLastName')),
      id: z.string().trim().min(3, t('validationUserCode')),
      email: z.string().email(t('validationEmail')),
      phone: z.string().regex(/^0[0-9]{8,9}$/, t('validationPhone')),
      password: z.string().min(8, t('validationRegisterPassword')),
      confirmPassword: z.string().min(1, t('validationConfirmPassword')),
    })
    .refine((v) => v.password === v.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validationRegisterPasswordMismatch'),
    })
type LoginPortal = 'user' | 'admin'

function AuthVisualPanel() {
  const { t } = useTranslation()

  return (
    <aside className={styles.visualPanel}>
      <img className={styles.visualImage} src="/auth-learning-collage.png" alt="" />
      <div className={styles.visualCopy}>
        <span>{t('authVisualKicker')}</span>
        <h2>{t('authVisualTitle')}</h2>
        <p>{t('authVisualDescription')}</p>
      </div>
    </aside>
  )
}

export function LoginPage({ portal = 'user' }: { portal?: LoginPortal }) {
  const { t } = useTranslation()
  const isAdminPortal = portal === 'admin'
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: {
      username: '',
      password: '',
    },
  })
  const navigate = useNavigate()
  const location = useLocation()
  const authStore = getAuthStore(portal)
  const setSession = authStore((s) => s.setSession)
  const mutation = useAction((data: LoginValues) => authApi.login(data))
  const { modal } = App.useApp()
  return (
    <div className={`${styles.auth} ${styles.loginAuth} ${isAdminPortal ? styles.adminAuth : ''}`}>
      <ThemeToggle className={styles.themeToggle} />
      <main className={styles.loginShell}>
        <AuthVisualPanel />
        <section className={styles.loginContent}>
          <div className={styles.authCard}>
            <Link className={styles.logo} to="/rooms">
              <BookOpen size={25} />
              Classroom
            </Link>
            <span className={styles.eyebrow}>{isAdminPortal ? t('authAdminWorkspace') : t('authLearningSpace')}</span>
            {isAdminPortal && (
              <span className={styles.portalBadge}>
                <ShieldCheck size={14} /> {t('adminPortal')}
              </span>
            )}
            <h1>{isAdminPortal ? t('adminLoginTitle') : t('userLoginTitle')}</h1>
            <p>{isAdminPortal ? t('adminLoginSubtitle') : t('userLoginSubtitle')}</p>
            <Form
              layout="vertical"
              onFinish={handleSubmit((data) =>
                mutation.mutate(data, {
                  onSuccess: ({ user, token }) => {
                    if ((user.role === 'ADMIN') !== isAdminPortal) {
                      modal.error({
                        title: t('wrongPortalTitle'),
                        content: user.role === 'ADMIN' ? t('wrongPortalAdmin') : t('wrongPortalUser'),
                      })
                      return
                    }
                    setSession(user, token)
                    const from = (location.state as { from?: string } | null)?.from
                    const validFrom = isAdminPortal
                      ? from?.startsWith('/admin/')
                      : from?.startsWith('/') && !from.startsWith('//') && !from.startsWith('/admin/')
                    const destination = validFrom && from ? from : isAdminPortal ? '/admin/dashboard' : '/rooms'
                    navigate(destination)
                  },
                }),
              )}
            >
              <Form.Item label={t('authUsername')} required validateStatus={errors.username ? 'error' : ''} help={errors.username?.message}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => <Input {...field} aria-label={t('authUsername')} prefix={<Mail size={16} />} autoComplete="username" />}
                />
              </Form.Item>
              <Form.Item label={t('authPassword')} required validateStatus={errors.password ? 'error' : ''} help={errors.password?.message}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input.Password {...field} aria-label={t('authPassword')} prefix={<LockKeyhole size={16} />} autoComplete="current-password" />
                  )}
                />
              </Form.Item>
              <Button
                type="link"
                className={styles.forgot}
                onClick={() =>
                  modal.info({
                    title: t('authForgotPasswordTitle'),
                    content: t('authForgotPasswordDescription'),
                  })
                }
              >
                {t('authForgotPassword')}
              </Button>
              {mutation.error && <Alert type="error" title={mutation.error.message} />}
              <Button block type="primary" htmlType="submit" loading={mutation.isPending}>
                {t('authLogin')} <ArrowRight size={17} />
              </Button>
            </Form>
            {isAdminPortal ? (
              <p className={styles.switch}>
                {t('userPortalQuestion')} <Link to="/login">{t('userPortalLink')}</Link>
              </p>
            ) : (
              <p className={styles.switch}>
                {t('noAccountQuestion')} <Link to="/register">{t('registerLink')}</Link>
              </p>
            )}
            <Link className={styles.browse} to="/rooms">
              {t('browseRooms')}
            </Link>
          </div>
          <div className={styles.caption}>{isAdminPortal ? t('authAdminCaption') : t('authCaption')}</div>
        </section>
      </main>
    </div>
  )
}
export function RegisterPage() {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(createRegisterSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      id: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })
  const navigate = useNavigate()
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
    t('authRegisterSuccess'),
  )
  const fields: { name: keyof RegisterValues; label: string }[] = [
    { name: 'firstName', label: t('authFirstName') },
    { name: 'lastName', label: t('authLastName') },
    { name: 'id', label: t('authUserCode') },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: t('authPhone') },
    { name: 'password', label: t('authPassword') },
    { name: 'confirmPassword', label: t('authConfirmPassword') },
  ]
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
            <span className={styles.eyebrow}>{t('authLearningSpace')}</span>
            <h1>{t('authRegisterTitle')}</h1>
            <p>{t('authRegisterSubtitle')}</p>
            <Form layout="vertical" onFinish={handleSubmit((data) => mutation.mutate(data, { onSuccess: () => navigate('/login') }))}>
              <div className={styles.registerGrid}>
                {fields.map(({ name, label }) => (
                  <Form.Item key={name} label={label} required validateStatus={errors[name] ? 'error' : ''} help={errors[name]?.message}>
                    <Controller
                      control={control}
                      name={name}
                      render={({ field }) =>
                        name.toLowerCase().includes('password') ? (
                          <Input.Password {...field} aria-label={label} autoComplete="new-password" />
                        ) : (
                          <Input {...field} aria-label={label} />
                        )
                      }
                    />
                  </Form.Item>
                ))}
              </div>
              {mutation.error && <Alert type="error" title={mutation.error.message} />}
              <Button block htmlType="submit" type="primary" loading={mutation.isPending}>
                {t('authRegisterTitle')}
              </Button>
            </Form>
            <p className={styles.switch}>
              {t('authHaveAccount')} <Link to="/login">{t('authLogin')}</Link>
            </p>
          </div>
          <div className={styles.caption}>{t('authCaption')}</div>
        </section>
      </main>
    </div>
  )
}
