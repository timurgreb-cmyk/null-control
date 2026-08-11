"use client";

import { useState } from "react";
import LocalTime from "@/components/LocalTime";
import { processOvertimeApproval } from "@/app/actions/timesheet";

export default function TimesheetRow({ row }: { row: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetMultiplier = async (e: React.MouseEvent, detail: any, multiplier: number) => {
    e.stopPropagation();
    setLoading(true);
    await processOvertimeApproval(row.id, detail.day, 0, multiplier, 'approved');
    setLoading(false);
  };

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)} 
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''} ${row.missingCheckouts > 0 ? "bg-red-50/50" : ""}`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="text-sm font-bold text-gray-900">{row.full_name}</div>
            <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
          {row.completedShifts} смен(ы)
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
          {row.totalWorkedHours ? row.totalWorkedHours.toFixed(1) : "0.0"} ч
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
          {row.shift_rate ? `${row.shift_rate.toLocaleString("ru-RU")} ₸` : "Не задана"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {row.missingCheckouts > 0 ? (
            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800">
              {row.missingCheckouts} пропуск(а)
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-base font-black text-primary">
          {row.totalEarned.toLocaleString("ru-RU")} ₸
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-gray-50/50">
          <td colSpan={6} className="px-6 py-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Детализация по дням и выбор коэффициента смены:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {row.dailyDetails.map((detail: any) => (
                <div key={detail.day} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span suppressHydrationWarning className="font-bold text-gray-800 text-xs">{detail.formattedDay}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detail.status === 'complete' ? 'bg-green-100 text-green-700' : 
                        detail.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {detail.status === 'complete' ? `${detail.shiftMultiplier || 1.0} смены` : detail.status === 'in_progress' ? 'В процессе' : 'Ошибка'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-xs mb-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <div className="text-gray-500">Приход: <span className="text-gray-900 font-bold">{detail.firstIn ? <LocalTime isoString={detail.firstIn} formatStr="HH:mm" /> : "—"}</span></div>
                      <div className="text-gray-500">Уход: <span className="text-gray-900 font-bold">{detail.lastOut ? <LocalTime isoString={detail.lastOut} formatStr="HH:mm" /> : "—"}</span></div>
                    </div>
                  </div>

                  {detail.status === 'complete' && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Засчитать количество смен:</div>
                      <div className="grid grid-cols-4 gap-1">
                        {[0.5, 1.0, 1.5, 2.0].map((mult) => {
                          const isSelected = (detail.shiftMultiplier || 1.0) === mult;
                          return (
                            <button
                              key={mult}
                              onClick={(e) => handleSetMultiplier(e, detail, mult)}
                              disabled={loading}
                              className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                                isSelected
                                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {mult}
                            </button>
                          );
                        })}
                      </div>
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
