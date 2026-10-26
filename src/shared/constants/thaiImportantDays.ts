export type ThaiImportantDay = {
  labelKey: string;
};

const fixedDays: Record<string, ThaiImportantDay[]> = {
  "01-01": [{ labelKey: "calendarNewYear" }],
  "04-06": [{ labelKey: "calendarChakriDay" }],
  "04-13": [{ labelKey: "calendarSongkran" }],
  "04-14": [{ labelKey: "calendarSongkran" }],
  "04-15": [{ labelKey: "calendarSongkran" }],
  "05-01": [{ labelKey: "calendarLabourDay" }],
  "05-04": [{ labelKey: "calendarCoronationDay" }],
  "06-03": [{ labelKey: "calendarQueenBirthday" }],
  "07-28": [{ labelKey: "calendarKingBirthday" }],
  "08-12": [{ labelKey: "calendarMothersDay" }],
  "10-13": [{ labelKey: "calendarMemorialDay" }],
  "10-23": [{ labelKey: "calendarChulalongkornDay" }],
  "12-05": [{ labelKey: "calendarFathersDay" }],
  "12-10": [{ labelKey: "calendarConstitutionDay" }],
  "12-31": [{ labelKey: "calendarNewYearEve" }],
};

// Lunar holidays and substitute holidays are published annually. Keep each year's
// confirmed dates here so the calendar never guesses a lunar-calendar conversion.
const yearSpecificDays: Record<string, ThaiImportantDay[]> = {
  "2026-01-02": [{ labelKey: "calendarSpecialHoliday" }],
  "2026-03-03": [{ labelKey: "calendarMakhaBucha" }],
  "2026-06-01": [{ labelKey: "calendarVisakhaBuchaSubstitute" }],
  "2026-07-29": [{ labelKey: "calendarAsarnhaBucha" }],
  "2026-07-30": [{ labelKey: "calendarBuddhistLent" }],
  "2026-12-07": [{ labelKey: "calendarFathersDaySubstitute" }],
};

export function getThaiImportantDays(dateKey: string): ThaiImportantDay[] {
  return [
    ...(fixedDays[dateKey.slice(5)] ?? []),
    ...(yearSpecificDays[dateKey] ?? []),
  ];
}
