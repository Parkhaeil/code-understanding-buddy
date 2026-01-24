// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// 모든 통계는 한 달 기준으로 조회
type StatsResponse = {
  // 1. 이번 달에 제일 많이 먹은 메뉴 top 3
  topMenus: {
    menu_name: string;
    cnt: string;
  }[];

  // 2. 배달음식 / 집밥 비율
  homePercent: number;
  eatOutPercent: number;

  // 3-1. 식재료 선호도 : 가장 많이 쓴 재료 top 5
  topIngredients: {
    ingredient_name: string;
    cnt: string;
  }[];

  // 3-2. 식재료 선호도 : 가장 적게 쓴 재료 top 5
  leastIngredients: {
    ingredient_name: string;
    cnt: string;
  }[];
};

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

// 1. 이번 달에 제일 많이 먹은 메뉴 top 3
async function getTopMenus({ familyId }: StatsQuery) {
  // 타임존 문제 방지: 로컬 날짜만 사용
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}-${String(startOfMonth.getDate()).padStart(2, "0")}`;
  const endStr = `${startOfNextMonth.getFullYear()}-${String(startOfNextMonth.getMonth() + 1).padStart(2, "0")}-${String(startOfNextMonth.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("today_menus")
    .select(
      `
      menu_id,
      target_date,
      menus (
        menu_name
      )
    `
    )
    .eq("family_id", familyId)
    .gte("target_date", startStr)
    .lt("target_date", endStr);

  if (error) {
    console.error("[STATS] getTopMenus 에러:", error);
    return { topMenus: [] };
  }

  const counter: Record<
    string,
    {
      menu_name: string;
      cnt: number;
    }
  > = {};

  (data ?? []).forEach((row: any) => {
    const name = row.menus?.menu_name as string | undefined;
    if (!name) return;
    if (!counter[name]) {
      counter[name] = { menu_name: name, cnt: 0 };
    }
    counter[name].cnt += 1;
  });

  const topMenus = Object.values(counter)
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 3)
    .map((m) => ({ menu_name: m.menu_name, cnt: String(m.cnt) }));

  return {
    topMenus,
  };
}

// 2. 배달음식 / 집밥 비율
async function getHomeAndEatOutPercent({ familyId }: StatsQuery) {
  // 타임존 문제 방지: 로컬 날짜만 사용
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}-${String(startOfMonth.getDate()).padStart(2, "0")}`;
  const endStr = `${startOfNextMonth.getFullYear()}-${String(startOfNextMonth.getMonth() + 1).padStart(2, "0")}-${String(startOfNextMonth.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("today_menus")
    .select(
      `
      menu_id,
      target_date,
      menus (
        source_type
      )
    `
    )
    .eq("family_id", familyId)
    .gte("target_date", startStr)
    .lt("target_date", endStr);

  if (error) {
    console.error("[STATS] getHomeAndEatOutPercent 에러:", error);
    return {
      homePercent: 0,
      eatOutPercent: 0,
    };
  }

  // 기본값
  let homePercent = 0;
  let eatOutPercent = 0;

  const rows = (data ?? []) as any[];
  if (rows.length > 0) {
    let homeCount = 0;
    let eatOutCount = 0;

    rows.forEach((row) => {
      const src = row.menus?.source_type as "HOME" | "EAT_OUT" | null;
      if (src === "HOME") homeCount += 1;
      if (src === "EAT_OUT") eatOutCount += 1;
    });

    const total = homeCount + eatOutCount;
    if (total > 0) {
      homePercent = (homeCount / total) * 100;
      eatOutPercent = (eatOutCount / total) * 100;
    }
  }

  return {
    homePercent,
    eatOutPercent,
  };
}

// 3-1, 3-2. 식재료 선호도 : 가장 많이 쓴 / 거의 안 쓴 재료 top 5
// fridge_ingredients 테이블의 usage_count를 기준으로 집계
async function getIngredientStats({ familyId }: StatsQuery) {
  // 가장 많이 쓴 재료 TOP 5
  const { data: topRows, error: topError } = await supabaseAdmin
    .from("fridge_ingredients")
    .select("ingredient_name, usage_count")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("usage_count", { ascending: false })
    .limit(5);

  if (topError) {
    console.error("[STATS] fridge_ingredients top 조회 에러:", topError);
    return { topIngredients: [], leastIngredients: [] };
  }

  // 가장 적게 쓴 재료 TOP 5
  const { data: leastRows, error: leastError } = await supabaseAdmin
    .from("fridge_ingredients")
    .select("ingredient_name, usage_count")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("usage_count", { ascending: true })
    .limit(5);

  if (leastError) {
    console.error("[STATS] fridge_ingredients least 조회 에러:", leastError);
    return { topIngredients: [], leastIngredients: [] };
  }

  const topIngredients =
    topRows?.map((row: any) => ({
      ingredient_name: row.ingredient_name as string,
      cnt: String(row.usage_count ?? 0),
    })) ?? [];

  const leastIngredients =
    leastRows?.map((row: any) => ({
      ingredient_name: row.ingredient_name as string,
      cnt: String(row.usage_count ?? 0),
    })) ?? [];

  return { topIngredients, leastIngredients };
}

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

    // 1. 통계 조회
    const [menuStats, homeEatStats, ingredientStats] = await Promise.all([
      getTopMenus({ familyId, userId }),
      getHomeAndEatOutPercent({ familyId, userId }),
      getIngredientStats({ familyId, userId }),
    ]);

    const result: StatsResponse = {
      ...menuStats,
      ...homeEatStats,
      ...ingredientStats,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json(
      { error: "통계를 불러오는 중 서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}