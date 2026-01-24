// app/api/login/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 1) email로 유저 찾기
    // supabaseAdmin은 서비스 역할 키를 사용하므로 RLS 정책을 우회합니다
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("user_id, email, password_hash, nickname")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle();

    // 에러 로깅
    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: `데이터베이스 에러: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      // 해당 이메일 없음
      console.log("로그인 실패: 해당 이메일의 사용자가 없습니다.", email);
      return NextResponse.json(
        { error: "해당 이메일의 사용자가 없습니다." },
        { status: 401 }
      );
    }

    // 2) 비밀번호 검사 (지금은 그냥 문자열 비교)
    if (data.password_hash !== password) {
      console.log("로그인 실패: 비밀번호가 올바르지 않습니다.", email);
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 3) 로그인 성공 → 최소한의 정보만 반환
    console.log("로그인 성공:", data.email);
    return NextResponse.json({
      userId: data.user_id,
      email: data.email,
      nickname: data.nickname,
    });
  } catch (err) {
    console.error("POST /api/login error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
