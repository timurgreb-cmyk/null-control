"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Каталог продукции для точного распознавания рукописного текста
const PRODUCT_CATALOG = `
КАТЕГОРИИ И ПОЗИЦИИ:

МЕЛКОШТУЧКА: Самса, Учпучмак, Пирожок с картофелем, Пирожок с капустой, Пирожное Картошка, Пирожок с брынзой и шпинатом, Пирожок с картошкой и грибами, Пирожок с луком и яйцом, Беляши, Сосиска в тесте, Баурсаки.

МИНИ-ПИРОГИ: Мини семга/рис, Мини курица брынза шпинат, Мини фарш/тыква, Мини пирог капуста-яйцо.

ПИРОГИ МЯСНЫЕ (размеры 24/30/35, половина, четверть): Курица Картофель, Курица Грибы, Фарш Тыква, Фарш Картофель, Семга Рис, Брынза Шпинат, Мясо Картофель, Курица Брынза Шпинат, Капуста Яйцо, Утка Картофель, Картофель Грибы, Губадия, Рудольф.

СЛАДКИЕ ПИРОГИ (размеры 24/30/35, половина, четверть): Трехслойный, Сметанник с персиками, Сметанник с вишней, Сметанник с малиной, Лимонник, Смородиновый, Ассорти (смородина лимон), Курага, Курага Орех, Творог Яблоко, Творожно Маковый, Тропический, Клубничный, Рудольф.

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

function getAlmatyDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Almaty' });
}

export async function uploadProductionLog(base64Image: string) {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    
    if (!user) return { success: false, error: "Необходима авторизация" };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: false, error: "API ключ Gemini не настроен" };

    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0]?.split(':')[1] || "image/jpeg";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Ты — учетчик на пекарне/кондитерском производстве. На фото рукописный отчет о произведенной продукции сотрудником за день.

СПРАВОЧНИК ПРОДУКЦИИ (используй ТОЛЬКО эти названия, подбирай ближайшее совпадение):
${PRODUCT_CATALOG}

ПРАВИЛА:
1. Сопоставляй рукописный текст с названиями из справочника выше. Если почерк нечёткий, выбирай САМЫЙ ПОХОЖИЙ вариант из справочника.
2. Если указан размер (24, 30, 35) или формат (половина, четверть), включи в название.
3. Если на фото написано сокращение (напр. "К/К" = Курица Картофель, "Б/Ш" = Брынза Шпинат), расшифруй полностью.
4. Количество (quantity) — целое или дробное число.
5. Единица измерения (unit) — определи из текста: "шт.", "кг", "г", "л", "мл", "упк", "порц". Если не указано, поставь "шт.".

Верни СТРОГО JSON-массив без markdown-разметки и без лишнего текста.
Формат: [{"product_name": "Название из справочника", "quantity": число, "unit": "ед.изм."}]`;

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
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", responseText);
      return { success: false, error: "ИИ не смог распознать данные. Попробуйте сфотографировать чётче." };
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return { success: false, error: "Не найдено данных о выработке на фото" };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const recordDate = getAlmatyDateString();

    const inserts = parsedData.map((item: any) => {
      const rawQty = parseFloat(item.quantity) || 0;
      const unitVal = item.unit || "шт.";
      let name = item.product_name || "Продукция";
      if (unitVal && unitVal !== "шт." && !name.includes(`(${unitVal})`)) {
        name = `${name} (${unitVal})`;
      }
      const safeQty = Math.max(1, Math.round(rawQty));
      return {
        employee_id: user.id,
        product_name: name,
        quantity: safeQty,
        record_date: recordDate
      };
    }).filter(i => i.quantity > 0 && i.product_name);

    if (inserts.length === 0) return { success: false, error: "Распознаны невалидные данные" };

    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('production_logs')
      .insert(inserts)
      .select('id, product_name, quantity, created_at, record_date');

    if (insertError) {
      console.error("Error inserting production logs:", insertError);
      return { success: false, error: `Ошибка сохранения в базу: ${insertError.message}` };
    }

    return { success: true, data: insertedRecords || [] };

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

    const almatyDate = getAlmatyDateString();
    
    const { data, error } = await supabaseAdmin
      .from('production_logs')
      .select('id, product_name, quantity, created_at, record_date')
      .eq('employee_id', user.id)
      .eq('record_date', almatyDate)
      .order('created_at', { ascending: false });

    if (error) return { success: false, data: [], error: error.message };
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function updateProductionLog(logId: string, productName: string, quantity: number, unit: string = "шт.") {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Необходима авторизация" };

    const rawQty = Number(quantity);
    if (!productName || isNaN(rawQty) || rawQty <= 0) {
      return { success: false, error: "Неверные параметры" };
    }

    let finalName = productName.trim();
    if (unit && unit !== "шт." && !finalName.includes(`(${unit})`)) {
      finalName = `${finalName} (${unit})`;
    }

    const safeQty = Math.max(1, Math.round(rawQty));

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('production_logs')
      .update({
        product_name: finalName,
        quantity: safeQty
      })
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

export async function addManualProductionLog(productName: string, quantity: number, unit: string = "шт.") {
  try {
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Необходима авторизация" };

    const rawQty = Number(quantity);
    if (!productName || isNaN(rawQty) || rawQty <= 0) {
      return { success: false, error: "Неверное название товара или количество" };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const recordDate = getAlmatyDateString();

    let finalName = productName.trim();
    if (unit && unit !== "шт." && !finalName.includes(`(${unit})`)) {
      finalName = `${finalName} (${unit})`;
    }

    const safeQty = Math.max(1, Math.round(rawQty));

    const { data, error } = await supabaseAdmin
      .from('production_logs')
      .insert({
        employee_id: user.id,
        product_name: finalName,
        quantity: safeQty,
        record_date: recordDate
      })
      .select('id, product_name, quantity, created_at, record_date');

    if (error) {
      console.error("Error inserting manual production log:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
