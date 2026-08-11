"use client";

import { ScanLine, Briefcase, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: "Выработка", href: "/app/production", icon: Briefcase },
    { name: "Сканер", href: "/app/scan", icon: ScanLine },
    { name: "Табель", href: "/app/timesheet", icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] relative font-sans text-slate-900">
      <main className="flex-1 overflow-y-auto pb-28 relative z-0">{children}</main>

      {/* Оптимизированная нижная навигация без тяжелых GPU-фильтров */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2">
        <div className="max-w-md mx-auto bg-white border border-slate-200/90 shadow-lg shadow-slate-900/5 rounded-3xl px-3">
          <div className="flex justify-around items-center h-16 relative">
            
            {/* 1. Выработка */}
            {(() => {
              const tab = tabs[0];
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  prefetch={true}
                  className="flex flex-col items-center justify-center w-20 h-full active:scale-95 transition-transform"
                >
                  <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? "text-primary stroke-[2.5px]" : "text-slate-400"}`} />
                  <span className={`text-[10px] transition-colors ${isActive ? "text-primary font-bold" : "text-slate-400 font-medium"}`}>
                    {tab.name}
                  </span>
                </Link>
              );
            })()}

            {/* 2. ВЫДЕЛЕННАЯ КНОПКА - СКАНЕР (ОПУЩЕНА НИЖЕ) */}
            {(() => {
              const tab = tabs[1];
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  prefetch={true}
                  className="relative flex flex-col items-center justify-center -top-2 active:scale-95 transition-transform"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isActive 
                      ? "bg-primary text-white ring-4 ring-white" 
                      : "bg-primary text-white ring-4 ring-white"
                  }`}>
                    <Icon className="w-7 h-7 stroke-[2.5px]" />
                  </div>
                  <span className={`text-[10px] font-black mt-1 ${isActive ? "text-primary" : "text-slate-700"}`}>
                    {tab.name}
                  </span>
                </Link>
              );
            })()}

            {/* 3. Табель */}
            {(() => {
              const tab = tabs[2];
              const Icon = tab.icon;
              const isActive = pathname === tab.href || pathname === "/app/profile";
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  prefetch={true}
                  className="flex flex-col items-center justify-center w-20 h-full active:scale-95 transition-transform"
                >
                  <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? "text-primary stroke-[2.5px]" : "text-slate-400"}`} />
                  <span className={`text-[10px] transition-colors ${isActive ? "text-primary font-bold" : "text-slate-400 font-medium"}`}>
                    {tab.name}
                  </span>
                </Link>
              );
            })()}

          </div>
        </div>
      </nav>
    </div>
  );
}
