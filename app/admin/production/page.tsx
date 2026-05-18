// ok
import { createClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import LocalTime from "@/components/LocalTime";
import DeleteProductionButton from "./DeleteProductionButton";

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
      employee_id,
      profiles (
        id,
        full_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Ошибка загрузки выработки:", error);
  }

  // Группировка по сотрудникам (как в журнале отметок)
  const groupedByEmployee: Record<string, { employeeName: string, employeeId: string, records: any[] }> = {};
  
  logs?.forEach((log) => {
    const empId = log.employee_id;
    if (!groupedByEmployee[empId]) {
      groupedByEmployee[empId] = {
        employeeId: empId,
        employeeName: (log.profiles as any)?.full_name || "Неизвестный",
        records: []
      };
    }
    groupedByEmployee[empId].records.push(log);
  });

  const groupedArray = Object.values(groupedByEmployee).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Выработка продукции</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedArray.map(group => (
          <div key={group.employeeId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
               <h3 className="font-bold text-gray-900 truncate pr-2">{group.employeeName}</h3>
               <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap">
                 {group.records.length} {group.records.length === 1 ? 'запись' : 'записей'}
               </span>
            </div>
            <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-gray-100">
                {group.records.map(record => (
                  <li key={record.id} className="p-5 flex flex-col hover:bg-gray-50 transition-colors">
                     <div className="flex justify-between items-start mb-2.5">
                       <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-full bg-indigo-100 text-indigo-700">
                         {record.product_name}
                       </span>
                       <div className="text-gray-900 font-bold">
                         {record.quantity} шт.
                       </div>
                     </div>
                     <div className="flex justify-between items-end mt-1">
                       <div className="text-xs text-gray-500 font-medium">
                         📅 {format(parseISO(record.record_date), "d MMM yyyy", { locale: ru })}
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="text-xs text-gray-400">
                           <LocalTime isoString={record.created_at} formatStr="HH:mm" />
                         </div>
                         <DeleteProductionButton logId={record.id} />
                       </div>
                     </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        {groupedArray.length === 0 && (
           <div className="col-span-full bg-white p-12 rounded-2xl text-center text-gray-500 border border-gray-200">
             <p className="text-lg font-medium text-gray-900 mb-1">Данных пока нет</p>
             <p className="text-sm">Ни один сотрудник еще не загрузил выработку</p>
           </div>
        )}
      </div>
    </div>
  );
}
