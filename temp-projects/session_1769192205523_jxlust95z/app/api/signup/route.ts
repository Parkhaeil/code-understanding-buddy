// app/api/signup/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, nickname } = body;

    // 필수 필드 검증
    if (!email || !password || !nickname) {
      return NextResponse.json(
        { error: "이메일, 비밀번호, 닉네임을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 이메일 중복 체크
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("user_id, email")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("이메일 중복 체크 에러:", checkError);
      return NextResponse.json(
        { error: `이메일 중복 체크 실패: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    // 닉네임 중복 체크
    const { data: existingNickname, error: nicknameCheckError } = await supabaseAdmin
      .from("users")
      .select("user_id, nickname")
      .eq("nickname", nickname)
      .maybeSingle();

    if (nicknameCheckError) {
      console.error("닉네임 중복 체크 에러:", nicknameCheckError);
      // 닉네임 중복 체크 실패해도 계속 진행 (필수는 아님)
    }

    if (existingNickname) {
      return NextResponse.json(
        { error: "이미 사용 중인 닉네임입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 길이 검증 (4자 이상)
    if (password.length < 4) {
      return NextResponse.json(
        { error: "비밀번호는 최소 4자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 사용자 생성
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        email: email.trim().toLowerCase(),
        password_hash: password,
        nickname: nickname.trim(),
        is_active: true,
      })
      .select("user_id, email, nickname")
      .single();

    if (insertError) {
      console.error("사용자 생성 에러:", insertError);
      
      // user_id sequence 문제인 경우
      if (insertError.code === '23505' && insertError.message?.includes('users_pkey')) {
        console.error("⚠️ user_id sequence가 동기화되지 않았습니다. Sequence를 재설정해야 합니다.");
        return NextResponse.json(
          { error: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `회원가입 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    if (!newUser) {
      return NextResponse.json(
        { error: "회원가입에 실패했습니다." },
        { status: 500 }
      );
    }

    console.log("회원가입 성공:", newUser.email);
    return NextResponse.json({
      userId: newUser.user_id,
      email: newUser.email,
      nickname: newUser.nickname,
      message: "회원가입이 완료되었습니다.",
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/signup error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

