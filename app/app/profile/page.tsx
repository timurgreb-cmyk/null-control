import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions/auth";
import { LogOut, UserCircle, Briefcase, Phone } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  
  if (user) {
    // Используем админ-клиент для обхода проблем с RLS (рекурсия)
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      
    if (error) console.error("Profile fetch error:", error);
    profile = data;
  }

  return (
    <div className="p-4 pt-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center mb-6">
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

      <form action={logout}>
        <button
          type="submit"
          className="w-full flex items-center justify-center p-4 bg-white border border-red-100 text-red-500 rounded-2xl font-bold shadow-sm active:scale-95 transition-all"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Выйти из аккаунта
        </button>
      </form>
    </div>
  );
}
