"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "./auth";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to assert admin privileges
async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Доступ запрещен. Требуются права администратора.");
  }
  return profile;
}

// Helper to assert authenticated user
async function assertAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Требуется авторизация.");
  }
  return user;
}

// 1. Получить справочники (статьи и контрагенты) для селекторов
export async function getFinanceDirectories() {
  try {
    await assertAuth();
    const supabase = createClient();

    const [articlesRes, counterpartiesRes] = await Promise.all([
      supabase.from("finance_articles").select("*").order("name"),
      supabase.from("finance_counterparties").select("*").order("name")
    ]);

    if (articlesRes.error) throw articlesRes.error;
    if (counterpartiesRes.error) throw counterpartiesRes.error;

    return {
      articles: articlesRes.data || [],
      counterparties: counterpartiesRes.data || []
    };
  } catch (error: any) {
    console.error("Error in getFinanceDirectories:", error);
    return { error: error.message || "Ошибка при получении справочников" };
  }
}

// 2. Добавить расход
export async function addExpense(
  amount: number,
  currency: string,
  articleId: string | null,
  counterpartyId: string | null,
  description: string,
  expenseDate: string
) {
  try {
    const user = await assertAuth();
    const supabase = createClient();

    if (!amount || amount <= 0) {
      throw new Error("Сумма должна быть больше нуля.");
    }

    const { data, error } = await supabase
      .from("finance_expenses")
      .insert({
        employee_id: user.id,
        amount,
        currency: currency || "KZT",
        article_id: articleId || null,
        counterparty_id: counterpartyId || null,
        description: description || null,
        expense_date: expenseDate
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in addExpense:", error);
    return { error: error.message || "Не удалось сохранить расход" };
  }
}

// 3. Получить расходы сотрудника за определенную дату (или все его расходы)
export async function getUserExpenses(dateStr?: string) {
  try {
    const user = await assertAuth();
    const supabase = createClient();

    let query = supabase
      .from("finance_expenses")
      .select(`
        *,
        article:finance_articles(id, name),
        counterparty:finance_counterparties(id, name)
      `)
      .eq("employee_id", user.id)
      .order("created_at", { ascending: false });

    if (dateStr) {
      query = query.eq("expense_date", dateStr);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [] };
  } catch (error: any) {
    console.error("Error in getUserExpenses:", error);
    return { error: error.message || "Не удалось загрузить расходы" };
  }
}

// 4. Удалить расход сотрудником
export async function deleteExpense(id: string) {
  try {
    const user = await assertAuth();
    const supabase = createClient();

    const { error } = await supabase
      .from("finance_expenses")
      .delete()
      .eq("id", id)
      .eq("employee_id", user.id); // Безопасность на уровне запроса + RLS

    if (error) throw error;

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteExpense:", error);
    return { error: error.message || "Не удалось удалить расход" };
  }
}

// 5. Админ-метод: Получить расходы всех пользователей с фильтром по датам
export async function getAdminExpenses(startDate?: string, endDate?: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    let query = supabase
      .from("finance_expenses")
      .select(`
        *,
        profile:profiles(id, full_name),
        article:finance_articles(id, name),
        counterparty:finance_counterparties(id, name)
      `)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("expense_date", startDate);
    }
    if (endDate) {
      query = query.lte("expense_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [] };
  } catch (error: any) {
    console.error("Error in getAdminExpenses:", error);
    return { error: error.message || "Не удалось загрузить расходы для админ-панели" };
  }
}

// 6. Админ-метод: Удалить расход любого пользователя
export async function deleteAdminExpense(id: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    const { error } = await supabase
      .from("finance_expenses")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteAdminExpense:", error);
    return { error: error.message || "Не удалось удалить запись расхода" };
  }
}

// 7. Админ-метод: Добавить статью расходов
export async function addFinanceArticle(name: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    if (!name || name.trim() === "") {
      throw new Error("Название статьи не может быть пустым.");
    }

    const { data, error } = await supabase
      .from("finance_articles")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Статья расходов с таким названием уже существует.");
      }
      throw error;
    }

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in addFinanceArticle:", error);
    return { error: error.message || "Не удалось добавить статью" };
  }
}

// 8. Админ-метод: Удалить статью расходов
export async function deleteFinanceArticle(id: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    const { error } = await supabase
      .from("finance_articles")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteFinanceArticle:", error);
    return { error: error.message || "Не удалось удалить статью" };
  }
}

// 9. Админ-метод: Добавить контрагента
export async function addFinanceCounterparty(name: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    if (!name || name.trim() === "") {
      throw new Error("Имя контрагента не может быть пустым.");
    }

    const { data, error } = await supabase
      .from("finance_counterparties")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Контрагент с таким именем уже существует.");
      }
      throw error;
    }

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in addFinanceCounterparty:", error);
    return { error: error.message || "Не удалось добавить контрагента" };
  }
}

