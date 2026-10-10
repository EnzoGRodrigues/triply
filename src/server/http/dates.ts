/** "YYYY-MM-DD" que existe de fato no calendário (rejeita 2027-02-30). */
export function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2200) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
