"use client";

import { useEffect, useState } from "react";
import { logout, getCurrentProfile } from "@/app/actions/auth";
import { LogOut, UserCircle, Briefcase, Phone, Clock } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
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
  }, []);

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
