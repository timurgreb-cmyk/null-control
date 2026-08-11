import { createClient } from "@supabase/supabase-js";
import { startOfMonth, endOfMonth, parseISO, differenceInMinutes, format } from "date-fns";
import { ru } from "date-fns/locale";
import ExportCsvButton from "./ExportCsvButton";
import MonthSelector from "./MonthSelector";
import TimesheetRow from "@/components/admin/TimesheetRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const now = new Date();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const startDate = startOfMonth(new Date(currentYear, currentMonth));
  const endDate = endOfMonth(startDate);

  // 1. Получаем сотрудников
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, shift_rate, is_overtime_enabled")
    .eq("role", "employee")
    .order("full_name");

  // 2. Получаем локации (для базовых часов)
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, base_hours");

  const locationMap: Record<string, number> = {};
  locationsData?.forEach(loc => {
    locationMap[loc.id] = loc.base_hours || 8; // По умолчанию 8 часов
  });

  // 3. Получаем отметки за месяц
  const { data: records } = await supabase
    .from("time_records")
    .select("*")
    .gte("recorded_at", startDate.toISOString())
    .lte("recorded_at", endDate.toISOString())
    .order("recorded_at", { ascending: true });

  // 3.5 Получаем решения по переработкам (свыше 3 часов)
  const { data: approvalsData } = await supabase
    .from("overtime_approvals")
    .select("*")
    .gte("record_date", format(startDate, 'yyyy-MM-dd'))
    .lte("record_date", format(endDate, 'yyyy-MM-dd'));

  // 4. Агрегация данных
  const timesheet = employees?.map(emp => {
    const empRecords = records?.filter(r => r.employee_id === emp.id) || [];
    let completedShifts = 0;
    let missingCheckouts = 0;
    let totalOvertimeHours = 0;

    let totalWorkedHours = 0;

    // Группируем по дням
    const days: Record<string, typeof empRecords> = {};
    empRecords.forEach(r => {
      const day = format(parseISO(r.recorded_at), 'yyyy-MM-dd');
      if (!days[day]) days[day] = [];
      days[day].push(r);
    });

    const dailyDetails: any[] = [];

    Object.entries(days).forEach(([day, dayRecords]) => {
      const dayCheckIns = dayRecords.filter(r => r.record_type === 'check_in');
      const dayCheckOuts = dayRecords.filter(r => r.record_type === 'check_out');

      const firstInRec = dayCheckIns.length > 0 ? dayCheckIns[0] : null;
      const lastOutRec = dayCheckOuts.length > 0 ? dayCheckOuts[dayCheckOuts.length - 1] : null;

      const firstIn = firstInRec?.recorded_at || null;
      const lastOut = lastOutRec?.recorded_at || null;

      const formattedDay = format(parseISO(day), "d MMM (EEE)", { locale: ru });
      const formattedFirstIn = firstIn ? format(parseISO(firstIn), "HH:mm") : "—";
      const formattedLastOut = lastOut ? format(parseISO(lastOut), "HH:mm") : "—";

      if (firstIn && lastOut) {
        const actualMins = differenceInMinutes(parseISO(lastOut), parseISO(firstIn));
        const actualHours = actualMins / 60;
        totalWorkedHours += actualHours;

        // Коэффициент смены (по умолчанию 1.0, админ может выбрать 0.5, 1.0, 1.5, 2.0)
        let shiftMultiplier = 1.0;
        const existingApproval = approvalsData?.find(a => a.employee_id === emp.id && a.record_date === day);
        if (existingApproval && existingApproval.status === 'approved' && existingApproval.approved_hours > 0) {
          shiftMultiplier = existingApproval.approved_hours;
        }

        completedShifts += shiftMultiplier;

        dailyDetails.push({ 
          day, 
          formattedDay, 
          formattedFirstIn, 
          formattedLastOut, 
          firstIn, 
          lastOut, 
          actualHours,
          shiftMultiplier,
          status: 'complete' 
        });
      } else if (firstIn && !lastOut) {
        const isToday = day === new Date().toISOString().split('T')[0];
        if (!isToday) {
          missingCheckouts++;
          dailyDetails.push({ day, formattedDay, formattedFirstIn, formattedLastOut, firstIn, lastOut: null, status: 'missing_checkout' });
        } else {
          dailyDetails.push({ day, formattedDay, formattedFirstIn, formattedLastOut, firstIn, lastOut: null, status: 'in_progress' });
        }
      }
    });

    // Расчет ЗП с учетом коэффициента смен
    const totalEarned = Math.round(completedShifts * (emp.shift_rate || 0));

    return {
      ...emp,
      completedShifts,
      totalWorkedHours,
      overtimeHours: 0,
      totalEarned: totalEarned,
      missingCheckouts,
      dailyDetails
    };
  }) || [];

  const periodStr = format(startDate, "yyyy_MM");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Табель</h1>
        <div className="flex items-center space-x-3">
          <MonthSelector currentMonth={currentMonth} currentYear={currentYear} />
          <ExportCsvButton data={timesheet} month={periodStr} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФИО</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Отработано дней</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Часы</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ставка за смену</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Переработки (ч)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Незакрытые смены</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Итого к выплате</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {timesheet.map((row) => (
              <TimesheetRow key={row.id} row={row} />
            ))}
            {timesheet.length === 0 && (
              <tr suppressHydrationWarning>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Сотрудников пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
