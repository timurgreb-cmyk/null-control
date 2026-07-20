import { createClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import DeleteRecordButton from "./DeleteRecordButton";
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
      profiles (id, full_name),
      locations (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(500);

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
  // если это check_in, проверяем есть ли check_out в этот же день для этого сотрудника.
  const recordsWithErrors = records?.map(record => {
    let isError = false;
    if (record.record_type === "check_in") {
      const currentDay = record.recorded_at.split('T')[0];
      const hasCheckout = records.some(r => 
        r.employee_id === record.employee_id && 
        r.record_type === "check_out" && 
        r.recorded_at.startsWith(currentDay)
      );
      
      const todayDay = new Date().toISOString().split('T')[0];
      if (!hasCheckout && currentDay !== todayDay) {
        isError = true;
      }
    }
    return { ...record, isError };
  }) || [];

  // Группировка по сотрудникам
  const groupedByEmployee: Record<string, { employeeName: string, employeeId: string, records: any[] }> = {};
  
  recordsWithErrors.forEach(record => {
    const empId = record.employee_id;
    if (!groupedByEmployee[empId]) {
      groupedByEmployee[empId] = {
        employeeId: empId,
        employeeName: (record.profiles as any)?.full_name || "Неизвестно",
        records: []
      };
    }
    groupedByEmployee[empId].records.push(record);
  });

  const groupedArray = Object.values(groupedByEmployee).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Журнал отметок</h1>
          <AddRecordModal employees={employees || []} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedArray.map(group => (
            <div key={group.employeeId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                 <h3 className="font-bold text-gray-900 truncate pr-2">{group.employeeName}</h3>
                 <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap">
                   {group.records.length} {group.records.length === 1 ? 'отметка' : 'отметок'}
                 </span>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <ul className="divide-y divide-gray-100">
                  {group.records.map(record => (
                    <li key={record.id} className={`p-5 flex flex-col hover:bg-gray-50 transition-colors ${record.isError ? "bg-red-50/30" : ""}`}>
                       <div className="flex justify-between items-start mb-2.5">
                         <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-full ${
                            record.record_type === "check_in" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {record.record_type === "check_in" ? "Приход" : "Уход"}
                          </span>
                          <div className="text-gray-900 font-bold">
                            <LocalTime isoString={record.recorded_at} formatStr="dd MMM, HH:mm" />
                          </div>
                       </div>
                       <div className="flex justify-between items-end mt-1">
                         <div className="text-xs text-gray-500 font-medium">📍 {(record.locations as any)?.name || "Неизвестно"}</div>
                         <DeleteRecordButton recordId={record.id} />
                       </div>
                       {record.isError && <div className="text-xs text-red-500 font-bold mt-3 bg-red-50 p-2 rounded-lg text-center border border-red-100">⚠️ Нет отметки об уходе</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          {groupedArray.length === 0 && (
             <div className="col-span-full bg-white p-12 rounded-2xl text-center text-gray-500 border border-gray-200">
               <p className="text-lg font-medium text-gray-900 mb-1">Отметок пока нет</p>
               <p className="text-sm">Сотрудники еще не сканировали QR-код</p>
             </div>
          )}
        </div>
      </div>

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
