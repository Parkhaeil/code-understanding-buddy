// app/api/families/invite/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";


type StatsQuery = {
  familyId: number;
  userId: number;
};

// 0. 권한 체크
async function assertFamilyMember({ familyId, userId }: StatsQuery) {
  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select("family_id, user_id")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[STATS] 가족 구성원 조회 에러:", error);
    return NextResponse.json(
      { error: `가족 구성원 조회 실패: ${error.message}` },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "해당 가족에 대한 접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  return null;
}

// invite code 생성 API 및 참여 처리
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return NextResponse.json(
        { error: "초대 코드와 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 1) 초대 코드 조회 (활성 코드만)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invitation_codes")
      .select("invite_id, family_id, is_active")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (inviteError) {
      console.error("초대 코드 조회 에러:", inviteError);
      return NextResponse.json(
        { error: `초대 코드 조회 실패: ${inviteError.message}` },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 400 }
      );
    }

    const familyId = invite.family_id;

    // 2) 가족 정보 조회 (비활성 가족 제외)
    const { data: family, error: familyError } = await supabaseAdmin
      .from("families")
      .select("family_id, family_name, created_by, is_active")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .maybeSingle();

    if (familyError) {
      console.error("가족 조회 에러:", familyError);
      return NextResponse.json(
        { error: `가족 조회 실패: ${familyError.message}` },
        { status: 500 }
      );
    }

    if (!family) {
      return NextResponse.json(
        { error: "해당 초대 코드의 가족을 찾을 수 없거나 비활성화된 가족입니다." },
        { status: 400 }
      );
    }

    // 3) 이미 가족 구성원인지 확인
    const { data: existingMember, error: memberCheckError } = await supabaseAdmin
      .from("family_members")
      .select("family_id, user_id, is_active, role")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberCheckError) {
      console.error("가족 구성원 조회 에러:", memberCheckError);
      return NextResponse.json(
        { error: `가족 구성원 조회 실패: ${memberCheckError.message}` },
        { status: 500 }
      );
    }

    // 이미 가족 구성원인 경우
    if (existingMember) {
      // is_active가 false인 경우, 다시 활성화 (본인이 만든 가족이더라도 재가입 허용)
      if (!existingMember.is_active) {
        const { error: updateError } = await supabaseAdmin
          .from("family_members")
          .update({ is_active: true })
          .eq("family_id", familyId)
          .eq("user_id", userId);

        if (updateError) {
          console.error("가족 구성원 활성화 에러:", updateError);
          return NextResponse.json(
            { error: `가족 재참여 실패: ${updateError.message}` },
            { status: 500 }
          );
        }

        // 성공 응답 - 프론트에서 가족 페이지로 이동할 때 사용
        return NextResponse.json({
          success: true,
          family: {
            familyId: family.family_id,
            familyName: family.family_name,
            role: existingMember.role || "FOLLOWER",
          },
        });
      }

      // 이미 활성 상태인 경우
      // 본인이 만든 가족이면 초대 코드로 참여 불가
      if (family.created_by === userId) {
        return NextResponse.json(
          { error: "본인이 만든 가족에는 초대 코드로 참여할 수 없습니다." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "이미 이 가족에 속해 있습니다." },
        { status: 400 }
      );
    }

    // 4) 새로 가입하는 경우, 본인이 만든 가족이면 참여 불가
    if (family.created_by === userId) {
      return NextResponse.json(
        { error: "본인이 만든 가족에는 초대 코드로 참여할 수 없습니다." },
        { status: 400 }
      );
    }

    // 5) 가족 구성원으로 추가 (기본 역할: FOLLOWER)
    const { error: insertError } = await supabaseAdmin
      .from("family_members")
      .insert({
        family_id: familyId,
        user_id: userId,
        role: "FOLLOWER",
        is_active: true,
      });

    if (insertError) {
      console.error("가족 구성원 추가 에러:", insertError);
      return NextResponse.json(
        { error: `가족 참여 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 6) 성공 응답 - 프론트에서 가족 목록 새로고침할 때 사용 가능
    return NextResponse.json({
      success: true,
      family: {
        familyId: family.family_id,
        familyName: family.family_name,
        role: "FOLLOWER" as const,
      },
    });
  } catch (err) {
    console.error("POST /api/families/invite error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}


// invite code 조회 API
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const familyIdParam = searchParams.get("familyId");
    const userIdParam = searchParams.get("userId");

    if (!familyIdParam || !userIdParam) {
      return NextResponse.json(
        { error: "familyId와 userId가 필요합니다." },
        { status: 400 }
      );
    }

    const familyId = Number(familyIdParam);
    const userId = Number(userIdParam);

    if (Number.isNaN(familyId) || Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "familyId와 userId는 숫자여야 합니다." },
        { status: 400 }
      );
    }

    // 0. 권한 체크
    const authError = await assertFamilyMember({ familyId, userId });
    if (authError) return authError;

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invitation_codes")
      .select("family_id, code")
      .eq("family_id", familyId)
      .maybeSingle();

    if (inviteError) {
      console.error("초대 코드 조회 에러 (GET):", inviteError);
      return NextResponse.json(
        { error: `초대 코드 조회 실패: ${inviteError.message}` },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ code: invite });
  } catch (err) {
    console.error("GET /api/families/invite error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}