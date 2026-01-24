import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*");
  
  if (error) {
    console.error("Supabase query error:", error);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(data);
}