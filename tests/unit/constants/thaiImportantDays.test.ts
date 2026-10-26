import { describe, expect, it } from 'vitest'
import { getThaiImportantDays } from '../../../src/shared/constants/thaiImportantDays'

describe('calendar label lookup', () => {
  it('uses fixed month/day labels across years', () => {
    expect(getThaiImportantDays('2026-01-01')).toEqual([{ labelKey: 'calendarNewYear' }])
    expect(getThaiImportantDays('2027-01-01')).toEqual([{ labelKey: 'calendarNewYear' }])
  })
  it('uses year-specific dates only for the configured year', () => {
    expect(getThaiImportantDays('2026-03-03')).toEqual([{ labelKey: 'calendarMakhaBucha' }])
    expect(getThaiImportantDays('2027-03-03')).toEqual([])
  })
  it('returns no labels for an ordinary date', () => {
    expect(getThaiImportantDays('2026-10-26')).toEqual([])
  })
})
