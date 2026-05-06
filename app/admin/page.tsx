import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Получаем статистику на сегодня
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Все активные сотрудники
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, position")
    .eq("role", "employee")
    .eq("is_active", true);

  // Отметки за сегодня
  const { data: todayRecords } = await supabase
    .from("time_records")
    .select(`
      employee_id,
      record_type,
      recorded_at,
      locations (name)
    `)
    .gte("recorded_at", today.toISOString())
    .order("recorded_at", { ascending: true });

  // Анализ присутствия
  const presenceStatus: Record<string, any> = {};
  
  employees?.forEach(emp => {
    presenceStatus[emp.id] = {
      ...emp,
      status: "absent", // absent, present
      firstIn: null,
      lastOut: null,
      currentLocation: null,
    };
  });

  todayRecords?.forEach(record => {
    const empData = presenceStatus[record.employee_id];
    if (empData) {
      if (record.record_type === "check_in") {
        empData.status = "present";
        empData.currentLocation = (record.locations as any)?.name;
        if (!empData.firstIn) empData.firstIn = record.recorded_at;
        empData.lastOut = null; // Сброс ухода
      } else {
        empData.status = "absent";
        empData.lastOut = record.recorded_at;
      }
    }
  });

  const presentCount = Object.values(presenceStatus).filter(e => e.status === "present").length;
  const totalCount = employees?.length || 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-500 mt-1">Сегодня: {format(new Date(), "d MMMM yyyy", { locale: ru })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">На работе</h3>
          <p className="text-4xl font-bold text-primary">{presentCount}</p>
          <p className="text-sm text-gray-500 mt-2">из {totalCount} сотрудников</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Отсутствуют</h3>
          <p className="text-4xl font-bold text-orange-500">{totalCount - presentCount}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">Статус сотрудников</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.values(presenceStatus).map((emp) => (
          <div key={emp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">{emp.full_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{emp.position || "Должность не указана"}</p>
              </div>
              <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${
                emp.status === "present" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {emp.status === "present" ? "На месте" : "Отсутствует"}
              </span>
            </div>
            
            {emp.status === "present" && (
              <div className="mt-2 mb-3 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-sm font-medium">
                📍 {emp.currentLocation}
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Приход</span>
                <span className={`font-medium ${emp.firstIn ? "text-gray-900" : "text-gray-300"}`}>
                  {emp.firstIn ? <LocalTime isoString={emp.firstIn} formatStr="HH:mm" /> : "—:—"}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Уход</span>
                <span className={`font-medium ${emp.lastOut ? "text-gray-900" : "text-gray-300"}`}>
                  {emp.lastOut ? <LocalTime isoString={emp.lastOut} formatStr="HH:mm" /> : "—:—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
