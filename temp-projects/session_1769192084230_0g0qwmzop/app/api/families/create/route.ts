// app/api/families/create/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// POST /api/families/create
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { familyName, userId } = body;

    if (!familyName || !userId) {
      return NextResponse.json(
        { error: "가족 이름과 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. 가족 생성
    const { data: familyData, error: familyError } = await supabaseAdmin
      .from("families")
      .insert({
        family_name: familyName,
        created_by: userId,
      })
      .select("family_id, family_name, created_at")
      .single();

    if (familyError) {
      console.error("가족 생성 에러:", familyError);
      return NextResponse.json(
        { error: `가족 생성 실패: ${familyError.message}` },
        { status: 500 }
      );
    }

    if (!familyData) {
      return NextResponse.json(
        { error: "가족 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    const familyId = familyData.family_id;

    // 2. 가족 구성원 추가 (PARENT 역할)
    const { error: memberError } = await supabaseAdmin
      .from("family_members")
      .insert({
        family_id: familyId,
        user_id: userId,
        role: "PARENT",
      });

    if (memberError) {
      console.error("가족 구성원 추가 에러:", memberError);
      // 가족 삭제 (롤백)
      await supabaseAdmin
        .from("families")
        .delete()
        .eq("family_id", familyId);
      
      return NextResponse.json(
        { error: `가족 구성원 추가 실패: ${memberError.message}` },
        { status: 500 }
      );
    }

    // 3. 초대 코드 생성 (랜덤 문자열)
    const generateInviteCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "FAM";
      for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // 중복 체크를 포함한 초대 코드 생성
    let inviteCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      inviteCode = generateInviteCode();
      const { data: checkData } = await supabaseAdmin
        .from("invitation_codes")
        .select("code")
        .eq("code", inviteCode)
        .maybeSingle();
      
      if (!checkData) {
        break; // 중복 없음
      }
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // 가족 및 구성원 삭제 (롤백)
      await supabaseAdmin
        .from("family_members")
        .delete()
        .eq("family_id", familyId);
      await supabaseAdmin
        .from("families")
        .delete()
        .eq("family_id", familyId);
      
      return NextResponse.json(
        { error: "초대 코드 생성에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // 초대 코드 삽입
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from("invitation_codes")
      .insert({
        family_id: familyId,
        code: inviteCode,
        created_by: userId,
      })
      .select("code")
      .single();

    if (inviteError) {
      console.error("초대 코드 삽입 에러:", inviteError);
      // 가족 및 구성원 삭제 (롤백)
      await supabaseAdmin
        .from("family_members")
        .delete()
        .eq("family_id", familyId);
      await supabaseAdmin
        .from("families")
        .delete()
        .eq("family_id", familyId);
      
      return NextResponse.json(
        { error: `초대 코드 생성 실패: ${inviteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      family: {
        familyId: familyId,
        familyName: familyData.family_name,
        createdAt: familyData.created_at,
      },
      inviteCode: inviteData.code,
    });
  } catch (err) {
    console.error("POST /api/families/create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

