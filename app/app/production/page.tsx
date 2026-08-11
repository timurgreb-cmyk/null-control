"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle, Clock, Pencil, Trash2, X, Check, Search, PlusCircle, Image as ImageIcon, RefreshCw } from "lucide-react";
import { uploadProductionLog, getTodayProductionLogs, updateProductionLog, deleteProductionLog, addManualProductionLog } from "@/app/actions/production";

const ALL_PRODUCTS = [
  "Самса", "Учпучмак", "Пирожок с картофелем", "Пирожок с капустой", "Пирожное Картошка", "Пирожок с брынзой и шпинатом", 
  "Пирожок с картошкой и грибами", "Пирожок с луком и яйцом", "Беляши", "Сосиска в тесте", "Баурсаки",
  "Мини семга/рис", "Мини курица брынза шпинат", "Мини фарш/тыква", "Мини пирог капуста-яйцо",
  "Пирог Курица Картофель", "Пирог Курица Грибы", "Пирог Фарш Тыква", "Пирог Фарш Картофель", "Пирог Семга Рис", 
  "Пирог Брынза Шпинат", "Пирог Мясо Картофель", "Пирог Курица Брынза Шпинат", "Пирог Капуста Яйцо", 
  "Пирог Утка Картофель", "Пирог Картофель Грибы", "Пирог Губадия", "Пирог Рудольф",
  "Пирог Трехслойный", "Пирог Сметанник с персиками", "Пирог Сметанник с вишней", "Пирог Сметанник с малиной", 
  "Пирог Лимонник", "Пирог Смородиновый", "Пирог Ассорти (смородина лимон)", "Пирог Курага", "Пирог Курага Орех", 
  "Пирог Творог Яблоко", "Пирог Творожно Маковый", "Пирог Тропический", "Пирог Клубничный",
  "Вупи Пай", "Десерт в стаканчике Красный бархат", "Десерт в стаканчике Шоколадный", "Кольцо заварное", 
  "Муравейник", "Муссовый Котик", "Маффин ванильный", "Леденец на палочке", "Рулет Меренга (целый)", "Рулет Меренга (половина)", 
  "Чизкейк в имбирном печенье", "Чизкейк в шоколадном печенье", "Эклер с заварным кремом 100г", "Шу 60г", 
  "Пломбир на палочке", "Рулет с шоколадом", "Рулет с орехом", "Рулет с малиной",
  "Торт Брауни весовой", "Торт Медовик весовой", "Торт Молочная девочка", "Торт Морковный", "Торт Наполеон весовой", 
  "Торт Сметанник с черносливом", "Торт Красный бархат", "Торт Шоколадный с черносливом", "Торт Шоколадный крем чиз",
  "Хлеб Бородинский", "Гриссини упк", "Хлеб домашний", "Сухари упк", "Кефирный хлеб", "Хлеб белый", "Хлеб День и Ночь", "Шелпеки",
  "Борек с Курицей", "Борек с Брынзой", "Борек с Семгой",
  "Блины творог", "Блины фарш", "Блины кг",
  "Чак-чак 60г", "Чак-чак 230г", "Чак-чак 350г", "Чак-чак 400г", "Чак-чак 500г", "Чак-чак 750г", "Чак-чак 1кг", "Чак-чак классический кг", 
  "Чак-чак колобки 50г", "Чак-чак с курагой кг", "Чак-чак с изюмом (кг)", "Чак-чак с изюмом (0.5кг)", "Чак-чак ханский с орехами кг", 
  "Чак-чак Саукеле", "Чак-чак Юрта на заказ", "Чак-чак колобки 16шт",
  "Булочка с творогом", "Булочка с курагой", "Булочка с маком", "Булочка с повидлом", "Булочка со сгущенкой", 
  "Булочка Синнабон", "Слойка с яблоком", "Вафельная трубочка",
  "Запеканка творожная (целая)", "Запеканка творожная (четверть)", "Сочник с творогом 100г", "Сырники 2шт",
  "Бадри курага", "Бадри чернослив",
  "Сэт Уютный вечер", "Сэт Семейный ужин", "Сэт Встреча друзей", "Сэт Популярный", "Сэт Семейный сладкий", "Сэт Встречаем гостей сладкий",
  "Пирожки с картошкой 6шт (заморозка)", "Пирожки лук яйцо 6шт (заморозка)", "Пирожки с брынзой и шпинатом 6шт (заморозка)", 
  "Пирожки с картошкой и грибами 6шт (заморозка)", "Самса 6шт (заморозка)", "Учпучмаки 6шт (заморозка)", "Сырники 12шт (заморозка)"
];

const UNITS = ["шт.", "кг", "г", "л", "мл", "упк", "порц"];

