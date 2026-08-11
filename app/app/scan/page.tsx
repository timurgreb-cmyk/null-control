"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { processQRScan } from "@/app/actions/time-records";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Camera, MapPin, Zap } from "lucide-react";

// @ts-ignore
const QrReader = dynamic(() => import("react-qr-scanner"), { ssr: false });

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "error";

export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [message, setMessage] = useState<string>("");
  const [resultData, setResultData] = useState<{type: string, location: string} | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
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

  const restartCamera = () => {
    setCameraActive(false);
    setStatus("scanning");
    setMessage("");
    setResultData(null);
    setCameraKey(prev => prev + 1);
    setTimeout(() => setCameraActive(true), 150);
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
      }, 4000);
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
      setMessage(`Ошибка камеры. Нажмите кнопку ниже для повторной попытки.`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] relative bg-slate-950 overflow-hidden select-none">
      {/* Видоискатель камеры */}
      <div className="flex-1 w-full relative flex items-center justify-center">
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
                  facingMode: { ideal: "environment" },
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950">
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mb-5 shadow-xl">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-white text-2xl font-black mb-2">Сканер QR-кода</h3>
            <p className="text-slate-400 text-xs mb-8 max-w-[260px]">Нажмите кнопку ниже, чтобы включить камеру и отметиться на смене</p>
            <button 
              onClick={() => {
                requestLocation();
                setCameraActive(true);
              }}
              className="bg-primary hover:bg-primary/95 text-white w-full max-w-[260px] py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Включить сканер
            </button>
          </div>
        )}
        
        {/* Рамка сканера и управление */}
        {status === "scanning" && cameraActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between py-6 px-4 pointer-events-none">
            
            {/* ИНТЕРАКТИВНАЯ ПАНЕЛЬ НАД СКАНЕРОМ */}
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-white/15 p-1.5 rounded-full shadow-xl backdrop-blur-md">
              {/* Вспышка */}
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-90 ${
                  torchOn ? "bg-amber-400 text-slate-950 shadow-md" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${torchOn ? "fill-slate-950" : ""}`} />
                <span>{torchOn ? "Вспышка ВКЛ" : "Вспышка"}</span>
              </button>

              {/* Геолокация */}
              <button
                onClick={requestLocation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <MapPin className={`w-3.5 h-3.5 ${userCoords ? "text-emerald-400" : "text-amber-400 animate-pulse"}`} />
                <span>{userCoords ? "GPS активен" : "Обновить GPS"}</span>
              </button>
            </div>

            {/* СИНЯЯ ТОЛСТАЯ РАМКА СКАНЕРА */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 aspect-square relative flex-shrink-0 my-auto border-[5px] border-primary rounded-3xl shadow-[0_0_25px_rgba(37,99,235,0.5)]" />

            {/* ИНТЕРАКТИВНАЯ ПАНЕЛЬ ПОД СКАНЕРОМ */}
            <div className="pointer-events-auto flex flex-col items-center gap-2.5 w-full max-w-xs">
              <div className="bg-slate-900/90 border border-white/10 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Наведите камеру на QR-код
              </div>

              <button
                onClick={restartCamera}
                className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 backdrop-blur-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Перезапустить
              </button>
            </div>

          </div>
        )}

        {/* Оверлей загрузки */}
        {status === "processing" && (
          <div className="absolute inset-0 bg-slate-950/85 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-900 border border-slate-800 p-7 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-white font-bold text-base">Отметка смены...</p>
              <p className="text-slate-400 text-xs mt-1">Проверяем координаты</p>
            </div>
          </div>
        )}

        {/* Оверлей Успеха */}
        {status === "success" && (
          <div className="absolute inset-0 bg-slate-950/90 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white w-full max-w-sm rounded-3xl p-7 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">{message}</h2>
              {resultData && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-4 w-full mb-5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Локация</p>
                  <p className="text-slate-900 font-bold text-sm">{resultData.location}</p>
                </div>
              )}
              <button 
                onClick={() => setStatus("scanning")}
                className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold shadow-md active:scale-95 transition-all"
              >
                Отлично
              </button>
            </div>
          </div>
        )}

        {/* Оверлей Ошибки */}
        {status === "error" && (
          <div className="absolute inset-0 bg-slate-950/90 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white w-full max-w-sm rounded-3xl p-7 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-rose-500/30">
                <XCircle className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Ошибка сканирования</h2>
              <p className="text-slate-500 text-xs font-medium mb-5 leading-relaxed">{message}</p>
              <button 
                onClick={() => {
                  setStatus("scanning");
                  setCameraActive(true);
                }}
                className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-bold shadow-md active:scale-95 transition-all"
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
