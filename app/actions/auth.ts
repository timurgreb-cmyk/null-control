"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) {
    return { error: "Пожалуйста, введите email и пароль." };
  }

  const supabase = createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Неверный email или пароль." };
  }

  if (data.user) {
    // Используем Service Role, чтобы гарантированно обойти любые проблемы с RLS или кэшем сессии
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role) {
      cookies().set("user_role", profile.role, { 
        httpOnly: true, 
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'lax'
      });
    } else {
      console.error("No profile found or error reading profile:", profileErr);
    }
  }

  revalidatePath("/", "layout");
  redirect("/"); // Middleware перенаправит на правильную страницу
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  cookies().delete("user_role");
  redirect("/login");
}

export async function loginWithPin(pin: string) {
  if (!pin || pin.length !== 5) {
    return { error: "Неверный формат PIN-кода." };
  }

  const supabase = createClient();
  
  const systemEmail = `pin_${pin}@employee.null.control`;
  const systemPassword = `${pin}_nullcontrol_secret`;

  const { error, data } = await supabase.auth.signInWithPassword({
    email: systemEmail,
    password: systemPassword,
  });

  if (error) {
    return { error: "Неверный PIN-код." };
  }

  if (data.user) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role) {
      cookies().set("user_role", profile.role, { 
        httpOnly: true, 
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'lax'
      });
    }
  }

  revalidatePath("/", "layout");
  redirect("/"); 
}
