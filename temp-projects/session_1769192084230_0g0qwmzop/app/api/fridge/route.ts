// app/api/fridge/route.tsx
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

type StorageType = "ROOM" | "FRIDGE" | "FREEZER" | "NEED";

async function assertFamilyMember(familyId: number, userId: number) {
  const { data: membership, error: memberError } = await supabaseAdmin
    .from("family_members")
    .select("family_id, user_id")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error("가족 구성원 조회 에러:", memberError);
    return NextResponse.json(
      { error: `가족 구성원 조회 실패: ${memberError.message}` },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json(
      { error: "해당 가족에 대한 접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  return null;
}

// 부모 권한 체크
async function assertParentRole(familyId: number, userId: number) {
  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select("role, is_active")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[FRIDGE] 부모 권한 체크 에러:", error);
    return NextResponse.json(
      { error: `권한 체크 실패: ${error.message}` },
      { status: 500 }
    );
  }

  if (!data || data.role !== "PARENT" || !data.is_active) {
    return NextResponse.json(
      { error: "부모 권한이 필요합니다." },
      { status: 403 }
    );
  }

  return null;
}

// 1. 냉장고 상태를 조회 : {freezer, fridge, room} 구조로 반환
async function getFridgeState(familyId: number) {
  const { data: ingredients, error: ingredientsError } = await supabaseAdmin
    .from("fridge_ingredients")
    .select("ingredient_id, ingredient_name, storage_type, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  if (ingredientsError) {
    console.error("냉장고 재료 조회 에러:", ingredientsError);
    return {
      error: NextResponse.json(
        { error: `냉장고 재료 조회 실패: ${ingredientsError.message}` },
        { status: 500 }
      ),
    };
  }

  const freezer: Array<{ id: number; name: string }> = [];
  const fridge: Array<{ id: number; name: string }> = [];
  const room: Array<{ id: number; name: string }> = [];

  (ingredients ?? []).forEach((ing) => {
    const item = { id: ing.ingredient_id, name: ing.ingredient_name };
    if (ing.storage_type === "FREEZER") {
      freezer.push(item);
    } else if (ing.storage_type === "FRIDGE") {
      fridge.push(item);
    } else if (ing.storage_type === "ROOM") {
      room.push(item);
    }
  });

  return { freezer, fridge, room };
}

// 2. 냉장고 상태 조회 API
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

    const memberErrorResponse = await assertFamilyMember(familyId, userId);
    if (memberErrorResponse) return memberErrorResponse;

    const { error, ...rest } = await getFridgeState(familyId);
    if (error) return error;

    return NextResponse.json(rest);
  } catch (err) {
    console.error("GET /api/fridge error:", err);
    return NextResponse.json(
      { error: "냉장고 정보를 불러오는 중 서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 재료 등록 API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      familyId,
      userId,
      ingredientName,
      storageType,
    }: {
      familyId: number;
      userId: number;
      ingredientName: string;
      storageType: StorageType;
    } = body;

    if (!familyId || !userId || !ingredientName || !storageType) {
      return NextResponse.json(
        { error: "familyId, userId, ingredientName, storageType가 필요합니다." },
        { status: 400 }
      );
    }

    const memberErrorResponse = await assertFamilyMember(familyId, userId);
    if (memberErrorResponse) return memberErrorResponse;

    // 부모 권한 체크
    const parentErrorResponse = await assertParentRole(familyId, userId);
    if (parentErrorResponse) return parentErrorResponse;

    // 같은 이름 + 보관 위치 재료가 있는지 확인
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("fridge_ingredients")
      .select("ingredient_id, is_active")
      .eq("family_id", familyId)
      .eq("ingredient_name", ingredientName)
      .eq("storage_type", storageType)
      .maybeSingle();

    if (selectError) {
      console.error("재료 조회 에러:", selectError);
      return NextResponse.json(
        { error: `재료 조회 실패: ${selectError.message}` },
        { status: 500 }
      );
    }

    if (existing) {
      // 이미 있는 재료면 is_active만 true로 변경
      if (existing.is_active === false) {
        const { error: updateError } = await supabaseAdmin
          .from("fridge_ingredients")
          .update({ is_active: true })
          .eq("ingredient_id", existing.ingredient_id);

        if (updateError) {
          console.error("재료 재활성화 에러:", updateError);
          return NextResponse.json(
            { error: `재료 재활성화 실패: ${updateError.message}` },
            { status: 500 }
          );
        }
      }
    } else {
      // 없으면 새로 추가
      const { error: insertError } = await supabaseAdmin
        .from("fridge_ingredients")
        .insert({
          family_id: familyId,
          ingredient_name: ingredientName,
          storage_type: storageType,
          created_by: userId,
        });

      if (insertError) {
        console.error("재료 추가 에러:", insertError);
        return NextResponse.json(
          { error: `재료 추가 실패: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    const { error, ...rest } = await getFridgeState(familyId);
    if (error) return error;

    return NextResponse.json(rest);
  } catch (err) {
    console.error("POST /api/fridge error:", err);
    return NextResponse.json(
      { error: "재료를 추가하는 중 서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 4. 재료 삭제 API
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const {
      familyId,
      userId,
      ingredientName,
      storageType,
    }: {
      familyId: number;
      userId: number;
      ingredientName: string;
      storageType: StorageType;
    } = body;

    if (!familyId || !userId || !ingredientName || !storageType) {
      return NextResponse.json(
        { error: "familyId, userId, ingredientName, storageType가 필요합니다." },
        { status: 400 }
      );
    }

    const memberErrorResponse = await assertFamilyMember(familyId, userId);
    if (memberErrorResponse) return memberErrorResponse;

    // 부모 권한 체크
    const parentErrorResponse = await assertParentRole(familyId, userId);
    if (parentErrorResponse) return parentErrorResponse;

    const { error: updateError } = await supabaseAdmin
      .from("fridge_ingredients")
      .update({ is_active: false })
      .eq("family_id", familyId)
      .eq("ingredient_name", ingredientName)
      .eq("storage_type", storageType)
      .eq("is_active", true);

    if (updateError) {
      console.error("재료 비활성화 에러:", updateError);
      return NextResponse.json(
        { error: `재료 삭제 실패: ${updateError.message}` },
        { status: 500 }
      );
    }

    const { error, ...rest } = await getFridgeState(familyId);
    if (error) return error;

    return NextResponse.json(rest);
  } catch (err) {
    console.error("DELETE /api/fridge error:", err);
    return NextResponse.json(
      { error: "재료를 삭제하는 중 서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 5. 재료 수정 API
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      familyId,
      userId,
      ingredientId,
      ingredientName,
      storageType,
    }: {
      familyId: number;
      userId: number;
      ingredientId: number;
      ingredientName?: string;
      storageType?: StorageType;
    } = body;

    if (!familyId || !userId || !ingredientId) {
      return NextResponse.json(
        { error: "familyId, userId, ingredientId가 필요합니다." },
        { status: 400 }
      );
    }

    if (!ingredientName && !storageType) {
      return NextResponse.json(
        { error: "ingredientName 또는 storageType 중 하나는 필수입니다." },
        { status: 400 }
      );
    }

    const memberErrorResponse = await assertFamilyMember(familyId, userId);
    if (memberErrorResponse) return memberErrorResponse;

    // 부모 권한 체크
    const parentErrorResponse = await assertParentRole(familyId, userId);
    if (parentErrorResponse) return parentErrorResponse;

    // 기존 재료 확인
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("fridge_ingredients")
      .select("ingredient_id, ingredient_name, storage_type, family_id")
      .eq("ingredient_id", ingredientId)
      .eq("family_id", familyId)
      .eq("is_active", true)
      .maybeSingle();

    if (selectError) {
      console.error("재료 조회 에러:", selectError);
      return NextResponse.json(
        { error: `재료 조회 실패: ${selectError.message}` },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "해당 재료를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정할 데이터 준비
    const updateData: {
      ingredient_name?: string;
      storage_type?: StorageType;
    } = {};

    if (ingredientName !== undefined) {
      updateData.ingredient_name = ingredientName;
    }

    if (storageType !== undefined) {
      updateData.storage_type = storageType;
    }

    // 같은 이름 + 보관 위치 조합이 이미 존재하는지 확인 (현재 재료 제외)
    if (ingredientName || storageType) {
      const checkName = ingredientName || existing.ingredient_name;
      const checkStorage = storageType || existing.storage_type;

      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from("fridge_ingredients")
        .select("ingredient_id")
        .eq("family_id", familyId)
        .eq("ingredient_name", checkName)
        .eq("storage_type", checkStorage)
        .eq("is_active", true)
        .neq("ingredient_id", ingredientId)
        .maybeSingle();

      if (duplicateError) {
        console.error("중복 확인 에러:", duplicateError);
        return NextResponse.json(
          { error: `중복 확인 실패: ${duplicateError.message}` },
          { status: 500 }
        );
      }

      if (duplicate) {
        return NextResponse.json(
          { error: "같은 이름과 보관 위치의 재료가 이미 존재합니다." },
          { status: 400 }
        );
      }
    }

    // 재료 수정
    const { error: updateError } = await supabaseAdmin
      .from("fridge_ingredients")
      .update(updateData)
      .eq("ingredient_id", ingredientId)
      .eq("family_id", familyId);

    if (updateError) {
      console.error("재료 수정 에러:", updateError);
      return NextResponse.json(
        { error: `재료 수정 실패: ${updateError.message}` },
        { status: 500 }
      );
    }

    const { error, ...rest } = await getFridgeState(familyId);
    if (error) return error;

    return NextResponse.json(rest);
  } catch (err) {
    console.error("PUT /api/fridge error:", err);
    return NextResponse.json(
      { error: "재료를 수정하는 중 서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
