"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function processQRScan(locationId: string) {
  try {
    const supabase = createClient();
    
    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Проверка, что locationId это UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return { success: false, error: "Неверный формат QR-кода" };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: "Ошибка конфигурации сервера: отсутствует ключ доступа" };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Проверка существования и активности локации
    const { data: location, error: locError } = await supabaseAdmin
      .from("locations")
      .select("id, name, is_active")
      .eq("id", locationId)
      .single();

    if (locError) {
      console.error("Location error:", locError);
      return { success: false, error: `Локация не найдена или ошибка БД: ${locError.message}` };
    }
    
    if (!location) {
      return { success: false, error: "Локация не существует" };
    }
    
    if (!location.is_active) {
      return { success: false, error: "Данная локация неактивна" };
    }

    // 2. Получение последней отметки сотрудника сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: lastRecords, error: recordsError } = await supabaseAdmin
      .from("time_records")
      .select("id, record_type, recorded_at")
      .eq("employee_id", user.id)
      .gte("recorded_at", today.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (recordsError) {
       console.error("Error fetching last record:", recordsError);
       return { success: false, error: `Ошибка при получении истории (${recordsError.code}): ${recordsError.message}` };
    }

    const lastRecord = lastRecords && lastRecords.length > 0 ? lastRecords[0] : null;

    // 3. Проверка кулдауна (2 минуты)
    if (lastRecord) {
      const lastTime = new Date(lastRecord.recorded_at).getTime();
      const currentTime = new Date().getTime();
      const diffMinutes = (currentTime - lastTime) / (1000 * 60);

      if (diffMinutes < 2) {
        return { 
          success: false, 
          error: `Слишком частые отметки. Подождите еще ${Math.ceil(2 - diffMinutes)} мин.` 
        };
      }
    }

    // 4. Определение типа новой отметки
    let newRecordType = "check_in";
    if (lastRecord && lastRecord.record_type === "check_in") {
      newRecordType = "check_out";
    }

    // 5. Запись в базу
    const { error: insertError } = await supabaseAdmin
      .from("time_records")
      .insert({
        employee_id: user.id,
        location_id: location.id,
        record_type: newRecordType
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return { success: false, error: `Ошибка при сохранении (${insertError.code}): ${insertError.message}` };
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");

    const friendlyMessage = newRecordType === "check_in" 
      ? "Хорошей смены!" 
      : "Хорошей дороги домой!";

    return { 
      success: true, 
      data: {
        type: newRecordType,
        locationName: location.name,
        time: new Date().toISOString(),
        message: friendlyMessage
      }
    };

  } catch (error: any) {
    console.error("Process QR Scan Exception:", error);
    return { success: false, error: `Системная ошибка: ${error.message || "Неизвестная ошибка"}` };
  }
}

export async function deleteRecord(id: string) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Проверка прав (должен быть админ)
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { error: "Необходима авторизация" };
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { error: "Нет прав для удаления" };

    const { error } = await supabaseAdmin.from("time_records").delete().eq("id", id);
    if (error) return { error: error.message };
    
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createManualRecord(formData: FormData) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Проверка прав (должен быть админ)
    const { createClient: createSessionClient } = await import("@/utils/supabase/server");
    const sessionClient = createSessionClient();
    const { data: { user }, error: userError } = await sessionClient.auth.getUser();
    if (!user) return { error: "Необходима авторизация: " + (userError?.message || "нет пользователя") };
    
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (profileError) return { error: "Ошибка получения профиля: " + profileError.message };
    if (profile?.role !== "admin") return { error: "Нет прав. Ваша текущая роль: " + (profile?.role || "не найдена") };

    const employeeId = formData.get("employeeId") as string;
    const recordType = formData.get("recordType") as string;
    const datetime = formData.get("datetime") as string;

    // Ищем дефолтную локацию или любую первую
    const { data: location } = await supabaseAdmin.from("locations").select("id").limit(1).single();

    const { error } = await supabaseAdmin.from("time_records").insert({
      employee_id: employeeId,
      record_type: recordType,
      recorded_at: new Date(datetime).toISOString(),
      location_id: location?.id || null, // Если нет локаций
      notes: "Добавлено вручную"
    });

    if (error) return { error: error.message };
    
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
