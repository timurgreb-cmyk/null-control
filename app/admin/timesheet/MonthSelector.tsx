"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  currentMonth: number; // 0-11
  currentYear: number;
}

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
];

export default function MonthSelector({ currentMonth, currentYear }: MonthSelectorProps) {
  const router = useRouter();

  // Создаем массив годов от текущего -3 до текущего +1
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

  const navigate = (month: number, year: number) => {
    let targetMonth = month;
    let targetYear = year;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    router.push(`/admin/timesheet?month=${targetMonth}&year=${targetYear}`);
  };

  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 px-2 py-1">
      <button
        onClick={() => navigate(currentMonth - 1, currentYear)}
        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
        title="Предыдущий месяц"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <select
        value={currentMonth}
        onChange={(e) => navigate(parseInt(e.target.value), currentYear)}
        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer py-1 px-2 hover:bg-gray-50 rounded"
      >
        {MONTHS.map((name, index) => (
          <option key={index} value={index}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={(e) => navigate(currentMonth, parseInt(e.target.value))}
        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer py-1 px-2 hover:bg-gray-50 rounded"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        onClick={() => navigate(currentMonth + 1, currentYear)}
        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
        title="Следующий месяц"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
