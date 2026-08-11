import { createClient as createAdminClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { User, ChevronRight, Package, Calendar } from "lucide-react";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductionAdminPage() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Получаем все уникальные записи выработки
  const { data: logs, error } = await supabase
    .from("production_logs")
    .select(`
      id,
      product_name,
      quantity,
      record_date,
      created_at,
      employee_id,
      profiles (
        id,
        full_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Ошибка загрузки выработки:", error);
  }

  // 2. Группируем выработку по сотрудникам
  const groupedByEmployee: Record<string, { employeeName: string, employeeId: string, totalItems: number, totalQty: number, lastRecordDate: string, recentRecords: any[] }> = {};
  
  logs?.forEach((log) => {
    const empId = log.employee_id;
    if (!groupedByEmployee[empId]) {
      groupedByEmployee[empId] = {
        employeeId: empId,
        employeeName: (log.profiles as any)?.full_name || "Сотрудник",
        totalItems: 0,
        totalQty: 0,
        lastRecordDate: log.record_date,
        recentRecords: []
      };
    }
    groupedByEmployee[empId].totalItems += 1;
    groupedByEmployee[empId].totalQty += (Number(log.quantity) || 0);
    if (groupedByEmployee[empId].recentRecords.length < 3) {
      groupedByEmployee[empId].recentRecords.push(log);
    }
  });

  const groupedArray = Object.values(groupedByEmployee).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Выработка продукции</h1>
          <p className="text-xs text-slate-500 mt-1">Выберите сотрудника для просмотра его выработки по дням</p>
        </div>
        <div className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-2xl text-xs">
          Всего записей: {logs?.length || 0}
        </div>
      </div>

      {/* Карточки сотрудников */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedArray.map(emp => (
          <div 
            key={emp.employeeId} 
            className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div>
              {/* Шапка карточки сотрудника */}
              <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-base flex items-center justify-center">
                    {emp.employeeName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{emp.employeeName}</h3>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Посл. запись: {format(parseISO(emp.lastRecordDate), "d MMM", { locale: ru })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Статистика */}
              <div className="p-6 grid grid-cols-2 gap-3 bg-slate-50/30 border-b border-slate-100 text-center">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ВСЕГО ПОЗИЦИЙ</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{emp.totalItems} поз.</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ИТОГО ЕДИНИЦ</p>
                  <p className="text-xl font-black text-primary mt-0.5">{emp.totalQty.toFixed(1).replace(/\.0$/, '')} ед.</p>
                </div>
              </div>

              {/* Последние 3 записи для превью */}
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Последние выработки:</p>
                {emp.recentRecords.map(rec => (
                  <div key={rec.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate pr-2">{rec.product_name}</span>
                    <span className="font-black text-slate-900 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      {rec.quantity} {(rec as any).unit || "шт."}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Кнопка перехода к выработке по дням */}
            <div className="p-4 pt-2">
              <Link 
                href={`/admin/production/${emp.employeeId}`}
                className="w-full py-3 px-4 bg-primary text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 group-hover:bg-primary/95 shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
              >
                <span>Открыть выработку по дням</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ))}

        {groupedArray.length === 0 && (
           <div className="col-span-full bg-white p-12 rounded-3xl text-center text-slate-500 border border-slate-200 shadow-sm">
             <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <p className="text-lg font-bold text-slate-900 mb-1">Данных пока нет</p>
             <p className="text-xs text-slate-400">Ни один сотрудник еще не загрузил выработку</p>
           </div>
        )}
      </div>
    </div>
  );
}
