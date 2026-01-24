// app/api/families/quit/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// 가족 탈퇴
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { familyId, userId, confirm } = body; // confirm: 마지막 부모일 때 재확인 플래그

    if (!familyId || !userId) {
      return NextResponse.json(
        { error: "familyId와 userId는 필수입니다." },
        { status: 400 }
      );
    }

    // 1) 가족 구성원인지 확인
    const { data: member, error: memberCheckError } = await supabaseAdmin
      .from("family_members")
      .select("user_id, role, is_active")
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

    if (!member) {
      return NextResponse.json(
        { error: "해당 가족에 속해있지 않습니다." },
        { status: 404 }
      );
    }

    if (!member.is_active) {
      return NextResponse.json(
        { error: "이미 탈퇴한 가족입니다." },
        { status: 400 }
      );
    }

    // 2) 부모인 경우, 마지막 부모인지 확인
    let isLastParent = false;
    if (member.role === "PARENT") {
      const { data: activeParents, error: parentsError } = await supabaseAdmin
        .from("family_members")
        .select("user_id")
        .eq("family_id", familyId)
        .eq("role", "PARENT")
        .eq("is_active", true);

      if (parentsError) {
        console.error("부모 조회 에러:", parentsError);
        return NextResponse.json(
          { error: "부모 조회 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      // 마지막 부모인 경우
      if (activeParents && activeParents.length === 1) {
        isLastParent = true;
      }
    }

    // 3) 마지막 부모인 경우 확인 플래그가 없으면 프론트에서 확인 받도록 응답 반환
    if (isLastParent && !confirm) {
      return NextResponse.json({
        isLastParent: true,
        message: "마지막 부모입니다. 탈퇴하시면 가족이 삭제됩니다.",
      });
    }

    // 4) 마지막 부모인 경우 - 가족 전체 삭제 (RPC 함수로 트랜잭션 처리)
    if (isLastParent && confirm) {
      try {
        // RPC 함수 호출 (트랜잭션 처리)
        const { data, error } = await supabaseAdmin.rpc("delete_family_transaction", {
          p_family_id: familyId,
        });

        if (error) {
          console.error("가족 삭제 RPC 에러:", error);
          throw error;
        }

        // RPC 함수는 JSON을 반환하므로 그대로 사용
        return NextResponse.json(data || {
          success: true,
          message: "가족이 삭제되었습니다.",
        });
      } catch (error) {
        console.error("가족 삭제 에러:", error);
        return NextResponse.json(
          { error: `가족 삭제 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}` },
          { status: 500 }
        );
      }
    }

    // 5) 마지막 부모가 아니면 바로 탈퇴 처리 (is_active만 false로)
    const { error: updateError } = await supabaseAdmin
      .from("family_members")
      .update({ is_active: false })
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("가족 탈퇴 에러:", updateError);
      return NextResponse.json(
        { error: `가족 탈퇴 실패: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "가족에서 탈퇴했습니다.",
    });
  } catch (err) {
    console.error("POST /api/families/quit error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

