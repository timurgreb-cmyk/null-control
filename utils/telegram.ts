export async function sendTelegramNotification(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatIdsRaw) {
    return;
  }

  // Поддержка нескольких chat_id через запятую или пробел
  const chatIds = chatIdsRaw
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
