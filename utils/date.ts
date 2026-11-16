export function formatLocalTime(
  isoString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', hour12: false }
): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', options).format(date);
  } catch (e) {
    return '—';
  }
}

/**
 * Конвертирует ISO строку (UTC) в формат "YYYY-MM-DDTHH:mm" для input type="datetime-local" в поясе Asia/Almaty
 */
export function isoToDateTimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Almaty',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    let hour = get('hour');
    if (hour === '24') hour = '00';
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
  } catch {
    return '';
  }
}
