import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { startOfMonth, endOfMonth, parseISO, differenceInMinutes, format, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, ChevronLeft, ChevronRight, Wallet, AlertTriangle, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeeTimesheetPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Необходима авторизация</p>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Определяем дату по Алматы
  const now = new Date();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const selectedDate = new Date(currentYear, currentMonth, 1);
  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  const prevDate = subMonths(selectedDate, 1);
  const nextDate = addMonths(selectedDate, 1);

  // 1. Получаем профиль сотрудника
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, position, phone, pin_code, shift_rate, is_overtime_enabled")
    .eq("id", user.id)
    .single();

  // 2. Получаем локации (базовые часы)
  const { data: locationsData } = await supabaseAdmin
    .from("locations")
    .select("id, base_hours, name");

  const locationMap: Record<string, { baseHours: number, name: string }> = {};
  locationsData?.forEach(loc => {
    locationMap[loc.id] = {
      baseHours: loc.base_hours || 8,
      name: loc.name || "Локация"
    };
  });

  // 3. Получаем отметки прихода/ухода за выбранный месяц
  const { data: records } = await supabaseAdmin
    .from("time_records")
    .select("id, record_type, recorded_at, location_id, locations(name)")
    .eq("employee_id", user.id)
    .gte("recorded_at", startDate.toISOString())
    .lte("recorded_at", endDate.toISOString())
    .order("recorded_at", { ascending: true });

  // 4. Получаем решение по переработкам
  const { data: approvalsData } = await supabaseAdmin
    .from("overtime_approvals")
    .select("*")
    .eq("employee_id", user.id)
    .gte("record_date", format(startDate, 'yyyy-MM-dd'))
    .lte("record_date", format(endDate, 'yyyy-MM-dd'));

  // Группируем отметки по дням
  const daysMap: Record<string, typeof records> = {};
  records?.forEach(r => {
    const day = format(parseISO(r.recorded_at), 'yyyy-MM-dd');
    if (!daysMap[day]) daysMap[day] = [];
    daysMap[day]!.push(r);
  });

  let completedShifts = 0;
  let totalWorkedHours = 0;
  let totalOvertimeHours = 0;
  let missingCheckouts = 0;

  const dailyShifts: any[] = [];

  Object.entries(daysMap).forEach(([day, dayRecords]) => {
    const safeRecords = dayRecords || [];
    const checkIns = safeRecords.filter(r => r.record_type === 'check_in');
    const checkOuts = safeRecords.filter(r => r.record_type === 'check_out');

    const firstInRec = checkIns.length > 0 ? checkIns[0] : null;
    const lastOutRec = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

    const firstIn = firstInRec?.recorded_at || null;
    const lastOut = lastOutRec?.recorded_at || null;

    const formattedDay = format(parseISO(day), "d MMMM (EEE)", { locale: ru });
    const formattedFirstIn = firstIn ? format(parseISO(firstIn), "HH:mm") : "—";
    const formattedLastOut = lastOut ? format(parseISO(lastOut), "HH:mm") : "—";
    const locationName = (firstInRec?.locations as any)?.name || "Пекарня";

    if (firstIn && lastOut) {
      const actualMins = differenceInMinutes(parseISO(lastOut), parseISO(firstIn));
      const actualHours = actualMins / 60;
      totalWorkedHours += actualHours;

      let shiftMultiplier = 1.0;
      let overtime = 0;
      const existingApproval = approvalsData?.find(a => a.record_date === day);
      if (existingApproval && existingApproval.status === 'approved') {
        const val = existingApproval.approved_hours || 0;
        if (val === 5) shiftMultiplier = 0.5;
        else if (val === 15) shiftMultiplier = 1.5;
        else if (val === 20) shiftMultiplier = 2.0;
        else if (val === 10 || val === 1) shiftMultiplier = 1.0;
        else if (val > 100) overtime = val - 100;
        else overtime = val;
      }

      completedShifts += shiftMultiplier;
      totalOvertimeHours += overtime;

      const shiftRate = profile?.shift_rate || 0;
      const hourlyRate = shiftRate / 8;
      const shiftPay = Math.round((shiftMultiplier * shiftRate) + (overtime * hourlyRate));

      dailyShifts.push({
        day,
        formattedDay,
        formattedFirstIn,
        formattedLastOut,
        locationName,
        actualHours: actualHours.toFixed(1),
        shiftMultiplier,
        overtimeHours: overtime,
        shiftPay,
        status: 'complete'
      });
    } else if (firstIn && !lastOut) {
      const isToday = day === format(new Date(), 'yyyy-MM-dd');
      if (!isToday) {
        missingCheckouts++;
        dailyShifts.push({
          day,
          formattedDay,
          formattedFirstIn,
          formattedLastOut: '—',
          locationName,
          actualHours: '—',
          shiftPay: 0,
          status: 'missing_checkout'
        });
      } else {
        dailyShifts.push({
          day,
          formattedDay,
          formattedFirstIn,
          formattedLastOut: 'В процессе',
          locationName,
          actualHours: '—',
          shiftPay: 0,
          status: 'in_progress'
        });
      }
    }
  });

  // Сортируем смены от новых к старым
  dailyShifts.sort((a, b) => b.day.localeCompare(a.day));

  const shiftRate = profile?.shift_rate || 0;
  const hourlyRate = shiftRate / 8;
  const basePay = completedShifts * shiftRate;
  const overtimePay = totalOvertimeHours * hourlyRate;
  const totalEarned = Math.round(basePay + overtimePay);

  const monthTitle = format(selectedDate, "LLLL yyyy", { locale: ru });

  return (
    <div className="p-4 pt-6 max-w-md mx-auto pb-28">
      {/* Шапка и переключатель месяца */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Мой табель</h1>
          <p className="text-gray-500 text-xs">Учет смен, часов и начисленной зарплаты</p>
        </div>

        <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          <Link
            href={`/app/timesheet?month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`}
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-xs font-bold text-gray-900 px-2 capitalize">
            {format(selectedDate, "LLL yyyy", { locale: ru })}
          </span>
          <Link
            href={`/app/timesheet?month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`}
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Карточка зарплаты за месяц */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-primary/80 text-white rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-primary" />
            Заработано в {format(selectedDate, "LLLL", { locale: ru })}е
          </span>
          <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            Ставка: {shiftRate.toLocaleString("ru-RU")} ₸
          </span>
        </div>

        <div className="text-3xl font-black mb-6 tracking-tight">
          {totalEarned.toLocaleString("ru-RU")} <span className="text-lg font-bold text-gray-400">₸</span>
        </div>

        {/* Сетка показателей смен */}
        <div className="grid grid-cols-2 gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
          <div>
            <p className="text-[10px] text-gray-300 font-semibold mb-0.5">ОТРАБОТАНО СМЕН</p>
            <p className="text-base font-black text-white">{completedShifts} смен</p>
          </div>
          <div className="border-l border-white/10 pl-2">
            <p className="text-[10px] text-gray-300 font-semibold mb-0.5">СТАВКА ЗА СМЕНУ</p>
            <p className="text-base font-black text-emerald-400">{shiftRate.toLocaleString("ru-RU")} ₸</p>
          </div>
        </div>
      </div>

      {/* Список смен за месяц */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-gray-900 text-sm">Смены за {monthTitle}</h2>
          </div>
          <span className="text-xs text-gray-400 font-bold">
            {dailyShifts.length} дней
          </span>
        </div>

        {dailyShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            В этом месяце смен пока не зафиксировано
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dailyShifts.map((shift, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm capitalize">{shift.formattedDay}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {shift.locationName}
                    </p>
                  </div>

                  {shift.status === 'complete' && (
                    <div className="text-right">
                      <span className="font-black text-sm text-gray-900">
                        +{Math.round(shift.shiftPay).toLocaleString("ru-RU")} ₸
                      </span>
                    </div>
                  )}

                  {shift.status === 'in_progress' && (
                    <span className="bg-blue-50 text-blue-600 border border-blue-100 font-bold text-xs px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      На смене
                    </span>
                  )}

                  {shift.status === 'missing_checkout' && (
                    <span className="bg-red-50 text-red-600 border border-red-100 font-bold text-xs px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Нет ухода
                    </span>
                  )}
                </div>

                {/* Времена прихода и ухода */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="text-gray-400 font-medium">Приход:</span>
                    <span className="font-bold text-gray-900">{shift.formattedFirstIn}</span>
                  </div>
                  <div className="w-4 h-[1px] bg-gray-300" />
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="text-gray-400 font-medium">Уход:</span>
                    <span className="font-bold text-gray-900">{shift.formattedLastOut}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Данные сотрудника и кнопка выхода */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
            <UserCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-base">{profile?.full_name || "Сотрудник"}</h3>
            <p className="text-xs text-gray-500">{profile?.position || "Сотрудник пекарни"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <p className="text-gray-400 font-semibold mb-0.5">Телефон</p>
            <p className="font-bold text-gray-900">{profile?.phone || "Не указан"}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <p className="text-gray-400 font-semibold mb-0.5">PIN для входа</p>
            <p className="font-mono font-bold text-gray-900 tracking-wider">{profile?.pin_code || "—"}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-2xl font-bold text-sm active:scale-95 transition-all mt-2"
          >
            <LogOut className="w-4 h-4" />
            Выйти из системы
          </button>
        </form>
      </div>
    </div>
  );
}
