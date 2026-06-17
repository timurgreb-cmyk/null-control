"use client";

import { ScanLine, UserCircle, Briefcase, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/app/actions/auth";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getCurrentProfile();
      setProfile(data);
    };
    fetchProfile();
  }, []);

  const nameLower = profile?.full_name?.toLowerCase() || "";
  const isFinanceUser = nameLower.includes("альфия") || nameLower.includes("эльмира") || nameLower.includes("тимур");
  const isAgata = nameLower.includes("агата");

  // Redirect logic to prevent finance users from accessing scanner/production
  // and normal users from accessing finance tab
  useEffect(() => {
    if (!profile) return;

    if (isFinanceUser) {
      if (pathname === "/app/scan" || pathname === "/app/production") {
        router.replace("/app/finance");
      }
    } else {
      if (pathname === "/app/finance") {
        router.replace("/app/scan");
      }
    }
  }, [profile, pathname, isFinanceUser, router]);

  const isWrongPage = (isFinanceUser && (pathname === "/app/scan" || pathname === "/app/production")) ||
                      (!isFinanceUser && pathname === "/app/finance");

  // While profile is loading or when redirecting, show a full-screen loading screen
  if (!profile || isWrongPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <span className="text-sm text-gray-500 font-medium">Загрузка...</span>
      </div>
    );
  }

  const tabs = [];

  if (isFinanceUser) {
    tabs.push({ name: "Финансы", href: "/app/finance", icon: Wallet });
  } else {
    tabs.push({ name: "Сканер", href: "/app/scan", icon: ScanLine });
    if (!isAgata) {
      tabs.push({ name: "Выработка", href: "/app/production", icon: Briefcase });
    }
  }

  tabs.push({ name: "Профиль", href: "/app/profile", icon: UserCircle });

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
