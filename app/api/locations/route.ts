import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data: locations, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { name, base_hours, latitude, longitude, radius_meters, is_geo_required, id, action } = body;

  // Если запрошено обновление QR-кода локации
  if (action === "refresh_qr" && id) {
    const newQrToken = crypto.randomUUID();
    let { data, error } = await supabase
      .from("locations")
      .update({ qr_token: newQrToken })
      .eq("id", id)
      .select()
      .single();

    if (error && error.message.includes("qr_token")) {
      // Фолбэк если колонки qr_token пока нет в таблице
      return NextResponse.json({ error: "Пожалуйста, выполните SQL для добавления колонки qr_token в базе данных" }, { status: 400 });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ location: data, qr_token: newQrToken });
  }

  if (!name) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

  const payload: any = {
    name,
    is_active: true,
    base_hours: base_hours || 8,
    radius_meters: radius_meters !== undefined ? radius_meters : 200,
    is_geo_required: is_geo_required !== undefined ? is_geo_required : true,
  };

  if (latitude !== undefined && latitude !== null && latitude !== "") {
    payload.latitude = parseFloat(latitude);
  }
  if (longitude !== undefined && longitude !== null && longitude !== "") {
    payload.longitude = parseFloat(longitude);
  }

  if (id) {
    // Обновление имеющейся локации
    const { data, error } = await supabase
      .from("locations")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ location: data });
  } else {
    // Создание новой локации с новым qr_token
    payload.qr_token = crypto.randomUUID();
    const { data, error } = await supabase
      .from("locations")
      .insert(payload)
      .select()
      .single();

    if (error && error.message.includes("qr_token")) {
      // В случае если колонки qr_token еще нет
      delete payload.qr_token;
      const fallback = await supabase
        .from("locations")
        .insert(payload)
        .select()
        .single();
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      return NextResponse.json({ location: fallback.data });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ location: data });
  }
}
