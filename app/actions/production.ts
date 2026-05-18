"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function uploadProductionLog(base64Image: string) {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    
    if (!user) return { success: false, error: "Необходима авторизация" };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: false, error: "API ключ Gemini не настроен" };

    // Извлекаем чистый base64 без data:image/jpeg;base64,
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1] || "image/jpeg";

    const genAI = new GoogleGenerativeAI(apiKey);
    // Используем gemini-1.5-flash для скорости и цены
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Ты — учетчик на заводе. На фото рукописный отчет о произведенной продукции сотрудником за день. 
Твоя задача вытащить данные в формате JSON-массива. 
Каждый объект массива должен содержать:
- "product_name": строковое название детали/продукции.
- "quantity": числовое количество.
Игнорируй помарки. Верни СТРОГО массив JSON без markdown-разметки (\`\`\`json) и без лишнего текста.
Пример: [{"product_name": "Деталь А", "quantity": 15}, {"product_name": "Деталь Б", "quantity": 5}]`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text();
    let parsedData = [];
    
    try {
      // Очистка от маркдауна если он всё же есть
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", responseText);
      return { success: false, error: "ИИ не смог распознать данные в нужном формате" };
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return { success: false, error: "Не найдено данных о выработке на фото" };
    }

    // Сохранение в Supabase
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Текущая дата сотрудника (локальная)
    const recordDate = new Date().toISOString().split('T')[0];

    const inserts = parsedData.map((item: any) => ({
      employee_id: user.id,
      product_name: item.product_name,
      quantity: parseInt(item.quantity) || 0,
      record_date: recordDate
    })).filter(i => i.quantity > 0 && i.product_name);

    if (inserts.length === 0) return { success: false, error: "Распознаны невалидные данные" };

    const { error: insertError } = await supabaseAdmin
      .from('production_logs')
      .insert(inserts);

    if (insertError) {
      return { success: false, error: "Ошибка сохранения в базу: " + insertError.message };
    }

    return { success: true, data: inserts };

  } catch (error: any) {
    console.error("Production Upload Exception:", error);
    return { success: false, error: `Системная ошибка: ${error.message || "Неизвестная ошибка"}` };
  }
}
