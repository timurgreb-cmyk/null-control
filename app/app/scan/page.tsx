"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { processQRScan } from "@/app/actions/time-records";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Camera, FlipHorizontal, MapPin, Zap } from "lucide-react";

// @ts-ignore
const QrReader = dynamic(() => import("react-qr-scanner"), { ssr: false });

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "error";

export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [message, setMessage] = useState<string>("");
  const [resultData, setResultData] = useState<{type: string, location: string} | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);

  const requestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
    );
  };

  const getCoordinates = (): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (userCoords) {
        resolve(userCoords);
        return;
      }
      if (typeof window === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setUserCoords(coords);
          resolve(coords);
        },
        (err) => {
          console.warn("Geolocation Error:", err.message);
          resolve(null);
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
      );
    });
  };

  const toggleTorch = async () => {
    try {
      const videoEl = document.querySelector('video') as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) {
          const nextTorch = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextTorch } as any]
          });
          setTorchOn(nextTorch);
          return;
        }
      }
    } catch (e) {
      console.warn("Torch error:", e);
    }
    setTorchOn(prev => !prev);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    setTorchOn(false);
    setCameraKey(prev => prev + 1);
  };

  const restartCamera = () => {
    setCameraActive(false);
    setStatus("scanning");
    setMessage("");
    setResultData(null);
    setCameraKey(prev => prev + 1);
    setTimeout(() => setCameraActive(true), 200);
  };

  const handleScan = async (data: any) => {
    if (data && data.text && status === "scanning") {
      if (typeof window !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate([60, 40, 60]); } catch (_) {}
      }

      setStatus("processing");
      
      const clientTime = new Date().toISOString();
      const coords = await getCoordinates();
      const result = await processQRScan(data.text, clientTime, coords);
      
      if (result.success && result.data) {
        setStatus("success");
        setResultData({
          type: result.data.type,
          location: result.data.locationName
        });
        setMessage(result.data.message || (result.data.type === "check_in" ? "Приход успешно отмечен!" : "Уход успешно отмечен!"));
      } else {
        setStatus("error");
        setMessage(result.error || "Ошибка сканирования");
      }

      setTimeout(() => {
        setStatus("scanning");
        setMessage("");
        setResultData(null);
      }, 5000);
    }
  };

  const handleError = (err: any) => {
    console.error("Camera Error:", err);
    setCameraActive(false);
    const errorMessage = err?.message || JSON.stringify(err);
    setStatus("error");
    if (errorMessage.includes("Permission") || errorMessage.includes("NotAllowedError")) {
      setMessage("Доступ к камере запрещен. Разрешите использование камеры в настройках браузера.");
    } else {
      setMessage(`Ошибка камеры: ${errorMessage}. Нажмите кнопку ниже для повторной попытки.`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] relative bg-black overflow-hidden select-none">
      {/* Видоискатель камеры */}
      <div className="flex-1 w-full relative bg-gray-950 flex items-center justify-center">
        {cameraActive && status === "scanning" && (() => {
          const Scanner = QrReader as any;
          return (
            <Scanner
              key={cameraKey}
              delay={150}
              style={{ height: "100%", width: "100%", objectFit: "cover" }}
              onError={handleError}
              onScan={handleScan}
              constraints={{
                video: { 
                  facingMode: { ideal: facingMode },
                  width: { min: 640, ideal: 1280 },
                  height: { min: 480, ideal: 720 },
                  advanced: [{ focusMode: "continuous" }] as any
                }
              }}
            />
          );
        })()}

        {/* Экран до запуска сканера */}
        {!cameraActive && status === "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-gray-950">
            <div className="w-24 h-24 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
              <Camera className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-white text-2xl font-black mb-2">Сканер QR-кода</h3>
            <p className="text-gray-400 text-sm mb-10 max-w-[280px]">Нажмите кнопку ниже, чтобы включить камеру и отметиться на смене</p>
            <button 
              onClick={() => {
                requestLocation();
                setCameraActive(true);
              }}
              className="bg-primary hover:bg-primary/95 text-white w-full max-w-[280px] py-4 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Включить сканер
            </button>
          </div>
        )}
        
        {/* Рамка и ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ УПРАВЛЕНИЯ */}
        {status === "scanning" && cameraActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between py-6 px-4 pointer-events-none">
            
            {/* ИНТЕРАКТИВНАЯ ПАНЕЛЬ НАД КВАДРАТИКОМ СКАНЕРА */}
            <div className="pointer-events-auto flex items-center gap-2 bg-gray-900/90 border border-white/20 p-1.5 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top duration-300">
              {/* Кнопка вспышки/фонарика */}
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-90 ${
                  torchOn ? "bg-amber-400 text-gray-950 shadow-[0_0_15px_rgba(251,191,36,0.6)]" : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Вспышка / Фонарик"
              >
                <Zap className={`w-3.5 h-3.5 ${torchOn ? "fill-gray-950" : ""}`} />
                <span>{torchOn ? "Вспышка ВКЛ" : "Вспышка"}</span>
              </button>

              {/* Переключение камеры */}
              <button
                onClick={toggleCameraFacing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                title="Сменить камеру"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{facingMode === "environment" ? "Основная" : "Селфи"}</span>
              </button>

              {/* Статус GPS */}
              <button
                onClick={requestLocation}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                title="Обновить GPS"
              >
                <MapPin className={`w-3.5 h-3.5 ${userCoords ? "text-green-400" : "text-amber-400 animate-pulse"}`} />
                <span>{userCoords ? "GPS" : "Поиск GPS"}</span>
              </button>
            </div>

            {/* КВАДРАТИК СКАНЕРА */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 aspect-square relative flex-shrink-0 my-auto">
              {/* Подложка */}
              <div className="absolute inset-0 border border-white/10 rounded-3xl" />
              {/* Уголки */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-3xl shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-3xl shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-3xl shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-3xl shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
              {/* Лазерный луч */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(37,99,235,1)] animate-[scan_1.8s_ease-in-out_infinite]" />
            </div>

            {/* ИНТЕРАКТИВНАЯ ПАНЕЛЬ ПОД КВАДРАТИКОМ */}
            <div className="pointer-events-auto flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="bg-gray-900/90 border border-white/10 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Наведите камеру на QR-код
              </div>

              {/* Кнопка перезапуска */}
              <button
                onClick={restartCamera}
                className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 backdrop-blur-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Перезапустить видоискатель
              </button>
            </div>

          </div>
        )}

        {/* Оверлей загрузки */}
        {status === "processing" && (
          <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white font-bold text-lg">Обработка...</p>
              <p className="text-gray-400 text-xs mt-1">Проверяем координаты и время</p>
            </div>
          </div>
        )}

        {/* Оверлей Успеха */}
        {status === "success" && (
          <div className="absolute inset-0 bg-black/85 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{message}</h2>
              {resultData && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 w-full mb-6">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Локация</p>
                  <p className="text-gray-900 font-bold">{resultData.location}</p>
                </div>
              )}
              <button 
                onClick={() => setStatus("scanning")}
                className="w-full bg-green-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
              >
                Отлично
              </button>
            </div>
          </div>
        )}

        {/* Оверлей Ошибки */}
        {status === "error" && (
          <div className="absolute inset-0 bg-black/85 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-500/30">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка сканирования</h2>
              <p className="text-gray-500 text-sm font-medium mb-6 leading-relaxed">{message}</p>
              <button 
                onClick={() => {
                  setStatus("scanning");
                  setCameraActive(true);
                }}
                className="w-full bg-red-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
