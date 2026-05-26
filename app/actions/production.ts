"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Каталог продукции для точного распознавания рукописного текста
const PRODUCT_CATALOG = `
КАТЕГОРИИ И ПОЗИЦИИ:

МЕЛКОШТУЧКА: Самса, Учпучмак, Пирожок с картофелем, Пирожок с капустой, Пирожное Картошка, Пирожок с брынзой и шпинатом, Пирожок с картошкой и грибами, Пирожок с луком и яйцом, Беляши, Сосиска в тесте, Баурсаки.

МИНИ-ПИРОГИ: Мини семга/рис, Мини курица брынза шпинат, Мини фарш/тыква, Мини пирог капуста-яйцо.

ПИРОГИ МЯСНЫЕ (размеры 24/30/35, половина, четверть): Курица Картофель, Курица Грибы, Фарш Тыква, Фарш Картофель, Семга Рис, Брынза Шпинат, Мясо Картофель, Курица Брынза Шпинат, Капуста Яйцо, Утка Картофель, Картофель Грибы, Губадия.

СЛАДКИЕ ПИРОГИ (размеры 24/30/35, половина, четверть): Трехслойный, Сметанник с персиками, Сметанник с вишней, Сметанник с малиной, Лимонник, Смородиновый, Ассорти (смородина лимон), Курага, Курага Орех, Творог Яблоко, Творожно Маковый, Тропический, Клубничный.

ДЕСЕРТЫ: Вупи Пай, Десерт в стаканчике Красный бархат, Десерт в стаканчике Шоколадный, Кольцо заварное, Муравейник, Муссовый Котик, Маффин ванильный, Леденец на палочке, Рулет Меренга (целый/половина), Чизкейк в имбирном печенье, Чизкейк в шоколадном печенье, Эклер с заварным кремом 100г, Шу 60г, Пломбир на палочке, Рулет с шоколадом, Рулет с орехом, Рулет с малиной.

ТОРТЫ: Брауни весовой, Медовик весовой, Молочная девочка, Морковный, Наполеон весовой, Сметанник с черносливом, Красный бархат, Шоколадный с черносливом, Шоколадный крем чиз.

ХЛЕБ: Хлеб Бородинский, Гриссини упк, Хлеб домашний, Сухари упк, Кефирный хлеб, Хлеб белый, Хлеб День и Ночь, Шелпеки.

БОРЕК: Борек с Курицей, Борек с Брынзой, Борек с Семгой.

БЛИНЫ: Блины творог, Блины фарш, Блины кг.

ЧАК-ЧАК: Чак-чак (230г/350г/400г/500г/750г/1кг/60г), Чак-чак классический кг, Чак-чак колобки 50г, Чак-чак с курагой кг, Чак-чак с изюмом (кг/0.5кг), Чак-чак ханский с орехами кг, Чак-чак Саукеле, Чак-чак Юрта на заказ, Чак-чак колобки 16шт в подарочной коробке.

БУЛОЧКИ: Булочка с творогом, Булочка с курагой, Булочка с маком, Булочка с повидлом, Булочка со сгущенкой, Булочка Синнабон, Слойка с яблоком, Вафельная трубочка.

ТВОРОЖНОЕ: Запеканка творожная (целая/четверть), Сочник с творогом 100г, Сырники 2шт.

ПЕЧЕНЬЕ: Медовое, Шоколадное, Овсяное классическое, Овсяное с шоколадом, Овсяное с изюмом, Овсяное с грецким орехом, Лимонное, Песочное, Кольцо арахисовое, Печенье Юля, Имбирное (обычное/среднее), Имбирные пряники (Яйца/Курочка/Ушки/ХВ/Цыпленок).

БАДРИ: Бадри курага, Бадри чернослив.

СЭТЫ: Уютный вечер, Семейный ужин, Встреча друзей, Популярный, Семейный сладкий, Встречаем гостей сладкий.

ЗАМОРОЗКА: Пирожки с картошкой 6шт, Пирожки лук яйцо 6шт, Пирожки с брынзой и шпинатом 6шт, Пирожки с картошкой и грибами 6шт, Самса 6шт, Учпучмаки 6шт, Сырники 12шт.
`;

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

    const prompt = `Ты — учетчик на пекарне/кондитерском производстве. На фото рукописный отчет о произведенной продукции сотрудником за день.

СПРАВОЧНИК ПРОДУКЦИИ (используй ТОЛЬКО эти названия, подбирай ближайшее совпадение):
${PRODUCT_CATALOG}

ПРАВИЛА:
1. Сопоставляй рукописный текст с названиями из справочника выше. Если почерк нечёткий, выбирай САМЫЙ ПОХОЖИЙ вариант из справочника.
2. Если указан размер (24, 30, 35) или формат (половина, четверть), включи в название.
3. Если на фото написано сокращение (напр. "К/К" = Курица Картофель, "Б/Ш" = Брынза Шпинат), расшифруй полностью.
4. Количество — всегда целое число.

Верни СТРОГО JSON-массив без markdown-разметки и без лишнего текста.
Формат: [{"product_name": "Название из справочника", "quantity": число}]`;

    let result;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);
    } catch (err: any) {
      console.warn("Gemini 2.5 Flash failed, trying fallback to 1.5 Flash:", err?.message || err);
      // Стабильная резервная модель с огромными лимитами
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      result = await fallbackModel.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);
    }

    const responseText = result.response.text();
    let parsedData = [];
    
    try {
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", responseText);
      return { success: false, error: "ИИ не смог распознать данные. Попробуйте сфотографировать чётче." };
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return { success: false, error: "Не найдено данных о выработке на фото" };
    }

    // Сохранение в Supabase
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Дата по Алматы
    const almatyNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
    const recordDate = almatyNow.toISOString().split('T')[0];

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

export async function getTodayProductionLogs() {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, data: [] };

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const almatyNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
    const recordDate = almatyNow.toISOString().split('T')[0];
    
    const { data } = await supabaseAdmin
      .from('production_logs')
      .select('id, product_name, quantity, created_at')
      .eq('employee_id', user.id)
      .eq('record_date', recordDate)
      .order('created_at', { ascending: false });

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, data: [] };
  }
}

export async function updateProductionLog(logId: string, productName: string, quantity: number) {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Необходима авторизация" };

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('production_logs')
      .update({ product_name: productName, quantity })
      .eq('id', logId)
      .eq('employee_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProductionLog(logId: string) {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Необходима авторизация" };

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('production_logs')
      .delete()
      .eq('id', logId)
      .eq('employee_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
