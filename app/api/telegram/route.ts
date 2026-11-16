import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendTelegramNotification, getTodayAttendanceSummary } from "@/utils/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const message = update?.message || update?.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const text = (message.text || "").trim().toLowerCase();

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Команды бота: /today, /start, /stat, "отметки", "сегодня", "статус" и любые сообщения
    if (
      text.includes("/today") ||
      text.includes("/start") ||
      text.includes("/stat") ||
      text.includes("отметк") ||
      text.includes("сегодня") ||
      text.includes("кто") ||
      text === "/status" ||
      text === "статус" ||
      text === "?"
    ) {
      const summary = await getTodayAttendanceSummary(supabaseAdmin);
      await sendTelegramNotification(summary, chatId ? [String(chatId)] : undefined);
    } else {
      // Подсказка по командам
      const helpMsg = 
        `👋 Здравствуйте!\n\n` +
        `Отправьте команду <b>/today</b> или напишите <b>«отметки»</b>, чтобы получить список отметок сотрудников за сегодня.`;
      await sendTelegramNotification(helpMsg, chatId ? [String(chatId)] : undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const summary = await getTodayAttendanceSummary(supabaseAdmin);
  return new NextResponse(summary, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
