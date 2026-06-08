"use client";

import { ScanLine, UserCircle, Briefcase, Lock, Delete, Fingerprint, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/app/actions/auth";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    // 1. Проверяем, разблокировано ли приложение в текущей сессии
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("app_unlocked") === "true";
      if (unlocked) {
        setIsLocked(false);
      }
      
      const hasCred = !!localStorage.getItem("biometric_cred_id");
      const supportsWebAuthn = !!window.PublicKeyCredential;
      setBiometricsAvailable(hasCred && supportsWebAuthn);
    }

    const fetchProfile = async () => {
      try {
        const data = await getCurrentProfile();
        setProfile(data);
      } catch (e) {
        console.error("Error fetching profile in layout", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // Авто-вызов биометрии при запуске если она настроена и приложение заблокировано
  useEffect(() => {
    if (isLocked && biometricsAvailable && !loadingProfile && profile) {
      // Запускаем биометрию автоматически с небольшой задержкой для плавности
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocked, biometricsAvailable, loadingProfile, profile]);

  const handleNumberClick = (num: number) => {
    if (pin.length < 5) {
      const newPin = pin + num;
      setPin(newPin);
      setErrorMsg(null);

      if (newPin.length === 5) {
        // Проверяем PIN код
        if (profile && newPin === profile.pin_code) {
          sessionStorage.setItem("app_unlocked", "true");
          setIsLocked(false);
          setPin("");
        } else {
          setErrorMsg("Неверный PIN-код");
          setPin("");
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      const credIdStr = localStorage.getItem("biometric_cred_id");
      const savedPin = localStorage.getItem("biometric_pin");
      if (!credIdStr || !savedPin) return;

      setErrorMsg(null);

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credentialId = Uint8Array.from(atob(credIdStr), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: credentialId,
            type: "public-key"
          }],
          userVerification: "required",
          timeout: 60000
        }
      });

      if (assertion) {
        // Успешный вход по биометрии
        sessionStorage.setItem("app_unlocked", "true");
        setIsLocked(false);
        setErrorMsg(null);
      }
    } catch (err: any) {
      console.error("Biometric unlock error:", err);
      if (err.name !== "NotAllowedError") {
        setErrorMsg("Ошибка сканирования Face ID / отпечатка");
      }
    }
  };

  const tabs = [
    { name: "Сканер", href: "/app/scan", icon: ScanLine },
    { name: "Выработка", href: "/app/production", icon: Briefcase },
    { name: "Профиль", href: "/app/profile", icon: UserCircle },
  ];

  // Пока профиль грузится, показываем белый экран с лоадером
  if (loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Если приложение заблокировано - показываем экран блокировки
  if (isLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 select-none">
        <div className="w-full max-w-sm flex flex-col items-center">
          
          <div className="mb-8 flex flex-col items-center">
            <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">NULL.Control</h2>
            <p className="text-sm text-gray-500 mt-1">
              Для входа введите ваш PIN-код
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 w-full bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm text-center border border-red-100 animate-pulse">
              {errorMsg}
            </div>
          )}

          {/* PIN Indicators */}
          <div className="flex space-x-4 mb-12">
            {[0, 1, 2, 3, 4].map((index) => (
              <div 
                key={index} 
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  index < pin.length 
                    ? "bg-primary scale-110" 
                    : "bg-gray-300 scale-100"
                }`} 
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-6 w-full max-w-[280px] touch-manipulation">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className="w-full aspect-square flex items-center justify-center text-3xl font-medium text-gray-900 bg-white rounded-full shadow-sm active:bg-gray-200 active:scale-90 transition-all cursor-pointer border border-gray-100"
              >
                {num}
              </button>
            ))}
            
            {/* Левая нижняя кнопка - Биометрия */}
            {biometricsAvailable ? (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="w-full aspect-square flex items-center justify-center text-primary bg-primary/10 rounded-full shadow-sm hover:bg-primary/20 active:scale-90 transition-all cursor-pointer border border-primary/20"
              >
                <Fingerprint className="w-8 h-8" />
              </button>
            ) : (
              <div className="w-full aspect-square" />
            )}

            <button
              type="button"
              onClick={() => handleNumberClick(0)}
              className="w-full aspect-square flex items-center justify-center text-3xl font-medium text-gray-900 bg-white rounded-full shadow-sm active:bg-gray-200 active:scale-90 transition-all cursor-pointer border border-gray-100"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full aspect-square flex items-center justify-center text-gray-400 bg-transparent rounded-full active:bg-gray-100 transition-colors cursor-pointer"
            >
              <Delete className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] relative">
      <main className="flex-1 overflow-y-auto pb-24 relative z-0">{children}</main>

      <nav className="fixed bottom-0 w-full z-50 px-4 pb-6 pt-2">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 shadow-xl shadow-black/5 rounded-3xl overflow-hidden">
          <div className="flex justify-around items-center h-16 relative">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className="relative flex flex-col items-center justify-center w-full h-full"
                >
                  <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                    <Icon className={`w-6 h-6 mb-1 transition-colors duration-300 ${isActive ? "text-primary stroke-[2.5px]" : "text-gray-400"}`} />
                    <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-primary font-bold" : "text-gray-400"}`}>
                      {tab.name}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -bottom-1 w-12 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.5)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
