import { createClient } from "@supabase/supabase-js";
import AddEmployeeSection from "@/components/AddEmployeeSection";
import EmployeeRow from "@/components/EmployeeRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmployeesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  return (
    <div className="max-w-6xl mx-auto">
      <AddEmployeeSection />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {employees?.map((emp) => (
          <EmployeeRow key={emp.id} employee={emp} />
        ))}
        {(!employees || employees.length === 0) && (
          <div className="col-span-full bg-white p-8 rounded-xl text-center text-gray-500 border border-gray-200">
            Сотрудников пока нет
          </div>
        )}
      </div>
    </div>
  );
}