export default function ProductionPage() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState<number | "">(0);
  const [editUnit, setEditUnit] = useState("шт.");

  // Ручной ввод
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualQty, setManualQty] = useState<number | "">("");
  const [manualUnit, setManualUnit] = useState("шт.");
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const saveHistoryToCache = (data: any[]) => {
    try {
      localStorage.setItem("app_prod_history", JSON.stringify(data));
    } catch (_) {}
  };

  const loadHistory = async () => {
    const res = await getTodayProductionLogs();
    if (res.success && Array.isArray(res.data)) {
      setHistory(prev => {
        const newMap = new Map();
        res.data.forEach(item => newMap.set(item.id, item));
        prev.forEach(item => {
          if (item.id.startsWith("temp-") && !res.data.some(s => s.product_name === item.product_name && s.quantity === item.quantity)) {
            newMap.set(item.id, item);
          }
        });
        const merged = Array.from(newMap.values());
        saveHistoryToCache(merged);
        return merged;
      });
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("app_prod_history");
      if (cached) {
        setHistory(JSON.parse(cached));
      }
    } catch (_) {}
    loadHistory();
  }, []);

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageProcess = async (file: File) => {
    setLoading(true);
    setLoadingStep("Сжатие фотографии...");
    setError("");
    setSuccess(false);
    setResult([]);

    try {
      const img = new globalThis.Image();
      img.onload = async () => {
        setLoadingStep("Подготовка изображения...");
        const canvas = document.createElement("canvas");
        const MAX_DIMENSION = 800;
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
        if (!ctx) { 
          setError("Ошибка сжатия изображения"); 
          setLoading(false); 
          return; 
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

        try {
          setLoadingStep("Распознавание ИИ...");
          const res = await uploadProductionLog(compressedBase64);
          if (res.success) {
            setSuccess(true);
            setResult(res.data || []);
            if (Array.isArray(res.data) && res.data.length > 0) {
              const resData = res.data;
              setHistory(prev => {
                const existingIds = new Set(prev.map(i => i.id));
                const toAdd = resData.filter((i: any) => i.id && !existingIds.has(i.id));
                const updated = [...toAdd, ...prev];
                saveHistoryToCache(updated);
                return updated;
              });
            }
            loadHistory();
          } else {
            setError(res.error || "Ошибка распознавания");
          }
        } catch (serverErr: any) {
          setError(serverErr.message || "Ошибка соединения с сервером");
        }
        setLoading(false);
      };

      img.onerror = () => { 
        setError("Ошибка загрузки изображения"); 
        setLoading(false); 
      };

      const reader = new FileReader();
      reader.onload = (e) => { 
        img.src = e.target?.result as string; 
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Неизвестная ошибка");
      setLoading(false);
    }
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageProcess(file);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.product_name);
    setEditQty(item.quantity);
    setEditUnit(item.unit || "шт.");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const previousHistory = [...history];
    const numQty = Number(editQty);

    const updatedHistory = history.map(item => 
      item.id === editingId 
        ? { ...item, product_name: editName, quantity: numQty, unit: editUnit } 
        : item
    );
    setHistory(updatedHistory);
    saveHistoryToCache(updatedHistory);
    setEditingId(null);

    const res = await updateProductionLog(editingId, editName, numQty, editUnit);
    if (!res.success) {
      setError(res.error || "Ошибка обновления");
      setHistory(previousHistory);
      saveHistoryToCache(previousHistory);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;
    const previousHistory = [...history];

    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    saveHistoryToCache(updatedHistory);

    const res = await deleteProductionLog(id);
    if (!res.success) {
      setError(res.error || "Ошибка удаления");
      setHistory(previousHistory);
      saveHistoryToCache(previousHistory);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(manualQty);
    if (!manualSearch.trim() || isNaN(quantity) || quantity <= 0) {
      setError("Пожалуйста, выберите товар и введите количество больше 0");
      return;
    }

    const productName = manualSearch.trim();
    const tempId = `temp-${Date.now()}`;
    const previousHistory = [...history];

    const optimisticRecord = {
      id: tempId,
      product_name: productName,
      quantity: quantity,
      unit: manualUnit,
      created_at: new Date().toISOString()
    };

    const newHistory = [optimisticRecord, ...history];
    setHistory(newHistory);
    saveHistoryToCache(newHistory);

    setManualSearch("");
    setManualQty("");
    setShowManualForm(false);

    const res = await addManualProductionLog(productName, quantity, manualUnit);
    if (res.success) {
      if (res.data && res.data.id) {
        setHistory(prev => {
          const replaced = prev.map(item => item.id === tempId ? res.data : item);
          saveHistoryToCache(replaced);
          return replaced;
        });
      }
      loadHistory();
    } else {
      setError(res.error || "Ошибка сохранения");
      setHistory(previousHistory);
      saveHistoryToCache(previousHistory);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!manualSearch.trim()) return [];
    const searchLower = manualSearch.toLowerCase();
    return ALL_PRODUCTS.filter(p => 
      p.toLowerCase().includes(searchLower)
    ).slice(0, 8);
  }, [manualSearch]);

  return (
    <div className="p-4 pt-6 max-w-md mx-auto pb-28">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Выработка продукции</h1>
          <p className="text-slate-500 text-xs mt-0.5">Фиксация выработанной выпечки за смену</p>
        </div>
        <button
          onClick={loadHistory}
          className="p-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-2xl shadow-sm active:scale-95 transition-all"
          title="Обновить список"
        >
          <RefreshCw className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Главная карточка сводки выработки */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-primary/80 text-white rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            Выработка за сегодня
          </span>
          <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {history.length} позиций
          </span>
        </div>

        <div className="text-3xl font-black mb-5 tracking-tight">
          {history.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0).toFixed(1).replace(/\.0$/, '')} <span className="text-lg font-bold text-slate-400">ед.</span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
          <div>
            <p className="text-[10px] text-slate-300 font-semibold mb-0.5">НАИМЕНОВАНИЙ</p>
            <p className="text-base font-black text-white">{history.length} поз.</p>
          </div>
          <div className="border-l border-white/10 pl-2">
            <p className="text-[10px] text-slate-300 font-semibold mb-0.5">СТАТУС СМЕНЫ</p>
            <p className="text-base font-black text-emerald-400">Активна</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 flex items-start border border-red-100 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-2xl mb-6 border border-green-100 shadow-sm animate-in fade-in">
          <div className="flex items-center mb-3">
            <CheckCircle2 className="w-6 h-6 mr-2 text-green-500" />
            <span className="font-bold">Успешно распознано!</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-green-100">
            <ul className="space-y-2 text-sm">
              {result.map((item, idx) => (
                <li key={idx} className="flex justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <span className="text-gray-700 font-medium">{item.product_name}</span>
                  <span className="font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">{item.quantity} {item.unit || "шт."}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-green-600 mt-2.5 text-center font-medium">Данные упешно сохранены</p>
        </div>
      )}

      {!loading ? (
        <div className="space-y-3 mb-6">
          {/* Главная кнопка - Камера */}
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-primary hover:bg-primary/95 text-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              <div className="bg-white/20 p-3.5 rounded-2xl mb-3">
                <Camera className="w-8 h-8" />
              </div>
              <span className="font-black text-lg">Сделать фото отчета</span>
              <span className="text-white/80 text-xs mt-1">Распознавание рукописного текста ИИ</span>
            </div>
          </div>

          {/* Галерея и Ручной ввод */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleCapture}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all text-center">
                <ImageIcon className="w-6 h-6 text-gray-500 mb-1.5" />
                <span className="font-bold text-xs">Загрузить фото</span>
              </div>
            </div>

            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className={`border rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all text-center ${
                showManualForm 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
              }`}
            >
              <PlusCircle className={`w-6 h-6 mb-1.5 ${showManualForm ? "text-primary" : "text-gray-500"}`} />
              <span className="font-bold text-xs">Внести вручную</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm mb-6">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
          <span className="font-bold text-gray-900">{loadingStep || "Анализ изображения..."}</span>
          <span className="text-gray-400 text-xs mt-1">ИИ распознает позиции с вашего фото</span>
        </div>
      )}

      {/* Форма ручного ввода */}
      {showManualForm && !loading && (
        <form onSubmit={handleManualAdd} className="bg-white border border-gray-100 rounded-3xl p-5 mb-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="font-bold text-gray-900 text-sm">Ручной ввод выработки</h3>
            <button type="button" onClick={() => setShowManualForm(false)} className="text-gray-400 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">НАЗВАНИЕ ПРОДУКЦИИ</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по справочнику..."
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-gray-50/50"
              />
            </div>

            {showDropdown && manualSearch && (
              <div className="absolute w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product}
                      type="button"
                      onClick={() => {
                        setManualSearch(product);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 text-gray-700 font-medium active:bg-gray-100 transition-colors"
                    >
                      {product}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-400 italic">
                    Совпадений не найдено, будет добавлено указанное имя
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">КОЛИЧЕСТВО</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1.5"
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none font-bold bg-gray-50/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">ЕД. ИЗМЕРЕНИЯ</label>
              <select
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:ring-2 focus:ring-primary focus:outline-none font-bold text-gray-700"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setManualUnit(u)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  manualUnit === u 
                    ? "bg-primary text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualForm(false);
                setManualSearch("");
                setManualQty("");
              }}
              className="px-4 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* История выработки */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-900 text-sm">Выработка за сегодня</h2>
          </div>
          {history.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
              {history.length}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            Записей выработки пока нет
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => {
              const time = item.created_at ? new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : "Сейчас";
              const isEditing = editingId === item.id;

              return (
                <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors">
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
                          step="0.01"
                          min="0.01"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-24 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none font-bold"
                          placeholder="Кол-во"
                        />
                        <select
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="p-2.5 border border-gray-200 rounded-xl text-sm bg-white font-bold text-gray-700 focus:outline-none"
                        >
                          {UNITS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <div className="ml-auto flex gap-1.5">
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 bg-green-500 text-white rounded-lg active:scale-95 transition-transform"
                            title="Сохранить"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 bg-gray-100 text-gray-500 rounded-lg active:scale-95 transition-transform"
                            title="Отмена"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{item.product_name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{time}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-primary/10 text-primary font-black px-3 py-1.5 rounded-xl text-xs whitespace-nowrap">
                          {item.quantity} {item.unit || "шт."}
                        </span>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-400 hover:text-primary active:scale-95 transition-all"
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all"
                          title="Удалить"
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
