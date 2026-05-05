"use client";

import { deleteRecord } from "@/app/actions/time-records";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteRecordButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Удалить эту отметку? Это повлияет на табель.")) return;
    
    setLoading(true);
    const result = await deleteRecord(recordId);
    
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
    >
      {loading ? "Удаление..." : "Удалить"}
    </button>
  );
}
