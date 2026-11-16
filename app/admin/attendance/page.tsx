import { createClient } from "@supabase/supabase-js";
import { parseISO } from "date-fns";
import AttendanceClient from "./AttendanceClient";
import AddRecordModal from "./AddRecordModal";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AttendancePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Получаем отметки (последние 500)
  const { data: records } = await supabase
    .from("time_records")
    .select(`
      id,
      recorded_at,
      record_type,
      employee_id,
      location_id,
      notes,
      profiles (id, full_name),
      locations (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(500);

  // Получаем локации
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  // Получаем журнал ошибок сканирования (последние 50)
  let scanErrors: any[] = [];
  try {
    const { data: errData } = await supabase
      .from("scan_errors")
      .select(`
        id,
        error_message,
        error_type,
        user_latitude,
        user_longitude,
        distance_meters,
        created_at,
        profiles (full_name),
        locations (name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (errData) scanErrors = errData;
  } catch (e) {
    // Таблица scan_errors может еще создаваться
  }

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "employee")
    .order("full_name");

  // Подсветка незакрытых смен:
  // если это check_in, проверяем есть ли check_out в пределах 20 часов для этого сотрудника.
  const recordsWithErrors = records?.map(record => {
    let isError = false;
    if (record.record_type === "check_in") {
      const inTime = parseISO(record.recorded_at);
      const hasCheckout = records.some(r => {
        if (r.employee_id !== record.employee_id || r.record_type !== "check_out") return false;
        const outTime = parseISO(r.recorded_at);
        const diffHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 20;
      });

      const hoursSinceIn = (new Date().getTime() - inTime.getTime()) / (1000 * 60 * 60);
      if (!hasCheckout && hoursSinceIn > 16) {
        isError = true;
      }
    }
    return { ...record, isError };
  }) || [];

  // Текущий день в Алматы (+05:00)
  const todayAlmaty = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const todayDay = todayAlmaty.toISOString().split("T")[0];

  // Группировка по сотрудникам
  const grouped: Record<string, { employeeId: string; employeeName: string; records: any[]; lastActivity: string; todayCount: number }> = {};

  recordsWithErrors.forEach(record => {
    const empId = record.employee_id;
    if (!grouped[empId]) {
      grouped[empId] = {
        employeeId: empId,
        employeeName: (record.profiles as any)?.full_name || "Неизвестно",
        records: [],
        lastActivity: record.recorded_at,
        todayCount: 0,
      };
    }
    grouped[empId].records.push(record);
    const recAlmaty = new Date(new Date(record.recorded_at).getTime() + 5 * 60 * 60 * 1000);
    if (recAlmaty.toISOString().split("T")[0] === todayDay) {
      grouped[empId].todayCount++;
    }
  });

  const groupedArray = Object.values(grouped).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Журнал отметок</h1>
          <p className="text-sm text-gray-500 mt-1">
            {recordsWithErrors.length} отметок • {groupedArray.length} сотрудников
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AddRecordModal employees={employees || []} locations={locations || []} />
        </div>
      </div>

      {/* Основной блок: список сотрудников с раскрытием */}
      <AttendanceClient
        groupedEmployees={groupedArray}
        locations={locations || []}
      />

      {/* Блок Журнала ошибок и гео-нарушений */}
      {scanErrors && scanErrors.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xl">
              🚨
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Журнал ошибок сканирования и гео-отклонений</h2>
              <p className="text-xs text-gray-500">Попытки отметок вне территории цеха или с ошибками доступа</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Сотрудник</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Время</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Причина ошибки</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Дистанция от объекта</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Локация</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scanErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-red-50/20">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {(err.profiles as any)?.full_name || "Неизвестный юзер"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      <LocalTime isoString={err.created_at} formatStr="dd MMM, HH:mm:ss" />
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium max-w-xs">
                      {err.error_message}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {err.distance_meters !== null && err.distance_meters !== undefined ? (
                        err.distance_meters >= 1000
                          ? `📍 ${(err.distance_meters / 1000).toFixed(1)} км`
                          : `📍 ${err.distance_meters} м`
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(err.locations as any)?.name || "Не указана"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
