import { RoomImage } from '../../components/common/RoomImage'
import { useEffect, useState } from 'react'
import { Alert, Button, DatePicker, Form, Input, InputNumber, Select, Steps, TimePicker } from 'antd'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { classroomsApi } from '../../api/classrooms'
import { useBusinessRules, useClassrooms, useAction } from '../../services/queries'
import { createBookingSchema } from '../../schemas/bookingSchema'
import type { BookingDraft } from '../../types'
import { PageHeader, Panel, QueryState } from '../../components/common/Common'
import { getEquipmentLabel } from '../../constants/bookingStatus'
import styles from './Booking.module.css'

const BOOKING_TIME_STEP = 30

type BookableTimeRange = {
  earliest: number
  close: number
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function nextHalfHour(now: dayjs.Dayjs) {
  const currentMinutes = now.hour() * 60 + now.minute()
  return Math.ceil((currentMinutes + 1) / BOOKING_TIME_STEP) * BOOKING_TIME_STEP
}

function getBookableTimeRange(date: string, openTime: string, closeTime: string, now = dayjs()): BookableTimeRange {
  const open = timeToMinutes(openTime)
  const close = timeToMinutes(closeTime)
  const isToday = dayjs(date).isSame(now, 'day')

  return {
    earliest: isToday ? Math.max(open, nextHalfHour(now)) : open,
    close,
  }
}

function getDefaultBookingWindow(openTime: string, closeTime: string) {
  const now = dayjs()
  const today = now.format('YYYY-MM-DD')
  const todayRange = getBookableTimeRange(today, openTime, closeTime, now)
  const hasTimeToday = todayRange.earliest + BOOKING_TIME_STEP <= todayRange.close
  const date = hasTimeToday ? today : now.add(1, 'day').format('YYYY-MM-DD')
  const range = hasTimeToday ? todayRange : getBookableTimeRange(date, openTime, closeTime, now)
  const start = range.earliest

  return {
    date,
    start: minutesToTime(start),
    end: minutesToTime(Math.min(start + 60, range.close)),
  }
}

function disabledBookingTimes(range: BookableTimeRange, field: 'start' | 'end', selectedStart: string) {
  const earliest = field === 'end' && selectedStart ? Math.max(range.earliest, timeToMinutes(selectedStart) + BOOKING_TIME_STEP) : range.earliest
  const latest = field === 'start' ? range.close - BOOKING_TIME_STEP : range.close
  const availableSlots = Array.from(
    { length: Math.max(0, Math.floor((latest - earliest) / BOOKING_TIME_STEP) + 1) },
    (_, index) => earliest + index * BOOKING_TIME_STEP,
  )

  return {
    disabledHours: () =>
      Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => !availableSlots.some((slot) => Math.floor(slot / 60) === hour)),
    disabledMinutes: (hour: number) =>
      Array.from({ length: 60 }, (_, minute) => minute).filter((minute) => !availableSlots.includes(hour * 60 + minute)),
  }
}

