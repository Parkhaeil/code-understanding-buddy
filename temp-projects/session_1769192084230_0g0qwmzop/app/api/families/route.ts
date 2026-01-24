// app/api/families/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// GET /api/families?userId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      );
    }

    const numericUserId = Number(userId);

    // user_families_view에서 해당 user_id만 조회 (is_active가 true인 것만)
    // user_families_view가 is_active를 포함하지 않을 수 있으므로, family_members에서 직접 조회
    const { data: familyMembers, error: membersError } = await supabaseAdmin
      .from("family_members")
      .select("family_id, role, families!inner(family_id, family_name)")
      .eq("user_id", numericUserId)
      .eq("is_active", true);

    if (membersError) {
      console.error("GET /api/families family_members error:", membersError);
      return NextResponse.json(
        { error: "DB 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!familyMembers || familyMembers.length === 0) {
      return NextResponse.json([]);
    }

    // user_families_view에서 추가 정보 조회 (또는 직접 조인)
    const familyIds = familyMembers.map((fm: any) => fm.family_id);
    const { data, error } = await supabaseAdmin
      .from("user_families_view")
      .select("family_id, family_name, role, member_count, today_menu")
      .eq("user_id", numericUserId)
      .in("family_id", familyIds);

    if (error) {
      console.error("GET /api/families supabase error:", error);
      return NextResponse.json(
        { error: "DB 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // 이미 위에서 familyIds를 정의했으므로 재사용
    const { data: activeMembers, error: activeMembersError } =
      await supabaseAdmin
        .from("family_members")
        .select("family_id")
        .in("family_id", familyIds)
        .eq("is_active", true);

    if (activeMembersError) {
      console.error(
        "GET /api/families active member count error:",
        activeMembersError
      );
      // 에러가 나도 전체 API가 죽지는 않게, 기존 member_count 그대로 반환
      return NextResponse.json(data);
    }

    const activeCountByFamily: Record<number, number> = {};
    if (activeMembers) {
      for (const row of activeMembers as any[]) {
        const fid = row.family_id as number;
        activeCountByFamily[fid] = (activeCountByFamily[fid] ?? 0) + 1;
      }
    }

    const result = data.map((f: any) => ({
      ...f,
      member_count:
        activeCountByFamily[f.family_id] ?? 0, // 활성 멤버가 없으면 0명
    }));

    return NextResponse.json(result);
    } catch (err) {
      // err가 Error 타입일 때 message까지 찍기
      if (err instanceof Error) {
        console.error("GET /api/families error:", err.message);
      } else {
        console.error("GET /api/families unknown error:", err);
      }

      return NextResponse.json(
        { error: "서버 에러가 발생했습니다." },
        { status: 500 }
      );
  }
}
