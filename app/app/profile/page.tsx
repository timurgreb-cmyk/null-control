"use client";

import { useEffect, useState } from "react";
import { logout, getCurrentProfile } from "@/app/actions/auth";
import { LogOut, UserCircle, Briefcase, Phone, Clock, Fingerprint } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [biometricsStatus, setBiometricsStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCurrentProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();

    if (typeof window !== "undefined" && localStorage.getItem("biometric_cred_id")) {
      setBiometricsStatus("Подключено");
    }
  }, []);

  const handleRegisterBiometrics = async () => {
    try {
      if (!window.PublicKeyCredential) {
        alert("Ваше устройство не поддерживает WebAuthn (биометрию).");
        return;
      }

      setBiometricsStatus("Настройка...");

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Null Control", id: window.location.hostname },
          user: {
            id: userId,
            name: profile?.full_name || "Employee",
            displayName: profile?.full_name || "Employee"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
          authenticatorSelection: { 
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      }) as PublicKeyCredential;

      if (credential) {
        const rawId = new Uint8Array(credential.rawId);
        const base64Id = btoa(Array.from(rawId).map(val => String.fromCharCode(val)).join(''));
        
        localStorage.setItem("biometric_cred_id", base64Id);
        localStorage.setItem("biometric_pin", profile?.pin_code);
        
        setBiometricsStatus("Подключено");
        alert("Вход по Face ID / отпечатку пальца успешно настроен для этого устройства!");
      } else {
        setBiometricsStatus(localStorage.getItem("biometric_cred_id") ? "Подключено" : "Настроить");
      }
    } catch (err: any) {
      console.error(err);
      setBiometricsStatus(localStorage.getItem("biometric_cred_id") ? "Подключено" : "Ошибка настройки");
      alert("Не удалось настроить биометрию: " + (err.message || err));
    }
  };

  return (
    <div className="p-4 pt-8">
      {loading ? (
        // Красивый скелетон-лоадер премиум-качества
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center animate-pulse">
            <div className="w-24 h-24 bg-gray-200 rounded-full mb-4" />
            <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
            <div className="w-full space-y-4">
              <div className="h-16 bg-gray-100 rounded-2xl w-full" />
              <div className="h-16 bg-gray-100 rounded-2xl w-full" />
            </div>
          </div>
          <div className="h-14 bg-gray-100 rounded-2xl w-full animate-pulse" />
          <div className="h-14 bg-gray-100 rounded-2xl w-full animate-pulse" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center mb-6 transition-all duration-300 ease-in-out">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UserCircle className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
              {profile?.full_name || "Сотрудник"}
            </h1>
            <div className="flex items-center text-gray-500 mb-6">
              <Briefcase className="w-4 h-4 mr-1.5" />
              <span className="text-sm">{profile?.position || "Должность не указана"}</span>
            </div>

            <div className="w-full space-y-4">
              <div className="flex items-center p-4 bg-[#F9FAFB] rounded-2xl border border-gray-100">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Телефон</p>
                  <p className="text-sm font-bold text-gray-900">{profile?.phone || "Не указан"}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-[#F9FAFB] rounded-2xl border border-gray-100">
                <UserCircle className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">PIN-код (Логин)</p>
                  <p className="text-sm font-bold text-gray-900 tracking-wider font-mono">{profile?.pin_code || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {profile?.full_name?.toLowerCase().includes("тимур") && (
            <button 
              onClick={handleRegisterBiometrics}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-bold shadow-sm active:scale-95 transition-all mb-4"
            >
              <div className="flex items-center">
                <Fingerprint className="w-5 h-5 mr-3 text-primary" />
                Вход по Face ID / отпечатку
              </div>
              <span className="text-xs font-normal text-gray-400">
                {biometricsStatus || "Настроить"}
              </span>
            </button>
          )}

          <Link 
            href="/app/history"
            className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-bold shadow-sm active:scale-95 transition-all mb-4"
          >
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-3 text-primary" />
              История отметок
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-center p-4 bg-white border border-red-100 text-red-500 rounded-2xl font-bold shadow-sm active:scale-95 transition-all"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Выйти из аккаунта
            </button>
          </form>
        </>
      )}
    </div>
  );
}
