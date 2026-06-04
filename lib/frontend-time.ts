export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getTodayLocalDay() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildLocalDayLabel(localDay: string) {
  const [year, month, day] = localDay.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function buildIsoForLocalDay(localDay: string, hour: number, minute: number) {
  const [year, month, day] = localDay.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0);
  return date.toISOString();
}

export function formatTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}
