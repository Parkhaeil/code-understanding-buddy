// app/family/FamilyRightSection.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Utensils,
  MoreVertical,
  Heart,
  Snowflake,
  Thermometer,
  Plus,
  Refrigerator,
  Check,
} from "lucide-react";
import StatsModal from "./StatsModal";

type StorageType = "ROOM" | "FRIDGE" | "FREEZER" | "NEED";

type MenuIngredient = {
  ingredient_id: number;
  ingredient_name: string;
  storage_type: StorageType;
};

type MenuStatus = "POSSIBLE" | "WISH";

type TodayMenu = {
  menu_id: number;
  menu_name: string;
  status: MenuStatus;
  author: string;
  roleLabel: string;
  ingredients: MenuIngredient[];
  sourceType?: "HOME" | "EAT_OUT";
};

type TodayMenuCardProps = TodayMenu & {
  onDeleteTodayMenu?: () => void;
  onCopyToFamily?: () => void;
  userRole?: "PARENT" | "CHILD" | "FOLLOWER";
};

// 오늘의 메뉴 더미
const todayMenuDummy: TodayMenu = {
  menu_id: 1,
  menu_name: "김치찌개",
  status: "POSSIBLE",
  author: "이유민",
  roleLabel: "부모",
  ingredients: [
    { ingredient_id: 1, ingredient_name: "김치", storage_type: "FRIDGE" },
    { ingredient_id: 2, ingredient_name: "양파", storage_type: "ROOM" },
    { ingredient_id: 3, ingredient_name: "두부", storage_type: "FRIDGE" },
    { ingredient_id: 4, ingredient_name: "대파", storage_type: "NEED" },
  ],
};

// 재료 태그 컴포넌트
function FridgeTag({
  label,
  deletable,
  onDelete,
  onClick,
}: {
  label: string;
  deletable?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
}) {
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-[#E7E1DA] text-[10px] font-semibold ${
        onClick ? "cursor-pointer hover:bg-[#FCFAF8]" : ""
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      {deletable && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-0.5 text-[9px] text-[#C2B5A8] hover:text-[#A0615A]"
        >
          ×
        </button>
      )}
    </span>
  );
}

