"use client";

import { useState } from "react";
import { createManualRecord } from "@/app/actions/time-records";
import { useRouter } from "next/navigation";

export default function AddRecordModal({ employees }: { employees: any[] }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await createManualRecord(formData);
    
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
        onClick={() => setShow(true)}
        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
      >
        + Добавить вручную
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Добавить отметку</h2>
            
            {error && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сотрудник *</label>
                <select name="employeeId" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Событие *</label>
                <select name="recordType" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="check_in">Приход</option>
                  <option value="check_out">Уход</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата и Время *</label>
                <input type="datetime-local" name="datetime" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              
              <div className="flex justify-end pt-4 space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShow(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
