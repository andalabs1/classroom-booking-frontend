import { Alert, Avatar, Button, Descriptions, Form, Input, Tag } from 'antd'
import { KeyRound, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usersApi, type UserProfile } from '../../api/users'
import { PageHeader, Panel, QueryState } from '../../components/common/Common'
import { useAction, useMyProfile } from '../../services/queries'
import { useUserAuth } from '../../stores/authStore'
import styles from './Profile.module.css'

type ProfileValues = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'phone'>
type PasswordValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation()
  const token = useUserAuth((state) => state.token)
  const setSession = useUserAuth((state) => state.setSession)
  const update = useAction((values: ProfileValues) => usersApi.updateMe(values), t('profileSaved'))
  const password = useAction(
    (values: PasswordValues) => usersApi.changePassword(values.currentPassword, values.newPassword),
    t('profilePasswordChanged'),
  )

  return (
    <div className={styles.grid}>
      <Panel>
        <div className={styles.sectionTitle}>
          <UserRound size={19} />
          <div>
            <h2>{t('profilePersonalTitle')}</h2>
            <p>{t('profilePersonalDescription')}</p>
          </div>
        </div>
        <Form<ProfileValues>
          layout="vertical"
          initialValues={profile}
          onFinish={(values) =>
            update.mutate(values, {
              onSuccess: (updated) => {
                if (token) setSession(updated, token)
              },
            })
          }
        >
          <div className={styles.formGrid}>
            <Form.Item label={t('profileFirstName')} name="firstName" rules={[{ required: true, message: t('validationFirstName') }]}>
              <Input autoComplete="given-name" />
            </Form.Item>
            <Form.Item label={t('profileLastName')} name="lastName" rules={[{ required: true, message: t('validationLastName') }]}>
              <Input autoComplete="family-name" />
            </Form.Item>
            <Form.Item label={t('profileEmail')} name="email" rules={[{ required: true, type: 'email', message: t('validationEmail') }]}>
              <Input prefix={<Mail size={16} />} autoComplete="email" />
            </Form.Item>
            <Form.Item
              label={t('profilePhone')}
              name="phone"
              rules={[
                { required: true, message: t('validationPhoneRequired') },
                { pattern: /^0[0-9]{8,9}$/, message: t('validationPhone') },
              ]}
            >
              <Input prefix={<Phone size={16} />} autoComplete="tel" />
            </Form.Item>
          </div>
          <div className={styles.actions}>
            <Button type="primary" htmlType="submit" loading={update.isPending}>
              {t('profileSave')} <Save size={16} />
            </Button>
          </div>
        </Form>
      </Panel>

      <div className={styles.side}>
        <Panel>
          <div className={styles.identity}>
            <Avatar size={64} className={styles.avatar}>
              {profile.firstName.slice(0, 1)}
            </Avatar>
            <div>
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              <Tag color={profile.role === 'ADMIN' ? 'purple' : 'blue'}>{profile.role === 'ADMIN' ? t('profileAdmin') : t('profileUser')}</Tag>
            </div>
          </div>
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: 'code', label: t('profileUserCode'), children: profile.userCode ?? '—' },
              { key: 'joined', label: t('profileJoined'), children: profile.registeredAt.slice(0, 10) },
              {
                key: 'status',
                label: t('profileAccountStatus'),
                children: (
                  <span className={styles.active}>
                    <ShieldCheck size={15} /> {t('profileActive')}
                  </span>
                ),
              },
            ]}
          />
        </Panel>

        <Panel>
          <div className={styles.sectionTitle}>
            <KeyRound size={19} />
            <div>
              <h2>{t('profilePasswordTitle')}</h2>
              <p>{t('profilePasswordDescription')}</p>
            </div>
          </div>
          <Form<PasswordValues> layout="vertical" onFinish={(values) => password.mutate(values)}>
            <Form.Item
              label={t('profileCurrentPassword')}
              name="currentPassword"
              rules={[{ required: true, message: t('validationCurrentPassword') }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item label={t('profileNewPassword')} name="newPassword" rules={[{ required: true, min: 8, message: t('validationNewPassword') }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label={t('profileConfirmPassword')}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: t('validationConfirmPassword') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue('newPassword') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('validationPasswordMismatch')))
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            {password.error && <Alert type="error" title={password.error.message} />}
            <Button block htmlType="submit" loading={password.isPending}>
              {t('profileChangePassword')}
            </Button>
          </Form>
        </Panel>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const query = useMyProfile()
  return (
    <>
      <PageHeader title={t('profileTitle')} subtitle={t('profileSubtitle')} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        {query.data && <ProfileForm profile={query.data} />}
      </QueryState>
    </>
  )
}
