import { createClient as createAdminClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Package, Trash2, Search } from "lucide-react";
import LocalTime from "@/components/LocalTime";
import DeleteProductionButton from "../DeleteProductionButton";
import { formatLocalTime } from "@/utils/date";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeeProductionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Получаем профиль сотрудника
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", employeeId)
    .single();

  // 2. Получаем все логи выработки этого сотрудника
  const { data: logs } = await supabase
    .from("production_logs")
    .select(`
      id,
      product_name,
      quantity,
      record_date,
      created_at
    `)
    .eq("employee_id", employeeId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  // 3. Группируем логи по ДНЯМ (record_date)
  const groupedByDay: Record<string, typeof logs> = {};
  logs?.forEach((log) => {
    const day = log.record_date;
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day]!.push(log);
  });

  const dayEntries = Object.entries(groupedByDay).sort((a, b) => b[0].localeCompare(a[0]));
  const totalItemsCount = logs?.length || 0;
  const totalQuantitySum = logs?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Кнопка Назад */}
      <Link 
        href="/admin/production"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-6 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4 text-primary" />
        К списку сотрудников
      </Link>

      {/* Шапка сотрудника */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-primary/80 text-white rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ВЫРАБОТКА СОТРУДНИКА</span>
            <h1 className="text-3xl font-black tracking-tight text-white mt-1">{profile?.full_name || "Сотрудник"}</h1>
          </div>
          <div className="flex gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3">
            <div className="text-center px-3">
              <p className="text-[10px] text-slate-300 font-bold uppercase">Дней с выработкой</p>
              <p className="text-xl font-black text-white">{dayEntries.length}</p>
            </div>
            <div className="border-l border-white/10 text-center px-3">
              <p className="text-[10px] text-slate-300 font-bold uppercase">Всего позиций</p>
              <p className="text-xl font-black text-emerald-400">{totalItemsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Список выработки по дням */}
      <div className="space-y-6">
        {dayEntries.map(([day, dayLogs]) => {
          const formattedDate = format(parseISO(day), "d MMMM yyyy (EEEE)", { locale: ru });
          const dayTotalQty = dayLogs?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;

          return (
            <div key={day} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Заголовок Дня */}
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-black text-slate-900 text-base">{formattedDate}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-200/60 text-slate-700 text-xs px-3 py-1 rounded-full font-bold">
                    {dayLogs?.length} поз.
                  </span>
                  <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-bold">
                    {dayTotalQty.toFixed(1).replace(/\.0$/, '')} ед.
                  </span>
                </div>
              </div>

              {/* Таблица / Список позиций за этот день */}
              <div className="divide-y divide-slate-100">
                {dayLogs?.map((log) => (
                  <div key={log.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{log.product_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <LocalTime isoString={log.created_at} formatStr="HH:mm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-black text-base text-slate-900 bg-slate-100 px-3.5 py-1.5 rounded-xl">
                        {log.quantity} {(log as any).unit || "шт."}
                      </span>
                      <DeleteProductionButton logId={log.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {dayEntries.length === 0 && (
          <div className="bg-white p-12 rounded-3xl text-center text-slate-500 border border-slate-200 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-900 mb-1">Выработка отсутствует</p>
            <p className="text-xs text-slate-400">У данного сотрудника пока нет записей выработки</p>
          </div>
        )}
      </div>
    </div>
  );
}
