"use client";

import { useState } from "react";
import AddEmployeeForm from "./AddEmployeeForm";
import { useRouter } from "next/navigation";

export default function AddEmployeeSection() {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setShowForm(false);
    router.refresh(); // Обновляем данные на странице
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`${showForm ? "bg-gray-200 text-gray-800" : "bg-primary text-white hover:bg-primary/90"} px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm`}
        >
          {showForm ? "Отмена" : "+ Добавить сотрудника"}
        </button>
      </div>

      {showForm && <AddEmployeeForm onSuccess={handleSuccess} />}
    </>
  );
}
