"use client";

import { useState } from "react";
import { updateTimeRecord } from "@/app/actions/time-records";
import { isoToDateTimeLocal } from "@/utils/date";
import { useRouter } from "next/navigation";
import { Pencil, FileText, CheckCircle2, X } from "lucide-react";

interface EditRecordModalProps {
  record: {
    id: string;
    employeeId: string;
    employeeName: string;
    recordedAt: string;
    recordType: "check_in" | "check_out";
    locationId?: string | null;
    locationName?: string | null;
    notes?: string | null;
  };
  locations: Array<{ id: string; name: string }>;
}

const REASON_PRESETS = [
  { label: "Забыл(а) отметиться", value: "Объяснительная: Забыл(а) отметиться" },
  { label: "Разрядился телефон", value: "Объяснительная: Разрядился телефон" },
  { label: "Сбой сканера / связи", value: "Объяснительная: Сбой сканера / интернета" },
  { label: "Задержка / переработка", value: "Объяснительная: Задержка на смене" },
  { label: "Уход по заявлению", value: "По заявлению / согласованию" },
];

export default function EditRecordModal({ record, locations }: EditRecordModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [recordType, setRecordType] = useState<"check_in" | "check_out">(record.recordType);
  const [datetime, setDatetime] = useState(() => isoToDateTimeLocal(record.recordedAt));
  const [locationId, setLocationId] = useState(record.locationId || locations[0]?.id || "");
  const [reasonType, setReasonType] = useState("Объяснительная: Забыл(а) отметиться");
  const [reasonDetail, setReasonDetail] = useState(
    record.notes && !record.notes.startsWith("iiko:") ? record.notes : ""
  );

  const handleOpen = () => {
    setRecordType(record.recordType);
    setDatetime(isoToDateTimeLocal(record.recordedAt));
    setLocationId(record.locationId || locations[0]?.id || "");
    setReasonDetail(record.notes && !record.notes.startsWith("iiko:") ? record.notes : "");
    setError(null);
    setShow(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("recordId", record.id);
    formData.append("recordType", recordType);
    formData.append("datetime", datetime);
    formData.append("locationId", locationId);
    formData.append("reasonType", reasonType);
    formData.append("reasonDetail", reasonDetail);

    const result = await updateTimeRecord(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setShow(false);
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        title="Редактировать по объяснительной"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg border border-amber-200/80 dark:border-amber-800/60 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span>Изменить</span>
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Редактирование по объяснительной</h3>
                  <p className="text-xs text-amber-100 mt-0.5">Сотрудник: {record.employeeName}</p>
                </div>
              </div>
              <button
                onClick={() => setShow(false)}
                type="button"
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Тип отметки */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Тип отметки
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecordType("check_in")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      recordType === "check_in"
                        ? "bg-green-600 text-white border-green-600 shadow-sm"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Приход (Check-In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordType("check_out")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      recordType === "check_out"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Уход (Check-Out)</span>
                  </button>
                </div>
              </div>

              {/* Дата и время */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Фактическое время по объяснительной *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Локация */}
              {locations && locations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Локация
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Причина / Основание */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Основание изменения
                </label>
                
                {/* Быстрые шаблоны */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setReasonType(preset.value);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                        reasonType === preset.value
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-transparent hover:bg-gray-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  placeholder="Тип основания (напр. Объяснительная)"
                  className="w-full p-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-medium mb-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={2}
                  placeholder="Детали объяснительной (напр.: Объяснительная от 28.09, забыл пробить уход, ушел со смены в 23:30)"
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? (
                    "Сохранение..."
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Применить объяснительную</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
