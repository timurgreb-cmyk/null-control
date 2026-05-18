"use client";

import { useState, useEffect } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle, Clock, Pencil, Trash2, X, Check } from "lucide-react";
import { uploadProductionLog, getTodayProductionLogs, updateProductionLog, deleteProductionLog } from "@/app/actions/production";

export default function ProductionPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(0);

  const loadHistory = async () => {
    const res = await getTodayProductionLogs();
    if (res.success) {
      setHistory(res.data);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    setResult([]);

    try {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_DIMENSION = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setError("Ошибка сжатия"); setLoading(false); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

        try {
          const res = await uploadProductionLog(compressedBase64);
          if (res.success) {
            setSuccess(true);
            setResult(res.data || []);
            loadHistory();
          } else {
            setError(res.error || "Ошибка распознавания");
          }
        } catch (serverErr: any) {
          setError(serverErr.message || "Ошибка соединения с сервером");
        }
        setLoading(false);
      };

      img.onerror = () => { setError("Ошибка загрузки изображения"); setLoading(false); };
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Неизвестная ошибка");
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.product_name);
    setEditQty(item.quantity);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const res = await updateProductionLog(editingId, editName, editQty);
    if (res.success) {
      setEditingId(null);
      loadHistory();
    } else {
      setError(res.error || "Ошибка обновления");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;
    const res = await deleteProductionLog(id);
    if (res.success) {
      loadHistory();
    } else {
      setError(res.error || "Ошибка удаления");
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
        <div className="relative mb-8">
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
        <div className="bg-white border border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm mb-8">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <span className="font-bold text-gray-900">Анализ изображения...</span>
          <span className="text-gray-500 text-sm mt-2 text-center">ИИ распознаёт почерк по справочнику продукции</span>
        </div>
      )}

      {/* История за сегодня */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center">
          <Clock className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="font-bold text-gray-900">Загружено сегодня</h2>
          {history.length > 0 && (
            <span className="ml-auto bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-bold">
              {history.length}
            </span>
          )}
        </div>
        
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Вы еще ничего не загружали сегодня
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((item) => {
              const time = new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              const isEditing = editingId === item.id;

              return (
                <div key={item.id} className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Название продукции"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                          className="w-24 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          placeholder="Кол-во"
                        />
                        <span className="text-gray-400 text-sm">шт.</span>
                        <div className="ml-auto flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 bg-green-100 text-green-700 rounded-lg active:scale-95 transition-transform"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 bg-gray-100 text-gray-500 rounded-lg active:scale-95 transition-transform"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-400">{time}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <div className="bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg text-sm whitespace-nowrap">
                          {item.quantity} шт.
                        </div>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-400 hover:text-primary active:scale-95 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
