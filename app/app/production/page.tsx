"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, PlusCircle, Loader2, CheckCircle2, AlertCircle, Clock, Pencil, Trash2, X, Check, Search } from "lucide-react";
import { uploadProductionLog, getTodayProductionLogs, updateProductionLog, deleteProductionLog, addManualProductionLog } from "@/app/actions/production";

const ALL_PRODUCTS = [
  "Самса", "Учпучмак", "Пирожок с картофелем", "Пирожок с капустой", "Пирожное Картошка", "Пирожок с брынзой и шпинатом", 
  "Пирожок с картошкой и грибами", "Пирожок с луком и яйцом", "Беляши", "Сосиска в тесте", "Баурсаки",
  "Мини семга/рис", "Мини курица брынза шпинат", "Мини фарш/тыква", "Мини пирог капуста-яйцо",
  "Пирог Курица Картофель", "Пирог Курица Грибы", "Пирог Фарш Тыква", "Пирог Фарш Картофель", "Пирог Семга Рис", 
  "Пирог Брынза Шпинат", "Пирог Мясо Картофель", "Пирог Курица Брынза Шпинат", "Пирог Капуста Яйцо", 
  "Пирог Утка Картофель", "Пирог Картофель Грибы", "Пирог Губадия",
  "Пирог Трехслойный", "Пирог Сметанник с персиками", "Пирог Сметанник с вишней", "Пирог Сметанник с малиной", 
  "Пирог Лимонник", "Пирог Смородиновый", "Пирог Ассорти (смородина лимон)", "Пирог Курага", "Пирог Курага Орех", 
  "Пирог Творог Яблоко", "Пирог Творожно Маковый", "Пирог Тропический", "Пирог Клубничный",
  "Вупи Пай", "Десерт в стаканчике Красный бархат", "Десерт в стаканчике Шоколадный", "Кольцо заварное", 
  "Муравейник", "Муссовый Котик", "Маффин ванильный", "Леденец на палочке", "Рулет Меренга (целый)", "Рулет Меренга (половина)", 
  "Чизкейк в имбирном печенье", "Чизкейк в шоколадном печенье", "Эклер с заварным кремом 100г", "Шу 60г", 
  "Пломбир на палочке", "Рулет с шоколадом", "Рулет с орехом", "Рулет с малиной",
  "Торт Брауни весовой", "Торт Медовик весовой", "Торт Молочная девочка", "Торт Морковный", "Торт Наполеон весовой", 
  "Торт Сметанник с черносливом", "Торт Красный бархат", "Торт Шоколадный с черносливом", "Торт Шоколадный крем чиз",
  "Хлеб Хлеб Бородинский", "Гриссини упк", "Хлеб домашний", "Сухари упк", "Кефирный хлеб", "Хлеб белый", "Хлеб День и Ночь", "Шелпеки",
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

export default function ProductionPage() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(0);

  // Ручной ввод
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualQty, setManualQty] = useState<number | "">("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    const res = await getTodayProductionLogs();
    if (res.success) {
      setHistory(res.data);
    }
  };

  useEffect(() => {
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
        const MAX_DIMENSION = 800; // Сжимаем до 800px для невероятной скорости передачи
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
        
        // Качество 0.6 обеспечивает превосходное сжатие без потери читаемости для ИИ
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

        try {
          setLoadingStep("Распознавание почерка ИИ...");
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
  };

  // Optimistic UI для обновления записи
  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    const previousHistory = [...history];
    
    // Мгновенное обновление на экране
    setHistory(prev => prev.map(item => 
      item.id === editingId 
        ? { ...item, product_name: editName, quantity: editQty } 
        : item
    ));
    setEditingId(null);

    const res = await updateProductionLog(editingId, editName, editQty);
    if (!res.success) {
      setError(res.error || "Ошибка обновления");
      setHistory(previousHistory); // Откат при ошибке
    }
  };

  // Optimistic UI для удаления записи
  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;
    
    const previousHistory = [...history];
    
    // Мгновенное удаление на экране
    setHistory(prev => prev.filter(item => item.id !== id));

    const res = await deleteProductionLog(id);
    if (!res.success) {
      setError(res.error || "Ошибка удаления");
      setHistory(previousHistory); // Откат при ошибке
    }
  };

  // Ручное добавление выработки
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearch.trim() || !manualQty || Number(manualQty) <= 0) {
      setError("Пожалуйста, выберите товар и введите количество больше 0");
      return;
    }

    const productName = manualSearch.trim();
    const quantity = Number(manualQty);
    
    const tempId = `temp-${Date.now()}`;
    const previousHistory = [...history];
    
    // Мгновенно добавляем в историю (Optimistic UI)
    const optimisticRecord = {
      id: tempId,
      product_name: productName,
      quantity: quantity,
      created_at: new Date().toISOString()
    };
    
    setHistory(prev => [optimisticRecord, ...prev]);
    
    // Сброс полей ввода
    setManualSearch("");
    setManualQty("");
    setShowManualForm(false);

    const res = await addManualProductionLog(productName, quantity);
    if (res.success) {
      loadHistory(); // Загружаем реальные данные с ID из базы
    } else {
      setError(res.error || "Ошибка сохранения");
      setHistory(previousHistory); // Откат при ошибке
    }
  };

  const filteredProducts = ALL_PRODUCTS.filter(p => 
    p.toLowerCase().includes(manualSearch.toLowerCase())
  ).slice(0, 8); // Показываем топ-8 совпадений

  return (
    <div className="p-4 pt-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Выработка продукции</h1>
      <p className="text-gray-500 mb-6 text-sm">Сфотографируйте отчет, загрузите его из галереи или впишите данные вручную.</p>

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

      {/* Панель управления и выбора методов ввода */}
      {!loading ? (
        <div className="space-y-4 mb-8">
          {/* 1. Главная кнопка - Сделать фото на камеру */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-primary hover:bg-primary/95 transition-colors text-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg shadow-primary/20 active:scale-98 transition-transform">
              <div className="bg-white/20 p-3 rounded-full mb-3">
                <Camera className="w-8 h-8" />
              </div>
              <span className="font-bold text-lg">Сделать фото камеры</span>
              <span className="text-primary-foreground/70 text-xs mt-1">Прямой запуск камеры телефона</span>
            </div>
          </div>

          {/* 2. Две кнопки в ряд - Галерея и Ручной ввод */}
          <div className="grid grid-cols-2 gap-3">
            {/* Кнопка галереи */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleCapture}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all text-center">
                <ImageIcon className="w-6 h-6 text-gray-500 mb-2" />
                <span className="font-bold text-sm">Из галереи</span>
              </div>
            </div>

            {/* Кнопка ручного ввода */}
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className={`border rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all text-center ${
                showManualForm 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <PlusCircle className={`w-6 h-6 mb-2 ${showManualForm ? "text-primary" : "text-gray-500"}`} />
              <span className="font-bold text-sm">Вписать вручную</span>
            </button>
          </div>
        </div>
      ) : (
        /* Лоадер с шагами */
        <div className="bg-white border border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm mb-8">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <span className="font-bold text-gray-900">{loadingStep}</span>
          <span className="text-gray-500 text-sm mt-2 text-center">Интеллектуальное распознавание рукописного текста</span>
        </div>
      )}

      {/* Форма ручного ввода с автокомплитом */}
      {showManualForm && !loading && (
        <form onSubmit={handleManualAdd} className="bg-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm space-y-4 transition-all duration-300">
          <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-2">Ручной ввод выработки</h3>
          
          {/* Поле поиска товара */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs text-gray-400 font-bold block mb-1">НАЗВАНИЕ ПРОДУКЦИИ</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Начните вводить (например: Самса)..."
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Выпадающий список совпадений */}
            {showDropdown && manualSearch && (
              <div className="absolute w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product}
                      type="button"
                      onClick={() => {
                        setManualSearch(product);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 active:bg-gray-100 transition-colors"
                    >
                      {product}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">
                    Нет совпадений в справочнике
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Количество */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">КОЛИЧЕСТВО (ШТ)</label>
            <input
              type="number"
              placeholder="Введите количество..."
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              min="1"
            />
          </div>

          {/* Кнопки управления формы */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 active:scale-95 transition-transform"
            >
              Добавить в систему
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualForm(false);
                setManualSearch("");
                setManualQty("");
              }}
              className="px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-transform"
            >
              Отмена
            </button>
          </div>
        </form>
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
