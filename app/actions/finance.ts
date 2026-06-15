"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "./auth";
import { revalidatePath } from "next/cache";

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
        profile:profiles(id, name),
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
