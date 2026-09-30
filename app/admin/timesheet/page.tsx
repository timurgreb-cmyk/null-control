import { createClient as createAdminClient } from "@supabase/supabase-js";
import { startOfMonth, endOfMonth, parseISO, differenceInMinutes, format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { formatLocalTime } from "@/utils/date";
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
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const now = new Date();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const startDate = startOfMonth(new Date(currentYear, currentMonth));
  const endDate = endOfMonth(startDate);
  const searchEndLimit = addDays(endDate, 1);

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

  // 3. Получаем отметки за месяц (+ 1 день для ночных смен)
  const { data: records } = await supabase
    .from("time_records")
    .select("*")
    .gte("recorded_at", startDate.toISOString())
    .lte("recorded_at", searchEndLimit.toISOString())
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

    const dailyDetails: any[] = [];
    const usedRecordIds = new Set<string>();

    for (let i = 0; i < empRecords.length; i++) {
      const rec = empRecords[i];
      if (usedRecordIds.has(rec.id)) continue;

      if (rec.record_type === 'check_in') {
        usedRecordIds.add(rec.id);
        const inTime = parseISO(rec.recorded_at);
        const day = format(inTime, 'yyyy-MM-dd');

        // Проверяем, что смена началась именно в выбранном месяце
        if (inTime < startDate || inTime > endDate) {
          continue;
        }

        // Ищем следующий check_out в пределах 20 часов (поддержка ночных смен)
        let nextOutRec: typeof rec | null = null;
        for (let j = i + 1; j < empRecords.length; j++) {
          const candidate = empRecords[j];
          if (usedRecordIds.has(candidate.id)) continue;

          const candidateTime = parseISO(candidate.recorded_at);
          const diffHours = differenceInMinutes(candidateTime, inTime) / 60;

          if (candidate.record_type === 'check_out' && diffHours >= 0 && diffHours <= 20) {
            nextOutRec = candidate;
            usedRecordIds.add(candidate.id);
            break;
          }
          if (candidate.record_type === 'check_in') {
            break;
          }
        }

        const firstIn = rec.recorded_at;
        const lastOut = nextOutRec ? nextOutRec.recorded_at : null;

        const formattedDay = format(inTime, "d MMM (EEE)", { locale: ru });
        const formattedFirstIn = formatLocalTime(firstIn);
        const formattedLastOut = lastOut ? formatLocalTime(lastOut) : "—";

        if (firstIn && lastOut) {
          const actualMins = differenceInMinutes(parseISO(lastOut), parseISO(firstIn));
          const actualHours = actualMins / 60;
          totalWorkedHours += actualHours;

          const locId = rec.location_id;
          const baseHours = locId && locationMap[locId] ? locationMap[locId] : 8;

          let calculatedOvertime = 0;
          if (emp.is_overtime_enabled !== false) {
            const rawOvertime = actualHours - (baseHours + 1);
            if (rawOvertime > 0) {
              calculatedOvertime = Math.floor(rawOvertime);
            }
          }

          let shiftMultiplier = 1.0;
          let overtimeHours = 0;
          let creditType: 'multiplier' | 'hours' = 'multiplier';

          const existingApproval = approvalsData?.find(a => a.employee_id === emp.id && a.record_date === day);
          if (existingApproval && existingApproval.status === 'approved') {
            const val = existingApproval.approved_hours || 0;
            if (val === 5) {
              shiftMultiplier = 0.5;
              creditType = 'multiplier';
            } else if (val === 15) {
              shiftMultiplier = 1.5;
              creditType = 'multiplier';
            } else if (val === 20) {
              shiftMultiplier = 2.0;
              creditType = 'multiplier';
            } else if (val === 10 || val === 1) {
              shiftMultiplier = 1.0;
              creditType = 'multiplier';
            } else if (val > 100) {
              overtimeHours = val - 100;
              creditType = 'hours';
            } else {
              overtimeHours = val;
              creditType = 'hours';
            }
          }

          completedShifts += shiftMultiplier;
          totalOvertimeHours += overtimeHours;

          dailyDetails.push({ 
            day, 
            formattedDay, 
            formattedFirstIn, 
            formattedLastOut, 
            firstIn, 
            lastOut, 
            actualHours,
            calculatedOvertime,
            shiftMultiplier,
            overtimeHours,
            creditType,
            status: 'complete' 
          });
        } else {
          const nowDay = format(new Date(), 'yyyy-MM-dd');
          const isToday = day === nowDay;
          if (!isToday) {
            missingCheckouts++;
            dailyDetails.push({ day, formattedDay, formattedFirstIn, formattedLastOut, firstIn, lastOut: null, status: 'missing_checkout' });
          } else {
            dailyDetails.push({ day, formattedDay, formattedFirstIn, formattedLastOut: 'В процессе', firstIn, lastOut: null, status: 'in_progress' });
          }
        }
      }
    }

    const hourlyRate = (emp.shift_rate || 0) / 8;
    const basePay = completedShifts * (emp.shift_rate || 0);
    const overtimePay = totalOvertimeHours * hourlyRate;
    const totalEarned = Math.round(basePay + overtimePay);

    return {
      ...emp,
      completedShifts,
      missingCheckouts,
      totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
      totalOvertimeHours,
      totalEarned,
      dailyDetails
    };
  }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Табель учета рабочего времени</h1>
          <p className="text-sm text-gray-500 mt-1">
            Агрегированные данные по сменам, ночным сменам и переработкам
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <MonthSelector currentMonth={currentMonth} currentYear={currentYear} />
          <ExportCsvButton 
            data={timesheet} 
            month={format(startDate, "LLLL_yyyy", { locale: ru })} 
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Сотрудник</th>
                <th className="py-3 px-4 text-center">Смен</th>
                <th className="py-3 px-4 text-center">Отработано</th>
                <th className="py-3 px-4 text-center">Переработки</th>
                <th className="py-3 px-4 text-center">Пропуски</th>
                <th className="py-3 px-4 text-right">Начислено</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timesheet.map((emp) => (
                <TimesheetRow 
                  key={emp.id} 
                  row={emp} 
                />
              ))}
              {timesheet.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Нет данных за выбранный месяц
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
