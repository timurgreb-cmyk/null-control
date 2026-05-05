"use client";

import { useState } from "react";
import LocalTime from "@/components/LocalTime";

export default function TimesheetRow({ row }: { row: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)} 
        className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''} ${row.missingCheckouts > 0 ? "bg-red-50/50" : ""}`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="text-sm font-medium text-gray-900">{row.full_name}</div>
            <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="19 9l-7 7-7-7" />
            </svg>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
          {row.completedShifts} дн.
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.shift_rate ? `${row.shift_rate} ₸` : "Не задана"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
          {row.overtimeHours > 0 ? `+${row.overtimeHours.toFixed(1)} ч` : "—"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {row.missingCheckouts > 0 ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              {row.missingCheckouts} смен(ы)
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-primary">
          {row.totalEarned} ₸
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-gray-50/50">
          <td colSpan={6} className="px-6 py-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3 px-2">Детализация по дням:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {row.dailyDetails.map((detail: any) => (
                <div key={detail.day} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span suppressHydrationWarning className="font-bold text-gray-700">{detail.formattedDay}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      detail.status === 'complete' ? 'bg-green-100 text-green-700' : 
                      detail.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {detail.status === 'complete' ? 'Отработано' : detail.status === 'in_progress' ? 'В процессе' : 'Ошибка'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="text-gray-500">Приход: <span className="text-gray-900 font-medium">{detail.firstIn ? <LocalTime isoString={detail.firstIn} formatStr="HH:mm" /> : "—"}</span></div>
                    <div className="text-gray-500">Уход: <span className="text-gray-900 font-medium">{detail.lastOut ? <LocalTime isoString={detail.lastOut} formatStr="HH:mm" /> : "—"}</span></div>
                  </div>
                  {detail.status === 'complete' && (
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Отработано: <span className="font-medium text-gray-700">{detail.actualHours.toFixed(1)} ч.</span></span>
                      {detail.overtime > 0 && (
                        <span className="text-orange-600 font-medium">+ {detail.overtime.toFixed(1)} ч. переработки</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
