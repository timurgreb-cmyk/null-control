"use client";

import { useState, useEffect } from "react";

// @ts-ignore
import { QRCodeSVG } from "qrcode.react";

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBaseHours, setNewBaseHours] = useState(8);
  const [loading, setLoading] = useState(false);
  const [newLat, setNewLat] = useState<string>("");
  const [newLng, setNewLng] = useState<string>("");
  const [newRadius, setNewRadius] = useState<number>(200);
  const [isGeoDetecting, setIsGeoDetecting] = useState(false);

  const fetchLocations = async () => {
    const res = await fetch("/api/locations", { cache: "no-store" });
    const data = await res.json();
    setLocations(data.locations || []);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером");
      return;
    }
    setIsGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(pos.coords.latitude.toFixed(6));
        setNewLng(pos.coords.longitude.toFixed(6));
        setIsGeoDetecting(false);
      },
      (err) => {
        alert("Не удалось определить координаты: " + err.message);
        setIsGeoDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: newName.trim(), 
        base_hours: newBaseHours,
        latitude: newLat ? parseFloat(newLat) : null,
        longitude: newLng ? parseFloat(newLng) : null,
        radius_meters: newRadius || 200
      })
    });
    setNewName("");
    setNewBaseHours(8);
    setNewLat("");
    setNewLng("");
    setNewRadius(200);
    setShowAdd(false);
    setLoading(false);
    fetchLocations();
  };

  const [activeTab, setActiveTab] = useState<'both' | 'check_in' | 'check_out'>('both');

  const handlePrint = (mode: 'both' | 'check_in' | 'check_out') => {
    setActiveTab(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Локации и QR-коды</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`${showAdd ? "bg-gray-200 text-gray-800" : "bg-primary text-white hover:bg-primary/90"} px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm`}
        >
          {showAdd ? "Отмена" : "+ Добавить локацию"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 print:hidden">
          <h2 className="text-lg font-bold mb-3">Новая локация</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название (например: Главный цех)"
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <input
                type="number"
                value={newBaseHours}
                onChange={(e) => setNewBaseHours(parseFloat(e.target.value))}
                placeholder="Часов в смене"
                step="0.5"
                min="1"
                max="24"
                className="w-full sm:w-36 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Блок настройки GPS защиты */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">📍 Настройка GPS защиты (Геозона)</span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isGeoDetecting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isGeoDetecting ? "Определяем..." : "🎯 Вставить мою геопозицию"}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Широта (Latitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="43.238942"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Долгота (Longitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="76.889709"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Радиус зоны (метры)</label>
                  <input
                    type="number"
                    value={newRadius}
                    onChange={(e) => setNewRadius(parseInt(e.target.value))}
                    placeholder="200"
                    min="10"
                    max="5000"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleAdd}
                disabled={loading || !newName.trim()}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? "Создание..." : "Сохранить локацию"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto print:hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Часы смены</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLocation(loc.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {loc.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {loc.base_hours || 8} ч.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      loc.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {loc.is_active ? "Активна" : "Отключена"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-primary hover:text-primary/80"
                      onClick={(e) => { e.stopPropagation(); setSelectedLocation(loc.id); }}
                    >
                      Показать QR
                    </button>
                  </td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Локаций пока нет. Создайте первую!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          {selectedLocation ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center print:border-none print:p-0">
              
              {/* Вкладки переключения на экране */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6 print:hidden w-full max-w-md">
                <button
                  onClick={() => setActiveTab('both')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'both' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Показать оба
                </button>
                <button
                  onClick={() => setActiveTab('check_in')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'check_in' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🟢 Только Приход
                </button>
                <button
                  onClick={() => setActiveTab('check_out')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'check_out' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🔴 Только Уход
                </button>
              </div>

              {/* Заголовок организации на экране и печать */}
              <div className="text-center mb-6 print:mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  NULL.Control
                </h2>
                <p className="text-2xl font-bold text-primary">
                  {locations.find(l => l.id === selectedLocation)?.name}
                </p>
              </div>

              {/* Карточки QR-кодов */}
              <div className="w-full flex flex-col gap-8">
                
                {/* Карточка 1: ПРИХОД */}
                {(activeTab === 'both' || activeTab === 'check_in') && (
                  <div className={`border-4 border-green-500 rounded-3xl p-8 flex flex-col items-center bg-green-50/10 shadow-sm print:shadow-none print:border-8 print:p-10 ${
                    activeTab === 'both' ? 'print:break-after-page' : ''
                  }`}>
                    {/* КРУПНЫЙ ЗАГОЛОВОК БОЛЬШИМИ БУКВАМИ */}
                    <h1 className="text-5xl font-black text-green-600 uppercase tracking-widest mb-2 print:text-7xl print:mb-4">
                      ПРИХОД
                    </h1>
                    <div className="bg-green-500 text-white font-black px-8 py-2.5 rounded-full text-lg uppercase tracking-wider mb-6 shadow-md print:text-2xl print:px-10 print:py-3">
                      🟢 ВХОД НА СМЕНУ
                    </div>
                    <p className="text-sm text-gray-600 mb-6 font-semibold print:text-xl">Отсканируйте QR-код при ВХОДЕ на смену</p>
                    <div className="p-4 bg-white border-4 border-green-200 rounded-3xl shadow-sm print:border-8">
                      <QRCodeSVG 
                        value={`${selectedLocation}:check_in`} 
                        size={activeTab === 'check_in' ? 300 : 220} 
                        level="H" 
                        includeMargin={true}
                        className="print:w-[380px] print:h-[380px]"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-6 font-medium print:text-base">Начало смены • NULL.Control</p>
                  </div>
                )}

                {/* Карточка 2: УХОД */}
                {(activeTab === 'both' || activeTab === 'check_out') && (
                  <div className="border-4 border-red-500 rounded-3xl p-8 flex flex-col items-center bg-red-50/10 shadow-sm print:shadow-none print:border-8 print:p-10">
                    {/* КРУПНЫЙ ЗАГОЛОВОК БОЛЬШИМИ БУКВАМИ */}
                    <h1 className="text-5xl font-black text-red-600 uppercase tracking-widest mb-2 print:text-7xl print:mb-4">
                      УХОД
                    </h1>
                    <div className="bg-red-500 text-white font-black px-8 py-2.5 rounded-full text-lg uppercase tracking-wider mb-6 shadow-md print:text-2xl print:px-10 print:py-3">
                      🔴 ВЫХОД СО СМЕНЫ
                    </div>
                    <p className="text-sm text-gray-600 mb-6 font-semibold print:text-xl">Отсканируйте QR-код при ВЫХОДЕ со смены</p>
                    <div className="p-4 bg-white border-4 border-red-200 rounded-3xl shadow-sm print:border-8">
                      <QRCodeSVG 
                        value={`${selectedLocation}:check_out`} 
                        size={activeTab === 'check_out' ? 300 : 220} 
                        level="H" 
                        includeMargin={true}
                        className="print:w-[380px] print:h-[380px]"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-6 font-medium print:text-base">Завершение смены • NULL.Control</p>
                  </div>
                )}
              </div>
              
              {/* Кнопки управления печатью */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 print:hidden w-full max-w-md">
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                  onClick={() => handlePrint('check_in')}
                >
                  🖨️ Печать «ПРИХОД»
                </button>
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                  onClick={() => handlePrint('check_out')}
                >
                  🖨️ Печать «УХОД»
                </button>
              </div>

              <div className="flex gap-3 mt-3 print:hidden w-full max-w-md">
                <button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm"
                  onClick={() => handlePrint('both')}
                >
                  📄 Распечатать оба (на 2 листах)
                </button>
                <button 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                  onClick={() => setSelectedLocation(null)}
                >
                  Скрыть
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">Выберите локацию</h2>
              <p className="text-gray-500 max-w-xs">Нажмите на локацию в списке, чтобы сгенерировать и распечатать отдельные QR-коды для Прихода и Ухода</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
