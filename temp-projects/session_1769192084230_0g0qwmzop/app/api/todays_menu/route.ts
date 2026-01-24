// app/api/todaysmenu/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

// 1. 오늘의 메뉴 불러오기
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const familyIdParam = searchParams.get("familyId");
    const targetDateParam = searchParams.get("targetDate");

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

    const targetDate = targetDateParam || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })();

    const { data: rows, error } = await supabaseAdmin
      .from("v_today_menu_cards")
      .select("*")
      .eq("family_id", familyId)
      .eq("target_date", targetDate);

    if (error) {
      console.error("오늘의 메뉴 조회 에러:", error);
      return NextResponse.json(
        { error: `오늘의 메뉴 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 오늘의 메뉴가 없을 때
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "오늘의 메뉴가 선택되지 않았습니다.", data: null },
        { status: 200 }
      );
    }

    const firstRow = rows[0] as any;
    
    const ingredients: Array<{
      ingredient_id?: number;
      ingredient_name: string;
      storage_type: "FREEZER" | "FRIDGE" | "ROOM" | "NEED";
    }> = [];

    for (const row of rows) {
      const r = row as any;
      if (r.ingredient_name && !ingredients.find(ing => ing.ingredient_name === r.ingredient_name)) {
        ingredients.push({
          ingredient_name: r.ingredient_name,
          storage_type: r.is_need_ingredient ? "NEED" : (r.storage_type || "ROOM"),
        });
      }
    }

    // creator의 is_active 확인
    const creatorIsActive = firstRow.creator_is_active !== false; // 기본값은 true

    let roleLabel = "팔로워";
    if (!creatorIsActive) {
      roleLabel = "탈퇴함";
    } else if (firstRow.creator_role === "PARENT") roleLabel = "부모";
    else if (firstRow.creator_role === "CHILD") roleLabel = "자녀";
    else if (firstRow.creator_role === "FOLLOWER") roleLabel = "팔로워";

    const processedData = {
      today_id: firstRow.today_id,
      family_id: firstRow.family_id,
      menu_id: firstRow.menu_id,
      menu_name: firstRow.menu_name,
      source_type: firstRow.source_type || "HOME",
      status: firstRow.status || "POSSIBLE",
      target_date: firstRow.target_date,
      creator_nickname: firstRow.creator_nickname,
      creator_role: firstRow.creator_role,
      creator_is_active: creatorIsActive,
      role_label: roleLabel,
      ingredients: ingredients,
    };

    return NextResponse.json(
      { data: processedData },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/todaysmenu error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 오늘의 메뉴 등록하기
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { familyId, menuId, targetDate, userId } = body;

    if (!familyId || !menuId || !userId) {
      return NextResponse.json(
        { error: "familyId, menuId, userId는 필수입니다." },
        { status: 400 }
      );
    }

    const date = targetDate || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })();

    // 부모 권한 체크
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (parentError) {
      console.error("부모 권한 체크 에러:", parentError);
      return NextResponse.json(
        { error: "부모 권한 체크 실패" },
        { status: 403 }
      );
    }

    if (parentData?.role !== "PARENT") {
      return NextResponse.json(
        { error: "부모가 아님" },
        { status: 403 }
      );
    }

    // 이미 오늘의 메뉴가 있는지 확인
    const { data: existingMenu, error: checkError } = await supabaseAdmin
      .from("today_menus")
      .select("today_id")
      .eq("family_id", familyId)
      .eq("target_date", date)
      .maybeSingle();

    if (checkError) {
      console.error("오늘의 메뉴 중복 체크 에러:", checkError);
      return NextResponse.json(
        { error: "오늘의 메뉴 확인 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (existingMenu) {
      return NextResponse.json(
        { error: "이미 해당 날짜의 메뉴가 등록되어 있습니다." },
        { status: 400 }
      );
    }

    // 오늘의 메뉴 등록
    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const { data: insertedData, error: todayMenuError } = await supabaseAdmin
      .from("today_menus")
      .insert({
        family_id: familyId,
        menu_id: menuId,
        target_date: date,
        selected_by: userId,
        created_at: createdAt,
      })
      .select("today_id, created_at")
      .single();

    if (todayMenuError || !insertedData) {
      console.error("오늘의 메뉴 등록 에러:", todayMenuError);
      return NextResponse.json(
        { error: "오늘의 메뉴 등록 실패" },
        { status: 500 }
      );
    }

    try {
      // 1. 메뉴에 포함된 재료 ID 목록 조회
      const { data: menuIngredients, error: ingredientsError } = await supabaseAdmin
        .from("menu_ingredients")
        .select("ingredient_id")
        .eq("menu_id", menuId);

      if (!ingredientsError && menuIngredients && menuIngredients.length > 0) {
        const ingredientIds = menuIngredients
          .map((mi) => mi.ingredient_id)
          .filter((id): id is number => id !== null && id !== undefined);

        if (ingredientIds.length > 0) {
          // 2. 각 재료의 usage_count 증가 (RPC 함수 사용)
          for (const ingredientId of ingredientIds) {
            const { error: updateError } = await supabaseAdmin.rpc("increment_usage_count", {
              p_ingredient_id: ingredientId,
              p_family_id: familyId,
            });

            if (updateError) {
              console.warn(`재료 ${ingredientId}의 usage_count 증가 실패:`, updateError);
            }
          }
        }
      }
    } catch (usageCountError) {
      console.warn("usage_count 업데이트 실패:", usageCountError);
    }

    // created_at을 날짜 문자열로 변환 (타임존 문제 방지)
    const createdAtDate = insertedData.created_at
      ? (() => {
          const dateObj = new Date(insertedData.created_at);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        })()
      : null;

    return NextResponse.json(
      { 
        success: true,
        message: "오늘의 메뉴가 성공적으로 등록되었습니다.",
        data: {
          today_id: insertedData.today_id,
          created_at: createdAtDate,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/todaysmenu error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 오늘의 메뉴 삭제하기
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const familyIdParam = searchParams.get("familyId");
    const targetDateParam = searchParams.get("targetDate");

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

    const targetDate = targetDateParam || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })();

    // 삭제 전에 메뉴 ID와 재료 정보를 먼저 조회
    const { data: todayMenuData, error: fetchError } = await supabaseAdmin
      .from("today_menus")
      .select("menu_id")
      .eq("family_id", familyId)
      .eq("target_date", targetDate)
      .maybeSingle();

    if (fetchError) {
      console.error("오늘의 메뉴 조회 에러:", fetchError);
      return NextResponse.json(
        { error: "오늘의 메뉴 조회 실패" },
        { status: 500 }
      );
    }

    const menuId = todayMenuData?.menu_id;

    // 오늘의 메뉴 삭제
    const { error: todayMenuError } = await supabaseAdmin
      .from("today_menus")
      .delete()
      .eq("family_id", familyId)
      .eq("target_date", targetDate);

    if (todayMenuError) {
      console.error("오늘의 메뉴 삭제 에러:", todayMenuError);
      return NextResponse.json(
        { error: "오늘의 메뉴 삭제 실패" },
        { status: 500 }
      );
    }

    // 메뉴에 포함된 재료들의 usage_count 감소
    if (menuId) {
      try {
        // 1. 메뉴에 포함된 재료 ID 목록 조회
        const { data: menuIngredients, error: ingredientsError } = await supabaseAdmin
          .from("menu_ingredients")
          .select("ingredient_id")
          .eq("menu_id", menuId);

        if (!ingredientsError && menuIngredients && menuIngredients.length > 0) {
          const ingredientIds = menuIngredients
            .map((mi) => mi.ingredient_id)
            .filter((id): id is number => id !== null && id !== undefined);

          if (ingredientIds.length > 0) {
            // 2. 각 재료의 usage_count 감소 (RPC 함수 사용)
            for (const ingredientId of ingredientIds) {
              const { error: updateError } = await supabaseAdmin.rpc("decrement_usage_count", {
                p_ingredient_id: ingredientId,
                p_family_id: familyId,
              });

              if (updateError) {
                console.warn(`재료 ${ingredientId}의 usage_count 감소 실패:`, updateError);
              }
            }
          }
        }
      } catch (usageCountError) {
        // usage_count 업데이트 실패해도 오늘의 메뉴 삭제는 성공한 것으로 처리
        console.warn("usage_count 업데이트 실패:", usageCountError);
      }
    }

    return NextResponse.json(
      { success: true, message: "오늘의 메뉴가 성공적으로 삭제되었습니다." },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/todaysmenu error:", err);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

