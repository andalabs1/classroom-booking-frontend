import { describe, expect, it } from 'vitest'
import { bookingSchema, createBookingSchema } from '../../../src/shared/schemas/bookingSchema'
import { draft } from '../../helpers/fixtures'

const schema = createBookingSchema((key) => `translated:${key}`)
describe('booking draft validation', () => {
  it('trims the purpose, accepts editing IDs, and removes server-only fields', () => {
    expect(schema.parse({ ...draft, purpose: '  Project meeting  ', editingId: '12', status: 'APPROVED', userId: '42' })).toEqual({ ...draft, editingId: '12' })
  })
  it.each(['roomId', 'date', 'start', 'end'] as const)('rejects an empty %s', (field) => {
    const result = schema.safeParse({ ...draft, [field]: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual([field])
  })
  it.each([0, -1, 1.5, '10', null])('rejects invalid attendee count %s', (attendees) => {
    expect(schema.safeParse({ ...draft, attendees }).success).toBe(false)
  })
  it.each(['', 'abcd', '     '])('rejects a purpose shorter than five trimmed characters', (purpose) => {
    const result = schema.safeParse({ ...draft, purpose })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('translated:bookingValidationPurpose')
  })
  it('requires string equipment items and a string note', () => {
    expect(schema.safeParse({ ...draft, equipment: [1] }).success).toBe(false)
    expect(schema.safeParse({ ...draft, note: null }).success).toBe(false)
  })
  it('validates a stored draft with the shared confirmation schema', () => {
    expect(bookingSchema.parse(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
    expect(bookingSchema.safeParse(null).success).toBe(false)
  })
})
