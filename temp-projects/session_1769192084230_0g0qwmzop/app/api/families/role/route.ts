// app/api/families/role/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// 0. 부모 권한 체크
async function assertParentRole(familyId: number, userId: number) {
  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select("role")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ROLE] 부모 권한 체크 에러:", error);
    return NextResponse.json(
      { error: `권한 체크 실패: ${error.message}` },
      { status: 500 }
    );
  }

  if (!data || data.role !== "PARENT") {
    return NextResponse.json(
      { error: "부모 권한이 필요합니다." },
      { status: 403 }
    );
  }

  return null;
}

// 1. 가족 구성원 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const familyIdParam = searchParams.get("familyId");

    if (!familyIdParam) {
      return NextResponse.json(
        { error: "familyId가 필요합니다." },
        { status: 400 }
      );
    }

    const familyId = Number(familyIdParam);
    if (Number.isNaN(familyId)) {
      return NextResponse.json(
        { error: "올바른 familyId가 아닙니다." },
        { status: 400 }
      );
    }

    // family_members와 users를 조인해서 활성 사용자만 조회
    const { data, error } = await supabaseAdmin
      .from("family_members")
      .select(`
        user_id,
        role,
        joined_at,
        users!inner (
          user_id,
          nickname,
          is_active
        )
      `)
      .eq("family_id", familyId)
      .eq("users.is_active", true);

    if (error) {
      console.error("가족 구성원 조회 에러:", error);
      return NextResponse.json(
        { error: `가족 구성원 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 데이터 변환: FamilyMember 형식으로
    const members = (data || []).map((item: any) => {
      const user = item.users;
      const joinedAt = item.joined_at
        ? (() => {
            const date = new Date(item.joined_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}.${month}.${day}`;
          })()
        : "";

      return {
        id: item.user_id,
        name: user?.nickname || "알 수 없음",
        joinedAt: joinedAt,
        role: item.role as "PARENT" | "CHILD" | "FOLLOWER",
      };
    });

    return NextResponse.json(
      { data: members },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/families/role error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 가족 구성원 역할 변경
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { familyId, targetUserId, newRole, userId } = body;

    if (!familyId || !targetUserId || !newRole || !userId) {
      return NextResponse.json(
        { error: "familyId, targetUserId, newRole, userId는 필수입니다." },
        { status: 400 }
      );
    }

    if (!["PARENT", "CHILD", "FOLLOWER"].includes(newRole)) {
      return NextResponse.json(
        { error: "올바른 역할이 아닙니다. (PARENT, CHILD, FOLLOWER)" },
        { status: 400 }
      );
    }

    // 부모 권한 체크
    const authError = await assertParentRole(familyId, userId);
    if (authError) return authError;

    const { error: updateError } = await supabaseAdmin
      .from("family_members")
      .update({ role: newRole })
      .eq("family_id", familyId)
      .eq("user_id", targetUserId);

    if (updateError) {
      console.error("역할 변경 에러:", updateError);
      return NextResponse.json(
        { error: `역할 변경 실패: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "역할이 성공적으로 변경되었습니다." 
    });
  } catch (err) {
    console.error("PUT /api/families/role error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 가족 구성원 제거
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { familyId, targetUserId, userId } = body;

    if (!familyId || !targetUserId || !userId) {
      return NextResponse.json(
        { error: "familyId, targetUserId, userId는 필수입니다." },
        { status: 400 }
      );
    }

    // 부모 권한 체크
    const authError = await assertParentRole(familyId, userId);
    if (authError) return authError;

    const { error: deleteError } = await supabaseAdmin
      .from("family_members")
      .update({ is_active: false })
      .eq("family_id", familyId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("구성원 제거 에러:", deleteError);
      return NextResponse.json(
        { error: `구성원 제거 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "구성원이 성공적으로 제거되었습니다." 
    });
  } catch (err) {
    console.error("DELETE /api/families/role error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