export function BookingPage() {
  const { t } = useTranslation()
  const query = useClassrooms({ limit: 100 })
  const rulesQuery = useBusinessRules()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const initial = (location.state as { draft?: BookingDraft } | null)?.draft
  const bookingOpenTime = rulesQuery.data?.bookingOpenTime ?? '08:00'
  const bookingCloseTime = rulesQuery.data?.bookingCloseTime ?? '20:00'
  const defaultWindow = getDefaultBookingWindow(bookingOpenTime, bookingCloseTime)
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BookingDraft>({
    resolver: zodResolver(createBookingSchema(t)),
    defaultValues: initial ?? {
      roomId: params.get('room') || '',
      date: params.get('date') || defaultWindow.date,
      start: params.get('start') || defaultWindow.start,
      end: params.get('end') || defaultWindow.end,
      attendees: 1,
      purpose: '',
      equipment: [],
      note: '',
    },
  })
  const roomId = useWatch({ control, name: 'roomId' })
  const bookingDate = useWatch({ control, name: 'date' })
  const bookingStart = useWatch({ control, name: 'start' })
  const bookingEnd = useWatch({ control, name: 'end' })
  const bookableTimeRange = getBookableTimeRange(bookingDate, bookingOpenTime, bookingCloseTime)

  useEffect(() => {
    if (!bookingDate) return

    const range = getBookableTimeRange(bookingDate, bookingOpenTime, bookingCloseTime)
    const start = timeToMinutes(bookingStart)
    const end = timeToMinutes(bookingEnd)
    const validStart = start >= range.earliest && start + BOOKING_TIME_STEP <= range.close

    if (!validStart) {
      setValue('start', minutesToTime(range.earliest), { shouldValidate: true })
      setValue('end', minutesToTime(Math.min(range.earliest + 60, range.close)), { shouldValidate: true })
      return
    }

    if (end <= start || end > range.close) {
      setValue('end', minutesToTime(Math.min(start + 60, range.close)), { shouldValidate: true })
    }
  }, [bookingCloseTime, bookingDate, bookingEnd, bookingOpenTime, bookingStart, setValue])

  const room = query.data?.items.find((r) => r.id === roomId)
  const check = useAction(async (draft: BookingDraft) => {
    const availability = await classroomsApi.availabilityForRoom(draft.roomId, {
      startAt: `${draft.date}T${draft.start}:00+07:00`,
      endAt: `${draft.date}T${draft.end}:00+07:00`,
    })
    if (!availability.available) throw new Error(t('bookingAvailabilityError'))
  })
  const submit = handleSubmit(async (draft) => {
    try {
      setError('')
      await check.mutateAsync(draft)
      sessionStorage.setItem('booking-draft', JSON.stringify(draft))
      navigate('/booking/confirm')
    } catch (e) {
      setError((e as Error).message)
    }
  })
  return (
    <>
      <PageHeader title={initial?.editingId ? t('bookingEditTitle') : t('bookingCreateTitle')} subtitle={t('bookingCreateSubtitle')} />
      <Steps
        className={styles.steps}
        current={0}
        items={[{ title: t('bookingStepDetails') }, { title: t('bookingStepConfirm') }, { title: t('bookingStepCompleted') }]}
      />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <div className={styles.layout}>
          <Panel>
            <h2>{t('bookingFormTitle')}</h2>
            {error && <Alert type="error" showIcon title={error} />}
            <Form layout="vertical" onFinish={submit}>
              <div className={styles.formGrid}>
                <Form.Item
                  className={styles.full}
                  label={t('bookingSummaryRoom')}
                  required
                  validateStatus={errors.roomId ? 'error' : ''}
                  help={errors.roomId?.message}
                >
                  <Controller
                    control={control}
                    name="roomId"
                    render={({ field }) => (
                      <Select
                        {...field}
                        aria-label={t('bookingSummaryRoom')}
                        placeholder={t('bookingSelectRoom')}
                        onChange={(v) => {
                          field.onChange(v)
                          setValue('equipment', [])
                        }}
                        options={query.data?.items.map((r) => ({
                          value: r.id,
                          label: `${r.code} · ${r.name} (${t('bookingCapacity', { count: r.capacity })})`,
                          disabled: r.status !== 'ACTIVE',
                        }))}
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item label={t('bookingDate')} required validateStatus={errors.date ? 'error' : ''} help={errors.date?.message}>
                  <Controller
                    control={control}
                    name="date"
                    render={({ field }) => (
                      <DatePicker
                        style={{ width: '100%' }}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(value) => {
                          const date = value?.format('YYYY-MM-DD') || ''
                          field.onChange(date)
                          if (!date) return

                          const range = getBookableTimeRange(date, bookingOpenTime, bookingCloseTime)
                          const start = timeToMinutes(bookingStart)
                          const end = timeToMinutes(bookingEnd)
                          if (start < range.earliest || start + BOOKING_TIME_STEP > range.close) {
                            setValue('start', minutesToTime(range.earliest), { shouldValidate: true })
                            setValue('end', minutesToTime(Math.min(range.earliest + 60, range.close)), { shouldValidate: true })
                          } else if (end <= start || end > range.close) {
                            setValue('end', minutesToTime(Math.min(start + 60, range.close)), { shouldValidate: true })
                          }
                        }}
                        disabledDate={(date) => {
                          if (date.isBefore(dayjs(), 'day')) return true
                          const range = getBookableTimeRange(date.format('YYYY-MM-DD'), bookingOpenTime, bookingCloseTime)
                          return range.earliest + BOOKING_TIME_STEP > range.close
                        }}
                        format="DD/MM/YYYY"
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item label={t('bookingAttendees')} required validateStatus={errors.attendees ? 'error' : ''} help={errors.attendees?.message}>
                  <Controller
                    control={control}
                    name="attendees"
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        aria-label={t('bookingAttendees')}
                        onChange={(v) => field.onChange(v ?? 0)}
                        min={1}
                        max={room?.capacity}
                        style={{ width: '100%' }}
                        suffix={t('bookingPeopleSuffix')}
                      />
                    )}
                  />
                </Form.Item>
                {(['start', 'end'] as const).map((name, i) => (
                  <Form.Item
                    key={name}
                    label={i ? t('bookingEnd') : t('bookingStart')}
                    required
                    validateStatus={errors[name] ? 'error' : ''}
                    help={errors[name]?.message}
                  >
                    <Controller
                      control={control}
                      name={name}
                      render={({ field }) => (
                        <TimePicker
                          style={{ width: '100%' }}
                          format="HH:mm"
                          minuteStep={30}
                          value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                          onChange={(v) => {
                            const time = v?.format('HH:mm') || ''
                            field.onChange(time)
                            if (name !== 'start' || !time) return

                            const start = timeToMinutes(time)
                            const end = timeToMinutes(bookingEnd)
                            if (end <= start || end > bookableTimeRange.close) {
                              setValue('end', minutesToTime(Math.min(start + 60, bookableTimeRange.close)), { shouldValidate: true })
                            }
                          }}
                          disabledTime={() => disabledBookingTimes(bookableTimeRange, name, bookingStart)}
                          needConfirm={false}
                        />
                      )}
                    />
                  </Form.Item>
                ))}
                <Form.Item
                  className={styles.full}
                  label={t('bookingPurpose')}
                  required
                  validateStatus={errors.purpose ? 'error' : ''}
                  help={errors.purpose?.message}
                >
                  <Controller
                    control={control}
                    name="purpose"
                    render={({ field }) => (
                      <Input.TextArea
                        {...field}
                        aria-label={t('bookingPurpose')}
                        rows={3}
                        placeholder={t('bookingPurposePlaceholder')}
                        maxLength={500}
                        showCount
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item className={styles.full} label={t('bookingEquipment')}>
                  <Controller
                    control={control}
                    name="equipment"
                    render={({ field }) => (
                      <Select
                        {...field}
                        aria-label={t('bookingEquipment')}
                        mode="multiple"
                        placeholder={t('bookingSelectEquipment')}
                        options={room?.equipment.map((value) => ({
                          value,
                          label: getEquipmentLabel(t, value),
                        }))}
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item className={styles.full} label={t('bookingNote')}>
                  <Controller
                    control={control}
                    name="note"
                    render={({ field }) => (
                      <Input.TextArea {...field} aria-label={t('bookingNote')} rows={2} maxLength={500} placeholder={t('bookingNotePlaceholder')} />
                    )}
                  />
                </Form.Item>
              </div>
              <div className={styles.actions}>
                <Button onClick={() => navigate('/rooms')}>{t('bookingCancel')}</Button>
                <Button type="primary" htmlType="submit" loading={check.isPending}>
                  {t('bookingReview')}
                </Button>
              </div>
            </Form>
          </Panel>
          <aside>
            <Panel>
              {room ? (
                <>
                  <RoomImage className={styles.roomPreview} src={room.image} alt={room.name} />
                  <h2>
                    {room.name} {room.code}
                  </h2>
                  <p className={styles.hint}>
                    {t('roomScheduleBuildingFloor', { building: room.building, floor: room.floor, capacity: room.capacity })}
                    <br />
                    {t('bookingCapacity', { count: room.capacity })}
                  </p>
                </>
              ) : (
                <h2>{t('bookingRoomPreview')}</h2>
              )}
              <Alert
                type="info"
                showIcon
                title={t('bookingRulesTitle')}
                description={t('bookingRulesInfo', {
                  open: rulesQuery.data?.bookingOpenTime ?? '08:00',
                  close: rulesQuery.data?.bookingCloseTime ?? '20:00',
                  days: rulesQuery.data?.bookingMaxAdvanceDays ?? 90,
                })}
              />
            </Panel>
          </aside>
        </div>
      </QueryState>
    </>
  )
}
