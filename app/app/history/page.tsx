import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { LogIn, LogOut, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let records: any[] = [];
  
  if (user) {
    // Используем админ-клиент для обхода проблем с RLS (рекурсия)
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabaseAdmin
      .from("time_records")
      .select(`
        id,
        record_type,
        recorded_at,
        locations (name)
      `)
      .eq("employee_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(50);
      
    if (data) records = data;
  }

  // Группировка по датам
  const groupedRecords: { [key: string]: any[] } = {};
  
  records.forEach((record) => {
    const dateStr = format(new Date(record.recorded_at), "d MMMM yyyy", { locale: ru });
    if (!groupedRecords[dateStr]) {
      groupedRecords[dateStr] = [];
    }
    groupedRecords[dateStr].push(record);
  });

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">История отметок</h1>
      
      {Object.keys(groupedRecords).length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          У вас пока нет отметок
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).map(([date, dayRecords]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 capitalize">{date}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {dayRecords.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        record.record_type === "check_in" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-orange-100 text-orange-600"
                      }`}>
                        {record.record_type === "check_in" ? (
                          <LogIn className="w-5 h-5" />
                        ) : (
                          <LogOut className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.record_type === "check_in" ? "Приход" : "Уход"}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {record.locations?.name || "Неизвестная локация"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">
                        {format(new Date(record.recorded_at), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
