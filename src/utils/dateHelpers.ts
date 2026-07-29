const PACIFIC_TIME_ZONE = 'America/Los_Angeles';
const WIB_TIME_ZONE = 'Asia/Jakarta';

function dateInTimeZone(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getPacificDate(date = new Date()): string {
  return dateInTimeZone(PACIFIC_TIME_ZONE, date);
}

export function getWibDate(date = new Date()): string {
  return dateInTimeZone(WIB_TIME_ZONE, date);
}

export function getWibMonth(date = new Date()): string {
  return getWibDate(date).slice(0, 7);
}

export function getWibDayRange(date = new Date()): { start: Date; end: Date } {
  const current = getWibDate(date);
  const [year, month, day] = current.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -7));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getWibMonthRange(date = new Date()): { start: Date; end: Date } {
  const current = getWibMonth(date);
  const [year, month] = current.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, -7));
  const end = new Date(Date.UTC(year, month, 1, -7));
  return { start, end };
}
