"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function logScanError(supabaseAdmin: any, {
  employeeId,
  locationId,
  errorMessage,
  errorType,
  scannedText,
  userLat,
  userLng,
  distanceMeters
}: {
  employeeId?: string;
  locationId?: string;
  errorMessage: string;
  errorType: string;
  scannedText?: string;
  userLat?: number | null;
  userLng?: number | null;
  distanceMeters?: number | null;
}) {
  try {
    await supabaseAdmin.from("scan_errors").insert({
      employee_id: employeeId || null,
      location_id: locationId || null,
      error_message: errorMessage,
      error_type: errorType,
      scanned_text: scannedText || null,
      user_latitude: userLat || null,
      user_longitude: userLng || null,
      distance_meters: distanceMeters !== undefined && distanceMeters !== null ? Math.round(distanceMeters) : null
    });
  } catch (err) {
    // Игнорируем если таблица еще не создана
  }
}

export async function processQRScan(
  locationId: string, 
  clientTimeIso?: string,
  userCoords?: { lat: number; lng: number } | null
) {
  try {
    const supabase = createClient();
    
    // Используем переданное время или серверное как запасной вариант
    const now = clientTimeIso ? new Date(clientTimeIso) : new Date();
    
    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Извлечение UUID и явного типа отметки из сканированного текста
    const uuidMatch = locationId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!uuidMatch) {
      const errMsg = "Неверный формат QR-кода. UUID не найден.";
      await logScanError(supabaseAdmin, {
        employeeId: user.id,
        errorMessage: errMsg,
        errorType: "invalid_qr_format",
        scannedText: locationId,
        userLat: userCoords?.lat,
        userLng: userCoords?.lng
      });
      return { success: false, error: errMsg };
    }
    const cleanLocationId = uuidMatch[0];

    // Проверяем, указан ли в QR-коде конкретный тип (check_in или check_out)
    let explicitType: "check_in" | "check_out" | null = null;
    const lowerInput = locationId.toLowerCase();
    if (lowerInput.includes("check_in")) {
      explicitType = "check_in";
    } else if (lowerInput.includes("check_out")) {
      explicitType = "check_out";
    }

    // 1. Проверка локации
    const { data: location, error: locError } = await supabaseAdmin
      .from("locations")
      .select("*")
      .eq("id", cleanLocationId)
      .single();

    if (locError || !location) {
      const errMsg = "Локация не найдена";
      await logScanError(supabaseAdmin, {
        employeeId: user.id,
        errorMessage: errMsg,
        errorType: "location_not_found",
        scannedText: locationId,
        userLat: userCoords?.lat,
        userLng: userCoords?.lng
      });
      return { success: false, error: errMsg };
    }
    
    if (!location.is_active) {
      const errMsg = "Локация неактивна";
      await logScanError(supabaseAdmin, {
        employeeId: user.id,
        locationId: location.id,
        errorMessage: errMsg,
        errorType: "location_inactive",
        scannedText: locationId,
        userLat: userCoords?.lat,
        userLng: userCoords?.lng
      });
      return { success: false, error: errMsg };
    }

    // 2. ГЕО-КОНТРОЛЬ (Проверка GPS геопозиции сотрудника)
    const locLat = location.latitude ? parseFloat(location.latitude) : null;
    const locLng = location.longitude ? parseFloat(location.longitude) : null;
    const allowedRadius = location.radius_meters ? parseInt(location.radius_meters) : 200;

    if (locLat !== null && locLng !== null && location.is_geo_required !== false) {
      if (!userCoords || userCoords.lat === undefined || userCoords.lng === undefined) {
        const errMsg = "Включите геолокацию (GPS) на телефоне! Отметка вне геозоны невозможна.";
        await logScanError(supabaseAdmin, {
          employeeId: user.id,
          locationId: location.id,
          errorMessage: errMsg,
          errorType: "geo_permission_denied",
          scannedText: locationId
        });
        return { success: false, error: errMsg };
      }

      const distance = calculateDistanceMeters(userCoords.lat, userCoords.lng, locLat, locLng);
      if (distance > allowedRadius) {
        const distKmOrM = distance >= 1000 ? `${(distance / 1000).toFixed(1)} км` : `${Math.round(distance)} м`;
        const errMsg = `Ошибка геопозиции! Вы находитесь вне объекта (${distKmOrM} от цеха). Отметка возможна только на территории.`;
        await logScanError(supabaseAdmin, {
          employeeId: user.id,
          locationId: location.id,
          errorMessage: errMsg,
          errorType: "geo_out_of_bounds",
          scannedText: locationId,
          userLat: userCoords.lat,
          userLng: userCoords.lng,
          distanceMeters: distance
        });
        return { success: false, error: errMsg };
      }
    }

    // 3. Получение последней отметки сотрудника за последние 24 часа 
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: lastRecords, error: recordsError } = await supabaseAdmin
      .from("time_records")
      .select("id, record_type, recorded_at")
      .eq("employee_id", user.id)
      .gte("recorded_at", dayAgo.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1);

    const lastRecord = lastRecords && lastRecords.length > 0 ? lastRecords[0] : null;

    // 4. Проверка кулдауна (2 минуты)
    if (lastRecord) {
      const lastTime = new Date(lastRecord.recorded_at).getTime();
      const diffMinutes = (now.getTime() - lastTime) / (1000 * 60);

      if (diffMinutes < 2) {
        const errMsg = `Слишком частые отметки. Подождите еще ${Math.ceil(2 - diffMinutes)} мин.`;
        await logScanError(supabaseAdmin, {
          employeeId: user.id,
          locationId: location.id,
          errorMessage: errMsg,
          errorType: "too_frequent_scans",
          scannedText: locationId,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng
        });
        return { success: false, error: errMsg };
      }
    }

    // Получаем профиль для проверок
    const { data: employeeProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, can_upload_production")
      .eq("id", user.id)
      .single();

    // 5. Определение типа записи и валидация
    let newRecordType = "check_in";

    if (explicitType === "check_in") {
      if (lastRecord && lastRecord.record_type === "check_in") {
        const errMsg = "Вы уже отметили Приход! Для завершения смены отсканируйте QR-код УХОДА.";
        await logScanError(supabaseAdmin, {
          employeeId: user.id,
          locationId: location.id,
          errorMessage: errMsg,
          errorType: "already_checked_in",
          scannedText: locationId,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng
        });
        return { success: false, error: errMsg };
      }
      newRecordType = "check_in";
    } else if (explicitType === "check_out") {
      if (!lastRecord || lastRecord.record_type !== "check_in") {
        const errMsg = "Вы еще не открыли смену! Сначала отсканируйте QR-код ПРИХОДА.";
        await logScanError(supabaseAdmin, {
          employeeId: user.id,
          locationId: location.id,
          errorMessage: errMsg,
          errorType: "not_checked_in",
          scannedText: locationId,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng
        });
        return { success: false, error: errMsg };
      }
      newRecordType = "check_out";
    } else {
      // Для старых QR-кодов без явного типа сохраняется автопереключение
      if (lastRecord && lastRecord.record_type === "check_in") {
        newRecordType = "check_out";
      }
    }

    // Если это уход - проверяем выработку только если включена конкретная галочка can_upload_production
    if (newRecordType === "check_out") {
      const isRequired = employeeProfile?.can_upload_production === true;

      if (isRequired && lastRecord && lastRecord.record_type === "check_in") {
        const { data: prodLogs } = await supabaseAdmin
          .from("production_logs")
          .select("id")
          .eq("employee_id", user.id)
          .gte("created_at", lastRecord.recorded_at)
          .limit(1);

        if (!prodLogs || prodLogs.length === 0) {
          const errMsg = "Сначала загрузите выработку за эту смену во вкладке «Выработка»!";
          await logScanError(supabaseAdmin, {
            employeeId: user.id,
            locationId: location.id,
            errorMessage: errMsg,
            errorType: "production_log_missing",
            scannedText: locationId,
            userLat: userCoords?.lat,
            userLng: userCoords?.lng
          });
          return { success: false, error: errMsg };
        }
      }
    }

    // 5. Запись в базу с использованием клиентского времени
    const { error: insertError } = await supabaseAdmin
      .from("time_records")
      .insert({
        employee_id: user.id,
        location_id: location.id,
        record_type: newRecordType,
        recorded_at: now.toISOString()
      });

    if (insertError) {
      return { success: false, error: `Ошибка записи: ${insertError.message}` };
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");

    return { 
      success: true, 
      data: {
        type: newRecordType,
        locationName: location.name,
        time: now.toISOString(),
        message: newRecordType === "check_in" ? "Хорошей смены!" : "Хорошей дороги домой!"
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

    // input type="datetime-local" отправляет время без часового пояса (например "2024-05-18T10:00").
    // Так как Vercel работает в UTC, он подумает, что это UTC. Принудительно добавляем зону Алматы (+05:00).
    let almatyDatetime = datetime;
    if (almatyDatetime && almatyDatetime.length === 16) {
      almatyDatetime += ":00+05:00";
    }

    // Ищем дефолтную локацию или любую первую
    const { data: location } = await supabaseAdmin.from("locations").select("id").limit(1).single();

    const { error } = await supabaseAdmin.from("time_records").insert({
      employee_id: employeeId,
      record_type: recordType,
      recorded_at: new Date(almatyDatetime).toISOString(),
      location_id: location?.id || null, // Если нет локаций
      notes: "Добавлено вручную"
    });

    if (error) return { error: error.message };
    
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
