"use client";

import { useState } from "react";
import { createManualRecord } from "@/app/actions/time-records";
import { useRouter } from "next/navigation";

interface AddRecordModalProps {
  employees: any[];
  locations?: Array<{ id: string; name: string }>;
}

const REASON_PRESETS = [
  { label: "Забыл(а) отметиться", value: "Объяснительная: Забыл(а) отметиться" },
  { label: "Разрядился телефон", value: "Объяснительная: Разрядился телефон" },
  { label: "Сбой сканера / связи", value: "Объяснительная: Сбой сканера / интернета" },
  { label: "Задержка / переработка", value: "Объяснительная: Задержка на смене" },
];

export default function AddRecordModal({ employees, locations = [] }: AddRecordModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState("По объяснительной");
  const [reasonDetail, setReasonDetail] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append("reasonType", reasonType);
    formData.append("reasonDetail", reasonDetail);

    const result = await createManualRecord(formData);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setShow(false);
      setLoading(false);
      setReasonDetail("");
      router.refresh();
    }
  };

  return (
    <>
      <button 
        onClick={() => setShow(true)}
        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-1.5"
      >
        <span>+ Добавить отметку</span>
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 text-gray-900">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Добавить отметку</h2>
            <p className="text-xs text-gray-500 mb-4">Внесение отметки по объяснительной или служебной записке</p>
            
            {error && <div className="mb-4 text-red-500 text-xs bg-red-50 border border-red-200 p-3 rounded-xl font-medium">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Сотрудник *</label>
                <select name="employeeId" required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Событие *</label>
                <select name="recordType" required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="check_in">Приход (Check-In)</option>
                  <option value="check_out">Уход (Check-Out)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Дата и Время *</label>
                <input type="datetime-local" name="datetime" required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Локация</label>
                  <select name="locationId" className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none">
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Основание */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Основание / Объяснительная</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setReasonType(preset.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                        reasonType === preset.value
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                          : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Детали объяснительной (напр.: Забыл отметиться, пришел в 09:00)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              
              <div className="flex justify-end pt-3 space-x-2.5 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShow(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? "Сохранение..." : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
