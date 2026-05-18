import { createClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductionAdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Получаем логи с именами сотрудников
  const { data: logs, error } = await supabase
    .from("production_logs")
    .select(`
      id,
      product_name,
      quantity,
      record_date,
      created_at,
      profiles (
        id,
        full_name
      )
    `)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки выработки:", error);
  }

  // Группировка по дням и по сотрудникам
  const groupedData: Record<string, any[]> = {};
  logs?.forEach((log) => {
    if (!groupedData[log.record_date]) {
      groupedData[log.record_date] = [];
    }
    groupedData[log.record_date].push(log);
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Выработка продукции (ИИ)</h1>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedData).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">Нет данных</h3>
            <p className="text-gray-500 mt-2">Ни один сотрудник еще не загрузил выработку.</p>
          </div>
        ) : (
          Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
            const dayLogs = groupedData[date];
            const formattedDate = format(parseISO(date), "d MMMM yyyy (EEEE)", { locale: ru });
            
            return (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 capitalize">{formattedDate}</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {dayLogs.map(log => (
                    <div key={log.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-start mb-2 sm:mb-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-sm">
                            {log.profiles?.full_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="font-bold text-gray-900">{log.profiles?.full_name || "Неизвестный сотрудник"}</p>
                          <p className="text-sm text-gray-500 flex items-center mt-0.5">
                            Загружено: {format(new Date(log.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 sm:w-1/3 mt-2 sm:mt-0 flex justify-between items-center">
                        <span className="font-medium text-gray-700">{log.product_name}</span>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">
                          {log.quantity} шт.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
