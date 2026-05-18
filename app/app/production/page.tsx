"use client";

import { useState } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadProductionLog } from "@/app/actions/production";

export default function ProductionPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any[]>([]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    setResult([]);

    try {
      // Идеально было бы сжать через Canvas, но для MVP читаем как есть
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = reader.result as string;
        const res = await uploadProductionLog(base64Str);
        if (res.success) {
          setSuccess(true);
          setResult(res.data || []);
        } else {
          setError(res.error || "Ошибка распознавания");
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Ошибка чтения файла");
        setLoading(false);
      };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pt-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Выработка продукции</h1>
      <p className="text-gray-500 mb-8 text-sm">Сфотографируйте рукописный лист с вашей выработкой за смену.</p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 flex items-start border border-red-100">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-2xl mb-6 border border-green-100">
          <div className="flex items-center mb-3">
            <CheckCircle2 className="w-6 h-6 mr-2 text-green-500" />
            <span className="font-bold">Успешно распознано!</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-green-100">
            <ul className="space-y-2 text-sm">
              {result.map((item, idx) => (
                <li key={idx} className="flex justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <span className="text-gray-600">{item.product_name}</span>
                  <span className="font-bold">{item.quantity} шт.</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-green-600 mt-3 text-center">Данные сохранены в систему</p>
        </div>
      )}

      {!loading ? (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="bg-primary hover:bg-primary/90 transition-colors text-white rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg shadow-primary/30">
            <div className="bg-white/20 p-4 rounded-full mb-4">
              <Camera className="w-10 h-10" />
            </div>
            <span className="font-bold text-lg">Сделать фото отчета</span>
            <span className="text-primary-foreground/80 text-sm mt-1 text-center">ИИ автоматически прочитает ваш почерк</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <span className="font-bold text-gray-900">Анализ изображения...</span>
          <span className="text-gray-500 text-sm mt-2 text-center">Искусственный интеллект читает ваш почерк</span>
        </div>
      )}
    </div>
  );
}
