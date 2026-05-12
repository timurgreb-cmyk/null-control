"use client";

import { useState } from "react";
import { updateEmployee } from "@/app/actions/employees";

export default function EmployeeRow({ employee }: { employee: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("id", employee.id);

    try {
      const result = await updateEmployee(formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setLoading(false);
        setIsEditing(false);
        window.location.reload();
      }
    } catch (err: any) {
      setError("Непредвиденная ошибка: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">{employee.full_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{employee.position || "Должность не указана"}</p>
          </div>
          <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${
            employee.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {employee.is_active ? "Активен" : "Отключен"}
          </span>
        </div>
        
        <div className="mt-2 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-400">PIN-код:</span>
            <span className="font-mono font-bold tracking-wider">{employee.pin_code || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Телефон:</span>
            <span>{employee.phone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Ставка (смена):</span>
            <span className="font-bold text-gray-900">{employee.shift_rate ? `${employee.shift_rate} ₸` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Переработки:</span>
            <span className="font-bold text-gray-900">{employee.is_overtime_enabled !== false ? "Начисляются" : "Отключены"}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
          <button 
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-primary hover:text-primary/80 bg-primary/5 px-4 py-1.5 rounded-lg transition-colors"
          >
            Редактировать
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Редактирование сотрудника</h2>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    defaultValue={employee.full_name}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN-код (5 цифр)</label>
                  <input
                    name="pinCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    required
                    defaultValue={employee.pin_code}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono tracking-widest focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    name="position"
                    type="text"
                    defaultValue={employee.position || ""}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={employee.phone || ""}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ставка за смену (₸)</label>
                  <input
                    name="shiftRate"
                    type="number"
                    min="0"
                    step="100"
                    defaultValue={employee.shift_rate || ""}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="flex items-center pt-2">
                  <input
                    name="isOvertimeEnabled"
                    type="checkbox"
                    value="true"
                    defaultChecked={employee.is_overtime_enabled !== false}
                    id="isOvertimeCheck"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <label htmlFor="isOvertimeCheck" className="ml-2 text-sm text-gray-700">
                    Начислять переработки
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    name="isActive"
                    type="checkbox"
                    value="true"
                    defaultChecked={employee.is_active}
                    id="isActiveCheck"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <label htmlFor="isActiveCheck" className="ml-2 text-sm text-gray-700">
                    Активный сотрудник
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
      )}
    </>
  );
}
