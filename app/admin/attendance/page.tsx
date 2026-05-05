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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Журнал отметок</h1>
        <AddRecordModal employees={employees || []} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата и Время</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудник</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Событие</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Локация</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recordsWithErrors?.map((record: any) => (
              <tr key={record.id} className={`hover:bg-gray-50 ${record.isError ? "bg-red-50/50" : ""}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <LocalTime isoString={record.recorded_at} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{record.profiles?.full_name || "Неизвестно"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.record_type === "check_in" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {record.record_type === "check_in" ? "Приход" : "Уход"}
                  </span>
                  {record.isError && <span className="ml-2 text-xs text-red-600 font-medium">Нет "Ухода"</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.locations?.name || "Неизвестно"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DeleteRecordButton recordId={record.id} />
                </td>
              </tr>
            ))}
            {recordsWithErrors.length === 0 && (
              <tr suppressHydrationWarning>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Отметок пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {recordsWithErrors?.map((record: any) => (
          <div key={record.id} className={`bg-white rounded-xl p-4 shadow-sm border ${record.isError ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-gray-900">{record.profiles?.full_name || "Неизвестно"}</div>
              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                record.record_type === "check_in" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}>
                {record.record_type === "check_in" ? "Приход" : "Уход"}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 items-end">
              <div>
                <div suppressHydrationWarning className="text-gray-900 font-medium">
                  {format(parseISO(record.recorded_at), "dd MMM, HH:mm", { locale: ru })}
                </div>
                <div className="text-xs mt-0.5">📍 {record.locations?.name || "Неизвестно"}</div>
                {record.isError && <div className="text-xs text-red-500 font-medium mt-1">⚠️ Нет "Ухода"</div>}
              </div>
              <DeleteRecordButton recordId={record.id} />
            </div>
          </div>
        ))}
        {recordsWithErrors.length === 0 && (
          <div className="bg-white p-8 rounded-xl text-center text-gray-500 border border-gray-200">
            Отметок пока нет
          </div>
        )}
      </div>
    </div>
  );
}
