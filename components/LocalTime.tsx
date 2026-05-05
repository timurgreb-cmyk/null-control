"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface LocalTimeProps {
  isoString: string;
  formatStr?: string;
}

export default function LocalTime({ isoString, formatStr = "dd MMM yyyy, HH:mm" }: LocalTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Пока компонент не "ожил" на клиенте, показываем пустую строку или серверный вариант (заглушку)
    // чтобы не было ошибки гидратации
    return <span className="opacity-0">--:--</span>;
  }

  try {
    const date = parseISO(isoString);
    return <span>{format(date, formatStr, { locale: ru })}</span>;
  } catch (e) {
    return <span>{isoString}</span>;
  }
}