function TodayMenuCard({
  menu_id,
  menu_name,
  author,
  roleLabel,
  ingredients,
  sourceType,
  onDeleteTodayMenu,
  onCopyToFamily,
  userRole,
}: TodayMenuCardProps) {
  const stockedIngredients = ingredients.filter(
    (ing) => ing.storage_type !== "NEED"
  );
  const neededIngredients = ingredients.filter(
    (ing) => ing.storage_type === "NEED"
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E7E1DA] rounded-2xl px-4 py-4 flex flex-col gap-3">
      {/* 상단 */}
      <div className="flex items-start justify-between relative">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="text-[14px] font-bold text-[#32241B]">
              {menu_name}
            </div>
            {sourceType && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  sourceType === "HOME"
                    ? "bg-[#FFF2D9] text-[#E0A85A] border border-[#F5D4A8]"
                    : "bg-[#E8F4F8] text-[#4DA3FF] border border-[#B8D9F0]"
                }`}
              >
                {sourceType === "HOME" ? "집밥" : "외식"}
              </span>
            )}
          </div>
          <div className="text-[12px] text-[#A28B78]">
            {author} · {roleLabel}
          </div>
        </div>

        {userRole === "PARENT" && (
          <>
            <button
              type="button"
              onClick={() => setIsMenuOpen((p) => !p)}
              className="p-1 rounded-full hover:bg-[#F5F0EC]"
            >
              <MoreVertical size={16} className="text-[#C2B5A8]" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-[#E7E1DA] rounded-xl shadow-lg text-[12px] z-20 overflow-hidden">
                {onDeleteTodayMenu && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteTodayMenu();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#FCFAF8]"
                  >
                    오늘의 메뉴 삭제
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 재료 */}
      {stockedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stockedIngredients.map((i, idx) => (
            <FridgeTag key={i.ingredient_id || `${i.ingredient_name}-${idx}`} label={i.ingredient_name} />
          ))}
        </div>
      )}

      {/* 사야할 재료 */}
      {neededIngredients.length > 0 && (
        <div>
          <div className="text-[12px] text-[#B58A5A] font-semibold">
            사야 할 재료
          </div>
          <div className="flex flex-wrap gap-2">
            {neededIngredients.map((i, idx) => (
              <span
                key={i.ingredient_id || `${i.ingredient_name}-${idx}`}
                className="px-2 py-1 rounded-full bg-[#FFF5F0] border border-dashed border-[#F2B8A3] text-[10px] text-[#C36037]"
              >
                {i.ingredient_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type SimpleStorage = "FREEZER" | "FRIDGE" | "ROOM";

const storageMeta: Record<
  SimpleStorage,
  { label: string; icon: React.ReactElement; colorClass: string }
> = {
  FREEZER: {
    label: "냉동실",
    icon: <Snowflake size={16} className="text-[#4DA3FF]" />,
    colorClass: "text-[#324055]",
  },
  FRIDGE: {
    label: "냉장실",
    icon: <Refrigerator size={16} className="text-[#40C2A7]" />,
    colorClass: "text-[#324055]",
  },
  ROOM: {
    label: "실온",
    icon: <Thermometer size={16} className="text-[#F07A5A]" />,
    colorClass: "text-[#5A3A29]",
  },
};

type FamilyRightSectionProps = {
  userRole?: "PARENT" | "CHILD" | "FOLLOWER";
  selectedDate: Date;
};

export default function FamilyRightSection({ 
  userRole, 
  selectedDate 
}: FamilyRightSectionProps) {
  const params = useParams();
  const router = useRouter();
  const familyIdParam = params?.familyId;

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  
  // 오늘의 메뉴 상태
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null);
  const [isLoadingTodayMenu, setIsLoadingTodayMenu] = useState(false);

  // 냉장고 아이템 (서버 + 클라이언트 추가)
  type IngredientItem = { id: number; name: string };
  const [freezerItems, setFreezerItems] = useState<IngredientItem[]>([]);
  const [fridgeItems, setFridgeItems] = useState<IngredientItem[]>([]);
  const [roomItems, setRoomItems] = useState<IngredientItem[]>([]);

  // 재료 추가 팝오버 상태
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedStorage, setSelectedStorage] =
    useState<SimpleStorage>("FREEZER");
  const [isStorageDropdownOpen, setIsStorageDropdownOpen] = useState(false);

  // 재료 수정 상태
  const [editingIngredient, setEditingIngredient] = useState<{
    id: number;
    name: string;
    storage: SimpleStorage;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editStorage, setEditStorage] = useState<SimpleStorage>("FREEZER");

  const reloadFridge = async () => {
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    try {
      const storedUser = localStorage.getItem("currentUser");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn || !storedUser) {
        console.warn("로그인 정보가 없어 냉장고를 불러올 수 없습니다.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      const res = await fetch(
        `/api/fridge?familyId=${familyIdNum}&userId=${userId}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("냉장고 조회 에러:", data);
        return;
      }

      setFreezerItems(data.freezer ?? []);
      setFridgeItems(data.fridge ?? []);
      setRoomItems(data.room ?? []);
    } catch (err) {
      console.error("냉장고 정보를 불러오는 중 오류:", err);
    }
  };

  // 오늘의 메뉴 불러오기 (날짜 파라미터 추가)
  const reloadTodayMenu = async (targetDate?: Date) => {
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    try {
      setIsLoadingTodayMenu(true);
      const familyIdNum = Number(familyIdParam);

      // 날짜 파라미터 생성 (YYYY-MM-DD 형식)
      const dateToUse = targetDate || new Date();
      const year = dateToUse.getFullYear();
      const month = String(dateToUse.getMonth() + 1).padStart(2, "0");
      const day = String(dateToUse.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const res = await fetch(
        `/api/todays_menu?familyId=${familyIdNum}&targetDate=${dateStr}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("오늘의 메뉴 조회 에러:", data);
        setTodayMenu(null);
        return;
      }

      // 데이터가 없으면 null로 설정
      if (!data.data) {
        setTodayMenu(null);
        return;
      }

      // API 응답 데이터를 TodayMenu 타입으로 변환
      const apiData = data.data;
      const creatorIsActive = apiData.creator_is_active !== false; // 기본값은 true
      const roleLabel = creatorIsActive 
        ? (apiData.role_label || "팔로워")
        : "탈퇴함";
      
      setTodayMenu({
        menu_id: apiData.menu_id,
        menu_name: apiData.menu_name,
        status: apiData.status || "POSSIBLE",
        author: apiData.creator_nickname || "알 수 없음",
        roleLabel: roleLabel,
        ingredients: apiData.ingredients || [],
        sourceType: apiData.source_type === "EAT_OUT" ? "EAT_OUT" : "HOME",
      });
    } catch (err) {
      console.error("오늘의 메뉴 정보를 불러오는 중 오류:", err);
      setTodayMenu(null);
    } finally {
      setIsLoadingTodayMenu(false);
    }
  };

  // 내 가족 메뉴로 추가 (오늘의 메뉴를 가족 메뉴로 복사)
  const handleCopyTodayMenuToFamily = async () => {
    if (!todayMenu) {
      alert("메뉴 정보를 찾을 수 없습니다.");
      return;
    }

    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다.");
      return;
    }

    if (typeof window === "undefined") return;

    try {
      const storedUser = localStorage.getItem("currentUser");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn || !storedUser) {
        alert("로그인이 필요합니다.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      if (Number.isNaN(familyIdNum)) {
        alert("유효하지 않은 가족 ID입니다.");
        return;
      }

      // 메뉴 추가 API 호출
      const res = await fetch(`/family/${familyIdNum}/menus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          menuName: todayMenu.menu_name,
          sourceType: todayMenu.sourceType || "HOME",
          status: "POSSIBLE",
          selectedIngredients: todayMenu.ingredients
            .filter((ing) => ing.storage_type !== "NEED")
            .map((ing) => ({
              storage: ing.storage_type as "FREEZER" | "FRIDGE" | "ROOM",
              name: ing.ingredient_name,
            })),
          toBuy: todayMenu.ingredients
            .filter((ing) => ing.storage_type === "NEED")
            .map((ing) => ing.ingredient_name),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("메뉴 추가 실패:", data);
        alert(data.error || "메뉴 추가에 실패했습니다.");
        return;
      }

      alert(`'${todayMenu.menu_name}'을(를) 내 가족 메뉴로 추가했어요!`);
    } catch (err) {
      console.error("메뉴 추가 중 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 오늘의 메뉴 삭제
  const handleDeleteTodayMenu = async () => {
    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다.");
      return;
    }

    if (typeof window === "undefined") return;

    if (!confirm("오늘의 메뉴를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const familyIdNum = Number(familyIdParam);
      // 타임존 문제 방지: 로컬 날짜만 사용 (selectedDate 사용)
      const targetDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      const res = await fetch(
        `/api/todays_menu?familyId=${familyIdNum}&targetDate=${targetDate}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("오늘의 메뉴 삭제 실패:", data);
        alert(data.error || "오늘의 메뉴 삭제에 실패했습니다.");
        return;
      }

      alert("오늘의 메뉴가 삭제되었습니다.");
      
      // 오늘의 메뉴 다시 불러오기
      await reloadTodayMenu(selectedDate);
    } catch (err) {
      console.error("오늘의 메뉴 삭제 중 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 가족 탈퇴 핸들러
  const handleQuitFamily = async () => {
    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다.");
      return;
    }

    if (typeof window === "undefined") return;

    const storedUser = localStorage.getItem("currentUser");
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn || !storedUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      if (Number.isNaN(familyIdNum)) {
        alert("유효하지 않은 가족 ID입니다.");
        return;
      }

      // 1단계: 탈퇴 요청 (마지막 부모인지 확인)
      const res = await fetch("/api/families/quit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: familyIdNum,
          userId: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("가족 탈퇴 실패:", data);
        alert(data.error || "가족 탈퇴에 실패했습니다.");
        return;
      }

      // 마지막 부모인 경우 확인 받기
      if (data.isLastParent) {
        const confirmed = confirm(
          "마지막 부모입니다. 탈퇴하시면 가족이 삭제됩니다. 탈퇴하시겠습니까?"
        );

        if (!confirmed) {
          return; // 취소하면 그냥 종료
        }

        // 확인했으면 confirm: true로 다시 요청
        const confirmRes = await fetch("/api/families/quit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyId: familyIdNum,
            userId: userId,
            confirm: true,
          }),
        });

        const confirmData = await confirmRes.json();

        if (!confirmRes.ok) {
          console.error("가족 탈퇴 실패:", confirmData);
          alert(confirmData.error || "가족 탈퇴에 실패했습니다.");
          return;
        }

        alert(confirmData.message || "가족에서 탈퇴했습니다.");
      } else {
        // 마지막 부모가 아니면 바로 탈퇴 완료
        alert(data.message || "가족에서 탈퇴했습니다.");
      }

      // 탈퇴 성공 시 홈으로 이동
      router.push("/");
    } catch (err) {
      console.error("가족 탈퇴 요청 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 초기 냉장고 데이터 로딩 + 오늘의 메뉴 로딩
  useEffect(() => {
    reloadFridge();
    reloadTodayMenu(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyIdParam, selectedDate]);

  const handleAddIngredient = async () => {
    const name = newName.trim();
    if (!name) return;

    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    try {
      const storedUser = localStorage.getItem("currentUser");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn || !storedUser) {
        console.warn("로그인 정보가 없어 재료를 추가할 수 없습니다.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      const res = await fetch("/api/fridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyId: familyIdNum,
          userId,
          ingredientName: name,
          storageType: selectedStorage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("재료 추가 에러:", data);
        alert(data.error || "재료 추가에 실패했습니다.");
        return;
      }

      setFreezerItems(data.freezer ?? []);
      setFridgeItems(data.fridge ?? []);
      setRoomItems(data.room ?? []);
      alert("재료가 추가되었습니다.");
    } catch (err) {
      console.error("재료 추가 중 오류:", err);
      alert("서버 연결 실패");
    }

    setNewName("");
    setSelectedStorage("FREEZER");
    setIsStorageDropdownOpen(false);
    setIsAddOpen(false);
  };

  const handleDeleteIngredient = async (
    storage: SimpleStorage,
    name: string
  ) => {
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    if (!confirm(`${name}을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const storedUser = localStorage.getItem("currentUser");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn || !storedUser) {
        alert("로그인이 필요합니다.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      const res = await fetch("/api/fridge", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyId: familyIdNum,
          userId,
          ingredientName: name,
          storageType: storage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("재료 삭제 에러:", data);
        alert(data.error || "재료 삭제에 실패했습니다.");
        return;
      }

      setFreezerItems(data.freezer ?? []);
      setFridgeItems(data.fridge ?? []);
      setRoomItems(data.room ?? []);
      alert("재료가 삭제되었습니다.");
    } catch (err) {
      console.error("재료 삭제 중 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 재료 수정 핸들러
  const handleEditIngredient = (ingredient: IngredientItem, storage: SimpleStorage) => {
    if (userRole !== "PARENT") return;
    setEditingIngredient({ id: ingredient.id, name: ingredient.name, storage });
    setEditName(ingredient.name);
    setEditStorage(storage);
    setIsAddOpen(false);
  };

  const handleSaveEditIngredient = async () => {
    if (!editingIngredient) return;
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      alert("재료 이름을 입력해주세요.");
      return;
    }

    try {
      const storedUser = localStorage.getItem("currentUser");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn || !storedUser) {
        alert("로그인이 필요합니다.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;
      const familyIdNum = Number(familyIdParam);

      const updateData: {
        familyId: number;
        userId: number;
        ingredientId: number;
        ingredientName?: string;
        storageType?: SimpleStorage;
      } = {
        familyId: familyIdNum,
        userId,
        ingredientId: editingIngredient.id,
      };

      if (trimmedName !== editingIngredient.name) {
        updateData.ingredientName = trimmedName;
      }
      if (editStorage !== editingIngredient.storage) {
        updateData.storageType = editStorage;
      }

      // 변경사항이 없으면 그냥 닫기
      if (!updateData.ingredientName && !updateData.storageType) {
        setEditingIngredient(null);
        return;
      }

      const res = await fetch("/api/fridge", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("재료 수정 에러:", data);
        alert(data.error || "재료 수정에 실패했습니다.");
        return;
      }

      setFreezerItems(data.freezer ?? []);
      setFridgeItems(data.fridge ?? []);
      setRoomItems(data.room ?? []);
      setEditingIngredient(null);
      alert("재료가 수정되었습니다.");
    } catch (err) {
      console.error("재료 수정 중 오류:", err);
      alert("서버 연결 실패");
    }
  };

  const handleCancelEdit = () => {
    setEditingIngredient(null);
    setEditName("");
    setEditStorage("FREEZER");
  };

  const currentMeta = storageMeta[selectedStorage];
  const isAddValid = newName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 통계 박스 */}
      <div className="w-[320px] p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA] flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#F2805A]" />
            <div className="text-[14px] font-bold text-[#32241B]">
              통계 보러가기
            </div>
          </div>

          <div className="text-[10px] text-[#847062]">
            여러가지 통계 정보를 확인할 수 있어요.
          </div>
        </div>

        <button
          onClick={() => setIsStatsModalOpen(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F2805A] text-white text-[12px] font-semibold"
        >
          통계 열기
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 오늘의 메뉴 */}
      <div className="w-[320px] p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA] flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-[#F2805A]" />
          <div className="text-[14px] font-bold">오늘의 메뉴</div>
        </div>

        {isLoadingTodayMenu ? (
          <div className="text-[12px] text-[#847062] text-center py-4">
            불러오는 중...
          </div>
        ) : todayMenu ? (
          <TodayMenuCard
            {...todayMenu}
            onDeleteTodayMenu={handleDeleteTodayMenu}
            onCopyToFamily={handleCopyTodayMenuToFamily}
            userRole={userRole}
          />
        ) : (
          <div className="text-[12px] text-[#847062] text-center py-4">
            오늘의 메뉴가 선택되지 않았습니다.
          </div>
        )}
      </div>

      {/* 냉장고 박스 + 재료 추가 팝오버 */}
      <div className="relative w-[320px]">
        {/* 실제 카드 (모서리 클리핑용 overflow-hidden) */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA] flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3 text-[13px] font-semibold text-[#32241B]">
            냉장고
          </div>

          {/* 냉동 + 냉장 */}
          <div className="mx-4 mb-3 rounded-2xl bg-[#F7FBFF] border border-[#E2ECF8] overflow-hidden">
            {/* 냉동실 */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2 relative">
              <div className="flex items-center gap-2">
                <Snowflake size={16} className="text-[#4DA3FF]" />
                <div className="text-[12px] font-semibold text-[#324055]">
                  냉동실
                </div>
              </div>

              {/* 파란 세로선 */}
              <div className="absolute right-4 top-7 w-[3px] h-8 rounded-full bg-[#7EB4FF]" />
            </div>

            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {freezerItems.length === 0 ? (
                <span className="text-[11px] text-[#8493A8]">
                  아직 등록된 재료가 없어요.
                </span>
              ) : (
                freezerItems.map((item) => (
                  <FridgeTag
                    key={item.id}
                    label={item.name}
                    deletable={userRole === "PARENT"}
                    onDelete={userRole === "PARENT" ? () => handleDeleteIngredient("FREEZER", item.name) : undefined}
                    onClick={userRole === "PARENT" ? () => handleEditIngredient(item, "FREEZER") : undefined}
                  />
                ))
              )}
            </div>

            <div className="h-[1px] w-full bg-[#E3EFFB]" />

            {/* 냉장실 */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2 relative">
              <div className="flex items-center gap-2">
                <Refrigerator size={16} className="text-[#40C2A7]" />
                <div className="text-[12px] font-semibold text-[#324055]">
                  냉장실
                </div>
              </div>

              {/* 파란 세로선 */}
              <div className="absolute right-4 top-3 w-[3px] h-12 rounded-full bg-[#7EB4FF]" />
            </div>

            <div className="px-4 pb-4 flex flex-wrap gap-1.5">
              {fridgeItems.length === 0 ? (
                <span className="text-[11px] text-[#8493A8]">
                  아직 등록된 재료가 없어요.
                </span>
              ) : (
                fridgeItems.map((item) => (
                  <FridgeTag
                    key={item.id}
                    label={item.name}
                    deletable={userRole === "PARENT"}
                    onDelete={userRole === "PARENT" ? () => handleDeleteIngredient("FRIDGE", item.name) : undefined}
                    onClick={userRole === "PARENT" ? () => handleEditIngredient(item, "FRIDGE") : undefined}
                  />
                ))
              )}
            </div>
          </div>

          {/* 실온 (세로선 없음) */}
          <div className="mx-4 mb-2 rounded-2xl bg-[#FFFBF7] border border-[#F1E0CC] mb-4">
            <div className="flex items-start justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Thermometer size={16} className="text-[#F07A5A]" />
                <div className="text-[12px] font-semibold text-[#5A3A29]">
                  실온
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 flex flex-wrap gap-1.5">
              {roomItems.length === 0 ? (
                <span className="text-[11px] text-[#B29B82]">
                  아직 등록된 재료가 없어요.
                </span>
              ) : (
                roomItems.map((item) => (
                  <FridgeTag
                    key={item.id}
                    label={item.name}
                    deletable={userRole === "PARENT"}
                    onDelete={userRole === "PARENT" ? () => handleDeleteIngredient("ROOM", item.name) : undefined}
                    onClick={userRole === "PARENT" ? () => handleEditIngredient(item, "ROOM") : undefined}
                  />
                ))
              )}
            </div>
          </div>

          {/* 재료 추가 버튼 (부모만 보임) */}
          {userRole === "PARENT" && (
            <button
              className="flex items-center justify-center gap-1 border-t border-[#E7E1DA] py-3 text-[12px] hover:bg-[#FCFAF8]"
              type="button"
              onClick={() => setIsAddOpen((p) => !p)}
            >
              <Plus size={16} className="text-[#32241B]" />
              재료 추가
            </button>
          )}
        </div>

        {/* 재료 수정 팝오버 */}
        {editingIngredient && (
          <div className="absolute top-4/5 right-full -translate-y-1/2 mr-4 w-[260px] rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA] shadow-xl px-5 py-4 z-30">
            <div className="text-[12px] font-semibold text-[#32241B] mb-3">
              재료 수정
            </div>
            
            {/* 입력 필드 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 rounded-full border border-[#E7E1DA] bg-white px-4 py-2 text-[12px] text-[#32241B]">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="재료 이름"
                  className="w-full outline-none text-[12px] text-[#32241B] placeholder:text-[#C2B5A8] bg-transparent"
                />
              </div>

              {/* 저장 위치 드롭다운 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsStorageDropdownOpen((prev) => !prev)
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#E7E1DA] bg-white text-[12px] font-semibold min-w-[80px]"
                >
                  {storageMeta[editStorage].icon}
                  <span className={storageMeta[editStorage].colorClass}>
                    {storageMeta[editStorage].label}
                  </span>
                </button>

                {isStorageDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-[#E7E1DA] bg-white shadow-lg overflow-hidden z-40">
                    {(Object.keys(storageMeta) as SimpleStorage[]).map(
                      (key) => {
                        const meta = storageMeta[key];
                        const isActive = editStorage === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setEditStorage(key);
                              setIsStorageDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 ${
                              isActive
                                ? "bg-[#FFF2D9]"
                                : "bg-white hover:bg-[#FCFAF8]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {meta.icon}
                              <span className={meta.colorClass}>
                                {meta.label}
                              </span>
                            </div>
                            {isActive && (
                              <Check size={14} className="text-[#E0A85A]" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 rounded-2xl border border-[#E7E1DA] bg-[#FFFFFF] py-2 text-[12px] font-semibold text-[#32241B] hover:bg-[#FCFAF8]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEditIngredient}
                disabled={!editName.trim()}
                className={`flex-1 rounded-2xl py-2 text-[12px] font-semibold text-white transition
                  ${
                    editName.trim()
                      ? "bg-[#F2805A] hover:brightness-95 cursor-pointer"
                      : "bg-[#F8BEAA] cursor-not-allowed"
                  }`}
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* 재료 추가 팝오버 - 카드 왼쪽에 표시 */}
        {isAddOpen && !editingIngredient && (
          <div className="absolute top-4/5 right-full -translate-y-1/2 mr-4 w-[260px] rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA] shadow-xl px-5 py-4 z-30">
            {/* 입력 필드 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 rounded-full border border-[#E7E1DA] bg-white px-4 py-2 text-[12px] text-[#32241B]">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="재료 이름"
                  className="w-full outline-none text-[12px] text-[#32241B] placeholder:text-[#C2B5A8] bg-transparent"
                />
              </div>

              {/* 저장 위치 드롭다운 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsStorageDropdownOpen((prev) => !prev)
                  }
                  className="flex items-center gap-2 rounded-full border border-[#E7E1DA] bg-[#FFF9F0] px-3 py-2 text-[11px] font-semibold text-[#32241B]"
                >
                  {currentMeta.icon}
                  <span className={currentMeta.colorClass}>
                    {currentMeta.label}
                  </span>
                </button>

                {isStorageDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-32 rounded-2xl bg-white border border-[#E7E1DA] shadow-lg py-1 text-[12px]">
                    {(["FREEZER", "FRIDGE", "ROOM"] as SimpleStorage[]).map(
                      (key) => {
                        const meta = storageMeta[key];
                        const isActive = key === selectedStorage;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSelectedStorage(key);
                              setIsStorageDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 ${
                              isActive
                                ? "bg-[#FFF2D9]"
                                : "bg-white hover:bg-[#FCFAF8]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {meta.icon}
                              <span className={meta.colorClass}>
                                {meta.label}
                              </span>
                            </div>
                            {isActive && (
                              <Check size={14} className="text-[#E0A85A]" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setNewName("");
                  setSelectedStorage("FREEZER");
                  setIsStorageDropdownOpen(false);
                }}
                className="flex-1 rounded-2xl border border-[#E7E1DA] bg-[#FFFFFF] py-2 text-[12px] font-semibold text-[#32241B] hover:bg-[#FCFAF8]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={!isAddValid}
                className={`flex-1 rounded-2xl py-2 text-[12px] font-semibold text-white transition
                  ${
                    isAddValid
                      ? "bg-[#F2805A] hover:brightness-95 cursor-pointer"
                      : "bg-[#F8BEAA] cursor-not-allowed"
                  }`}
              >
                추가
              </button>
            </div>
          </div>
        )}
        {/* 가족 탈퇴하기 버튼 */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleQuitFamily}
            className="text-[12px] text-red-500 underline bg-transparent border-none outline-none"
          >
            가족 탈퇴하기
          </button>
        </div>
      </div>

      {/* 통계 모달 */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />
    </div>
  );
}