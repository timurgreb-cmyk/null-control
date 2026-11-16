"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, LogIn, LogOut, MapPin, Clock, Users } from "lucide-react";
import DeleteRecordButton from "./DeleteRecordButton";
import EditRecordModal from "./EditRecordModal";
import LocalTime from "@/components/LocalTime";

interface AttendanceRecord {
  id: string;
  recorded_at: string;
  record_type: "check_in" | "check_out";
  employee_id: string;
  location_id: string | null;
  notes: string | null;
  profiles: { id: string; full_name: string } | null;
  locations: { name: string } | null;
  isError: boolean;
}

interface EmployeeGroup {
  employeeId: string;
  employeeName: string;
  records: AttendanceRecord[];
  lastActivity: string; // ISO date of most recent record
  todayCount: number;
}

interface Props {
  groupedEmployees: EmployeeGroup[];
  locations: Array<{ id: string; name: string }>;
}

// Группировка записей по дате (Almaty +05:00)
function groupByDate(records: AttendanceRecord[]): Record<string, AttendanceRecord[]> {
  const groups: Record<string, AttendanceRecord[]> = {};
  
  records.forEach(record => {
    // Преобразуем UTC в Алматы (+5) для группировки по локальному дню
    const date = new Date(record.recorded_at);
    const almatyDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
    const dateKey = almatyDate.toISOString().split("T")[0]; // YYYY-MM-DD
    
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(record);
  });

  return groups;
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const weekdays = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  
  const date = new Date(year, month - 1, day);
  const weekday = weekdays[date.getDay()];
  
  const today = new Date();
  const todayAlmaty = new Date(today.getTime() + 5 * 60 * 60 * 1000);
  const todayStr = todayAlmaty.toISOString().split("T")[0];
  
  const yesterday = new Date(todayAlmaty);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return `Сегодня, ${day} ${months[month - 1]}`;
  if (dateStr === yesterdayStr) return `Вчера, ${day} ${months[month - 1]}`;
  return `${weekday}, ${day} ${months[month - 1]}`;
}

export default function AttendanceClient({ groupedEmployees, locations }: Props) {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return groupedEmployees;
    const q = search.toLowerCase().trim();
    return groupedEmployees.filter(e => e.employeeName.toLowerCase().includes(q));
  }, [groupedEmployees, search]);

  const toggleEmployee = (id: string) => {
    setExpandedEmployee(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени сотрудника..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-all"
        />
      </div>

      {/* Список сотрудников */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {search ? "Сотрудник не найден" : "Отметок пока нет"}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {search ? "Попробуйте изменить запрос" : "Сотрудники еще не сканировали QR-код"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map(emp => {
              const isExpanded = expandedEmployee === emp.employeeId;
              const dateGroups = isExpanded ? groupByDate(emp.records) : {};
              const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));

              return (
                <li key={emp.employeeId}>
                  {/* Строка сотрудника */}
                  <button
                    onClick={() => toggleEmployee(emp.employeeId)}
                    className={`w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors ${
                      isExpanded ? "bg-gray-50 dark:bg-slate-800/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isExpanded
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                      }`}>
                        {emp.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {emp.employeeName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {emp.records.length} {emp.records.length === 1 ? "отметка" : emp.records.length < 5 ? "отметки" : "отметок"}
                          {emp.todayCount > 0 && (
                            <span className="text-green-600 dark:text-green-400 font-semibold ml-1.5">
                              • сегодня {emp.todayCount}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {emp.records.some(r => r.isError) && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Есть незакрытые смены" />
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4.5 h-4.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4.5 h-4.5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Развёрнутые записи по дням */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/30">
                      {sortedDates.map(dateKey => (
                        <div key={dateKey}>
                          {/* Заголовок дня */}
                          <div className="px-5 py-2.5 bg-gray-100/80 dark:bg-slate-800/60 border-b border-gray-200/60 dark:border-slate-700/50">
                            <span className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                              {formatDateLabel(dateKey)}
                            </span>
                          </div>

                          {/* Записи за день */}
                          <ul className="divide-y divide-gray-100/80 dark:divide-slate-800/60">
                            {dateGroups[dateKey].map(record => (
                              <li
                                key={record.id}
                                className={`px-5 py-3.5 flex flex-col transition-colors ${
                                  record.isError ? "bg-red-50/40 dark:bg-red-950/10" : "hover:bg-white dark:hover:bg-slate-900/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  {/* Левая часть: тип + время + локация */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      record.record_type === "check_in"
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    }`}>
                                      {record.record_type === "check_in" ? (
                                        <LogIn className="w-4 h-4" />
                                      ) : (
                                        <LogOut className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                                          <LocalTime isoString={record.recorded_at} formatStr="HH:mm" />
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                          record.record_type === "check_in"
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-blue-600 dark:text-blue-400"
                                        }`}>
                                          {record.record_type === "check_in" ? "Приход" : "Уход"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{(record.locations as any)?.name || "Неизвестно"}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Правая часть: действия */}
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <EditRecordModal
                                      record={{
                                        id: record.id,
                                        employeeId: record.employee_id,
                                        employeeName: emp.employeeName,
                                        recordedAt: record.recorded_at,
                                        recordType: record.record_type,
                                        locationId: record.location_id,
                                        locationName: (record.locations as any)?.name,
                                        notes: record.notes,
                                      }}
                                      locations={locations}
                                    />
                                    <DeleteRecordButton recordId={record.id} />
                                  </div>
                                </div>

                                {/* Бейдж объяснительной */}
                                {record.notes && (
                                  <div className="mt-2 ml-11 p-2 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                                    <span className="text-sm leading-none">📝</span>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-bold text-amber-950 dark:text-amber-100">Основание: </span>
                                      <span className="break-words">{record.notes}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Ошибка незакрытой смены */}
                                {record.isError && (
                                  <div className="mt-2 ml-11 text-xs text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/50 flex items-center gap-1.5">
                                    <span>⚠️</span> Нет отметки об уходе
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
