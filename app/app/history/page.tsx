"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { LogIn, LogOut, MapPin, Loader2, ArrowLeft } from "lucide-react";
import LocalTime from "@/components/LocalTime";
import { getMyTimeRecords } from "@/app/actions/time-records";
import Link from "next/link";

export default function HistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getMyTimeRecords();
        if (res.success) {
          setRecords(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // Группировка по датам
  const groupedRecords: { [key: string]: any[] } = {};
  
  records.forEach((record) => {
    try {
      const dateStr = format(new Date(record.recorded_at), "d MMMM yyyy", { locale: ru });
      if (!groupedRecords[dateStr]) {
        groupedRecords[dateStr] = [];
      }
      groupedRecords[dateStr].push(record);
    } catch (e) {
      console.error(e);
    }
  });

  return (
    <div className="p-4 pt-6">
      {/* Кнопка назад */}
      <div className="flex items-center mb-6">
        <Link 
          href="/app/profile" 
          className="mr-3 p-2 bg-white rounded-xl border border-gray-100 text-gray-500 hover:text-gray-900 active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">История отметок</h1>
      </div>
      
      {loading ? (
        // Скелетон-лоадер
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 h-10 w-full" />
              <div className="p-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center w-full">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-4" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groupedRecords).length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          У вас пока нет отметок
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).map(([date, dayRecords]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 capitalize">{date}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {dayRecords.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        record.record_type === "check_in" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-orange-100 text-orange-600"
                      }`}>
                        {record.record_type === "check_in" ? (
                          <LogIn className="w-5 h-5" />
                        ) : (
                          <LogOut className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.record_type === "check_in" ? "Приход" : "Уход"}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {record.locations?.name || "Неизвестная локация"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">
                        <LocalTime isoString={record.recorded_at} formatStr="HH:mm" />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
