import { formatLocalTime } from "./date";

const DEFAULT_BOT_TOKEN = "8825585503:AAFiEGFCh9H9azVTKWbhax27YsBhMHuPaLM";
const DEFAULT_CHAT_IDS = "1290448858,570753683";

export async function sendTelegramNotification(text: string, customChatIds?: string[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_IDS;

  if (!token) {
    return;
  }

  // Поддержка нескольких chat_id через запятую или пробел
  const chatIds = customChatIds && customChatIds.length > 0 
    ? customChatIds 
    : chatIdsRaw
        .split(/[,;\s]+/)
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

  for (const chatId of chatIds) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      });
    } catch (err) {
      console.warn(`Telegram notification send error for chat ${chatId}:`, err);
    }
  }
}

export async function getTodayAttendanceSummary(supabaseAdmin: any): Promise<string> {
  const now = new Date();
  
  // Дата в Алматы
  const dateStr = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'short'
  }).format(now);

  // Начало текущего дня в Алматы (UTC+5)
  const almatyDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // Формат: YYYY-MM-DD

  const startOfDayAlmaty = new Date(`${almatyDateParts}T00:00:00+05:00`).toISOString();

  const { data: records, error } = await supabaseAdmin
    .from("time_records")
    .select(`
      id,
      record_type,
      recorded_at,
      employee_id,
      profiles (full_name),
      locations (name)
    `)
    .gte("recorded_at", startOfDayAlmaty)
    .order("recorded_at", { ascending: true });

  if (error || !records || records.length === 0) {
    return `📋 <b>ОТМЕТКИ ЗА СЕГОДНЯ</b>\n📅 <i>${dateStr}</i>\n\n<i>Отметок пока нет. Сотрудники еще не сканировали QR-код.</i>`;
  }

  const checkIns = records.filter((r: any) => r.record_type === 'check_in');
  const checkOuts = records.filter((r: any) => r.record_type === 'check_out');

  // Определяем, кто сейчас на смене (есть приход, но нет ухода)
  const checkedOutEmpIds = new Set(checkOuts.map((r: any) => r.employee_id));
  const activeOnShift = checkIns.filter((r: any) => !checkedOutEmpIds.has(r.employee_id));

  let msg = `📋 <b>ОТМЕТКИ ЗА СЕГОДНЯ</b>\n📅 <i>${dateStr}</i>\n\n`;

  if (checkIns.length > 0) {
    msg += `🟢 <b>ПРИХОД НА СМЕНУ (${checkIns.length}):</b>\n`;
    checkIns.forEach((r: any, idx: number) => {
      const timeStr = formatLocalTime(r.recorded_at);
      const name = r.profiles?.full_name?.trim() || "Сотрудник";
      const loc = r.locations?.name?.trim() || "Локация";
      msg += `${idx + 1}. <b>${name}</b> — <code>${timeStr}</code> (📍 ${loc})\n`;
    });
    msg += `\n`;
  }

  if (checkOuts.length > 0) {
    msg += `🔴 <b>УХОД СО СМЕНЫ (${checkOuts.length}):</b>\n`;
    checkOuts.forEach((r: any, idx: number) => {
      const timeStr = formatLocalTime(r.recorded_at);
      const name = r.profiles?.full_name?.trim() || "Сотрудник";
      const loc = r.locations?.name?.trim() || "Локация";
      msg += `${idx + 1}. <b>${name}</b> — <code>${timeStr}</code> (📍 ${loc})\n`;
    });
    msg += `\n`;
  }

  msg += `👥 <b>Сейчас на смене:</b> ${activeOnShift.length} чел.\n`;
  msg += `📊 <b>Всего отметок:</b> ${records.length}`;

  return msg;
}