// 10. Админ-метод: Удалить контрагента
export async function deleteFinanceCounterparty(id: string) {
  try {
    await assertAdmin();
    const supabase = createClient();

    const { error } = await supabase
      .from("finance_counterparties")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/app/finance");
    revalidatePath("/admin/finance");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteFinanceCounterparty:", error);
    return { error: error.message || "Не удалось удалить контрагента" };
  }
}

// 11. Голосовой ввод расхода: Парсинг речи сотрудника с помощью Gemini AI
export async function parseVoiceExpense(voiceText: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Требуется авторизация.");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "API ключ Gemini не настроен в файле .env.local" };
    }

    // 1. Получаем списки существующих справочников для сопоставления
    const [articlesRes, counterpartiesRes] = await Promise.all([
      supabase.from("finance_articles").select("id, name"),
      supabase.from("finance_counterparties").select("id, name")
    ]);

    const articlesList = (articlesRes.data || [])
      .map(a => `- ${a.name} (ID: ${a.id})`)
      .join("\n");
      
    const counterpartiesList = (counterpartiesRes.data || [])
      .map(c => `- ${c.name} (ID: ${c.id})`)
      .join("\n");

    const todayDateStr = new Date().toISOString().split("T")[0];

    const prompt = `Ты — финансовый ассистент, который разбирает расшифрованный голосовой ввод сотрудника о расходах предприятия и преобразует его в структурированные JSON-данные.
Твоя задача — извлечь сумму, валюту, сопоставить с существующим справочником статей расходов и контрагентов, определить дату и примечание.

СПРАВОЧНИК СТАТЕЙ РАСХОДОВ:
${articlesList || "(нет созданных статей)"}

СПРАВОЧНИК КОНТРАГЕНТОВ:
${counterpartiesList || "(нет созданных контрагентов)"}

Текущая дата (для контекста "вчера", "сегодня", "позавчера" и т.д.): ${todayDateStr}

Ввод сотрудника: "${voiceText}"

ПРАВИЛА:
1. "amount": извлеки числовую сумму (например: "десять тысяч" -> 10000, "две с половиной тысячи" -> 2500).
2. "currency": извлеки код валюты. Варианты: KZT (если упоминается тенге, ₸), RUB (если упоминается рубль, ₽), USD (доллар, $), EUR (евро, €). Если валюта не упомянута вообще, по умолчанию верни "KZT".
3. "article_id": сопоставь описание расходов с одной из статей расходов из справочника выше. Верни UUID найденной статьи. Если совпадений нет или затрудняешься, верни null.
4. "counterparty_id": сопоставь получателя платежа с контрагентом из справочника выше. Верни UUID найденного контрагента. Если совпадений нет, верни null.
5. "description": добавь любые важные детали, которые сотрудник проговорил (например: "покупка муки 5 мешков", "оплата интернета за май"). Описание должно быть кратким, на русском языке, без лишней "воды".
6. "expense_date": определи дату расхода в формате YYYY-MM-DD. Если сказано "сегодня" или дата не указана, используй ${todayDateStr}. Если сказано "вчера", вычти 1 день. Если указана конкретная дата (например, "десятого июня"), подставь правильный год и месяц.

Верни СТРОГО JSON-объект без markdown-разметки (без \`\`\`json) и без лишнего текста.
Формат:
{
  "amount": число,
  "currency": "KZT"|"RUB"|"USD"|"EUR",
  "article_id": "UUID_ИЛИ_null",
  "counterparty_id": "UUID_ИЛИ_null",
  "description": "строка_или_null",
  "expense_date": "YYYY-MM-DD"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    let result;
    const modelsToTry = [
      "gemini-2.5-flash", 
      "gemini-3.5-flash", 
      "gemini-3.1-pro", 
      "gemini-2.5-pro", 
      "gemini-2.5-flash-lite"
    ];
    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i];
      try {
        console.log(`Attempting Gemini model for voice parsing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed for voice parsing:`, err?.message || err);
        lastError = err;

        const errMsg = String(err?.message || err);
        if (errMsg.includes("403 Forbidden") || errMsg.includes("denied access") || errMsg.includes("Forbidden")) {
          return { 
            error: "Ваш API-ключ или проект Google AI Studio заблокирован (403 Forbidden). Пожалуйста, обновите переменную GEMINI_API_KEY."
          };
        }
        
        if (i === 0) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const model = genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent(prompt);
            if (result) break;
          } catch (retryErr: any) {
            console.warn(`Retry of ${modelName} failed:`, retryErr?.message || retryErr);
            lastError = retryErr;
          }
        }
      }
    }

    if (!result) {
      throw lastError || new Error("Все доступные ИИ-модели вернули ошибку.");
    }

    const responseText = result.response.text();
    let parsedData: any = {};
    
    try {
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini for voice expense:", responseText);
      return { error: "ИИ не смог распознать структуру расходов. Пожалуйста, проговорите четче." };
    }

    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error("Error in parseVoiceExpense server action:", error);
    return { error: error.message || "Ошибка при распознавании голоса ИИ" };
  }
}
