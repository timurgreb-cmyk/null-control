"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProductionButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Удалить эту запись о выработке?")) return;
    setLoading(true);

    const { createClient } = await import("@supabase/supabase-js");
    // Используем server action вместо прямого вызова
    const res = await fetch("/api/production/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId })
    });

    if (res.ok) {
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-gray-400 hover:text-red-500 active:scale-90 transition-all p-1 disabled:opacity-50"
      title="Удалить"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
