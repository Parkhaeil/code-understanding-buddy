// app/family/FamilyLeftSection.tsx
"use client";

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Plus,
  MoreVertical,
  Heart,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import type { ChangeEvent } from "react";
import AddMenuModal from "./AddMenuModal";
import SelectFamilyModal from "./SelectFamilyModal";

// 로컬 시간 기준으로 날짜 처리 (브라우저의 로컬 시간대 사용)
function formatKoreanDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ===========================
   DB 스키마 기반 타입 & 더미 데이터
   =========================== */

type StorageType = "ROOM" | "FRIDGE" | "FREEZER" | "NEED";

type MenuIngredient = {
  ingredient_id: number;
  ingredient_name: string;
  storage_type: StorageType;
};

type MenuStatus = "POSSIBLE" | "WISH";

type MenuItem = {
  menu_id: number;
  menu_name: string;
  status: MenuStatus;
  author: string;
  roleLabel: string;
  ingredients: MenuIngredient[];
  likes: number;
  isLiked: boolean; // 현재 사용자가 좋아요를 눌렀는지 여부
  sourceType?: "HOME" | "EAT_OUT"; // 집밥/외식 정보
  createdBy: number; // 이 메뉴를 쓴 사용자 id
};


/* ===========================
   메뉴 카드 컴포넌트
   =========================== */

type MenuCardProps = MenuItem & {
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onDecideToday: () => void;
  onToggleLike: (menuId: number, currentIsLiked: boolean) => Promise<void>;
  familyId: number;
  userId: number;
  userRole?: "PARENT" | "CHILD" | "FOLLOWER";
};

function MenuCard({
  menu_id,
  menu_name,
  author,
  roleLabel,
  ingredients,
  likes,
  isLiked: initialIsLiked,
  sourceType,
  onEdit,
  onDelete,
  onCopy,
  onDecideToday,
  onToggleLike,
  familyId,
  userId,
  createdBy,
  userRole,
}: MenuCardProps) {
  const stockedIngredients = ingredients.filter(
    (ing) => ing.storage_type !== "NEED"
  );
  const neededIngredients = ingredients.filter(
    (ing) => ing.storage_type === "NEED"
  );

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 내가 작성자인지 여부
  const isAuthor = userId !== 0 && createdBy !== undefined && userId === createdBy;
  const canDecideToday = userRole === "PARENT";
  const canCopyToMyFamily = userRole === "FOLLOWER";
  const canEditOrDelete = isAuthor;

  // initialIsLiked가 변경되면 상태 업데이트
  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  useEffect(() => {
    setLikeCount(likes);
  }, [likes]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleToggleLike = async () => {
    if (isLikeLoading) return; // 중복 요청 방지

    const nextIsLiked = !isLiked;
    
    // 낙관적 업데이트 (즉시 UI 업데이트)
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : prev - 1));
    setIsLikeLoading(true);

    try {
      await onToggleLike(menu_id, nextIsLiked);
    } catch (err) {
      // 실패 시 롤백
      setIsLiked(!nextIsLiked);
      setLikeCount((prev) => (nextIsLiked ? prev - 1 : prev + 1));
      console.error("좋아요 토글 실패:", err);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleClickMenuAction = (
    action: "edit" | "delete" | "copy" | "today",
  ) => {
    if (action === "edit") onEdit();
    if (action === "delete") onDelete();
    if (action === "copy") onCopy();
    if (action === "today") onDecideToday();
    setIsMenuOpen(false);
  };

  return (
    <div className="w-full max-w-115 bg-[#FFFFFF] border border-[#E7E1DA] rounded-2xl px-4 py-4 flex flex-col gap-3">
      {/* 상단: 메뉴 이름 + 점3개 */}
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

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition"
          >
            <MoreVertical size={16} className="text-[#C2B5A8]" />
          </button>

          {isMenuOpen && (canDecideToday || canCopyToMyFamily || canEditOrDelete) && (
            <div 
              ref={menuRef}
              className="absolute right-0 mt-1 w-40 bg-white border border-[#E7E1DA] rounded-xl shadow-lg text-[12px] text-[#32241B] z-20 overflow-hidden"
            >
              {/* 오늘의 메뉴로 결정: 부모만 */}
              {canDecideToday && (
                <button
                  type="button"
                  onClick={() => handleClickMenuAction("today")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FFF6E9]"
                >
                  오늘의 메뉴로 결정
                </button>
              )}

              {/* 내 가족 메뉴로 추가: 팔로워일 때만 */}
              {canCopyToMyFamily && (
                <button
                  type="button"
                  onClick={() => handleClickMenuAction("copy")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FCFAF8]"
                >
                  내 가족 메뉴로 추가
                </button>
              )}

              {/* 수정 / 삭제: 내가 쓴 메뉴일 때만 */}
              {canEditOrDelete && (
                <>
                  <div className="border-t border-[#F0E6DD]" />
                  <button
                    type="button"
                    onClick={() => handleClickMenuAction("edit")}
                    className="w-full text-left px-3 py-2 hover:bg-[#FCFAF8]"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClickMenuAction("delete")}
                    className="w-full text-left px-3 py-2 hover:bg-[#FFF3F0] text-[#C94F3D]"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 재료 태그 */}
      {stockedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stockedIngredients.map((ing) => (
            <span
              key={ing.ingredient_id}
              className="px-2 py-1 rounded-full border bg-[#FFFFFF] border-[#E7E1DA] text-[10px] font-semibold"
            >
              {ing.ingredient_name}
            </span>
          ))}
        </div>
      )}

      {/* 사야 할 재료 영역 */}
      {neededIngredients.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[12px] text-[#B58A5A] font-semibold">
            사야 할 재료
          </div>
          <div className="flex flex-wrap gap-2">
            {neededIngredients.map((ing) => (
              <span
                key={ing.ingredient_id}
                className="px-2 py-1 rounded-full border border-dashed border-[#F2B8A3] bg-[#FFF5F0] text-[10px] text-[#C36037] font-semibold"
              >
                {ing.ingredient_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-[#EFE6DD]" />
      </div>

      {/* 하트 좋아요 */}
      <button
        type="button"
        onClick={handleToggleLike}
        disabled={isLikeLoading}
        className="flex items-center gap-1 text-[14px] text-[#32241B] w-fit active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Heart
          size={14}
          className={isLiked ? "text-[#E84848]" : "text-[#32241B]"}
          fill={isLiked ? "#E84848" : "none"}
        />
        <span>{likeCount}</span>
      </button>
    </div>
  );
}

/* ===========================
   왼쪽 섹션 본문
   =========================== */

type FamilyLeftSectionProps = {
  userRole?: "PARENT" | "CHILD" | "FOLLOWER";
  selectedDate: Date;
  onDateChange: (date: Date) => void;
};

export default function FamilyLeftSection({ 
  userRole, 
  selectedDate, 
  onDateChange 
}: FamilyLeftSectionProps) {
  const params = useParams();
  const familyIdParam = params?.familyId;
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sortType, setSortType] = useState<"latest" | "popular">("latest");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [isSelectFamilyOpen, setIsSelectFamilyOpen] = useState(false);
  const [copyingMenu, setCopyingMenu] = useState<MenuItem | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<{
    family_id: number;
    family_name: string;
  } | null>(null);

  // ✅ 메뉴를 state로 관리
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);

  // ✅ 가족 목록 state
  const [families, setFamilies] = useState<{
    family_id: number;
    family_name: string;
    role: "PARENT" | "CHILD" | "FOLLOWER";
    member_count: number;
  }[]>([]);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(false);

  // 현재 가족 정보
  const currentFamily = families.find(
    (f) => f.family_id === Number(familyIdParam)
  );

  // 현재 사용자 정보 가져오기
  const getCurrentUser = () => {
    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("currentUser")
        : null;
    const isLoggedIn =
      typeof window !== "undefined" &&
      localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn || !storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as {
        userId: number;
        email: string;
        nickname: string;
      };
    } catch (e) {
      console.error("currentUser 파싱 에러:", e);
      return null;
    }
  };

  // 메뉴 목록 조회 함수 (날짜 파라미터 추가)
  const fetchMenus = useCallback(async (targetDate: Date) => {
    if (!familyIdParam) return;

    const familyIdNum = Number(familyIdParam);
    if (Number.isNaN(familyIdNum)) {
      console.error("유효하지 않은 가족 ID입니다.");
      setIsLoadingMenus(false);
      return;
    }

    const currentUser = getCurrentUser();
    const userId = currentUser?.userId;

    try {
      setIsLoadingMenus(true);
      
      // 날짜 파라미터 생성 (YYYY-MM-DD 형식)
      const dateStr = formatInputDate(targetDate);
      
      // userId가 있으면 쿼리 파라미터에 추가
      const url = userId
        ? `/family/${familyIdNum}/menus?date=${dateStr}&userId=${userId}`
        : `/family/${familyIdNum}/menus?date=${dateStr}`;
      
      const res = await fetch(url);
      const json = await res.json();

      console.log("menus 응답:", json);

      if (!res.ok) {
        console.error("메뉴 조회 실패:", json);
        alert(json.error || "메뉴 조회 실패");
        setIsLoadingMenus(false);
        return;
      }

      setMenus(json || []);
    } catch (err) {
      console.error("메뉴 조회 요청 에러:", err);
      alert("서버 연결 실패");
    } finally {
      setIsLoadingMenus(false);
    }
  }, [familyIdParam]);

  // 컴포넌트 마운트 시 및 familyIdParam 변경 시 메뉴 목록 조회
  useEffect(() => {
    if (familyIdParam) {
      fetchMenus(selectedDate);
    }
  }, [familyIdParam, fetchMenus]);

  // selectedDate 변경 시 메뉴 목록 조회
  useEffect(() => {
    if (familyIdParam) {
      fetchMenus(selectedDate);
    }
  }, [selectedDate, familyIdParam, fetchMenus]);

  // 메뉴 수정 함수
  const handleUpdateMenuToServer = async (
    menuId: number,
    data: {
      menuName: string;
      sourceType: "HOME" | "EAT_OUT";
      selectedIngredients?: { storage: StorageType; name: string }[];
      toBuy?: string[];
    }
  ) => {
    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다. 상단 페이지에서 다시 진입해주세요.");
      return;
    }

    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("currentUser")
        : null;
    const isLoggedIn =
      typeof window !== "undefined" &&
      localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn || !storedUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    let currentUser: { userId: number; email: string; nickname: string };
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.error("currentUser 파싱 에러:", e);
      alert("로그인 정보를 불러오는 중 오류가 발생했습니다.");
      return;
    }

    const familyIdNum = typeof familyIdParam === "string" ? Number(familyIdParam) : familyIdParam;
    if (Number.isNaN(familyIdNum)) {
      alert("유효하지 않은 가족 ID입니다.");
      return;
    }

    try {
      const res = await fetch(`/family/${familyIdNum}/menus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId,
          userId: currentUser.userId,
          menuName: data.menuName,
          sourceType: data.sourceType,
          selectedIngredients: data.selectedIngredients ?? [],
          toBuy: data.toBuy ?? [],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("메뉴 수정 실패:", json);
        alert(json.error || "메뉴 수정 실패");
        return;
      }

      console.log("메뉴 수정 성공:", json);

      // 메뉴 수정 후 목록 새로고침 (현재 선택된 날짜 기준)
      await fetchMenus(selectedDate);
    } catch (err) {
      console.error("메뉴 수정 요청 에러:", err);
      alert("서버 연결 실패");
    }
  };

  const handleAddMenuToServer = async (data: {
    menuName: string;
    sourceType: "HOME" | "EAT_OUT";
    // status는 백엔드에서 역할에 따라 자동 설정됨
    selectedIngredients?: { storage: StorageType; name: string }[];
    toBuy?: string[];
  }) => {
    // 선택한 가족이 있으면 그 가족의 ID 사용, 없으면 현재 접속한 가족 ID 사용
    const targetFamilyId = selectedFamily?.family_id || familyIdParam;
    
    if (!targetFamilyId) {
      alert("가족 ID를 찾을 수 없습니다. 상단 페이지에서 다시 진입해주세요.");
      return;
    }

    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("currentUser")
        : null;
    const isLoggedIn =
      typeof window !== "undefined" &&
      localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn || !storedUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    let currentUser: { userId: number; email: string; nickname: string };
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.error("currentUser 파싱 에러:", e);
      alert("로그인 정보를 불러오는 중 오류가 발생했습니다.");
      return;
    }

    const familyIdNum = typeof targetFamilyId === "string" ? Number(targetFamilyId) : targetFamilyId;
    if (Number.isNaN(familyIdNum)) {
      alert("유효하지 않은 가족 ID입니다.");
      return;
    }

    try {
      // 실제 라우트 위치: app/family/[familyId]/menus/route.ts -> /family/[familyId]/menus
      // 선택한 가족의 ID로 메뉴 추가 (역할은 해당 가족에서의 역할로 자동 설정됨)
      const res = await fetch(`/family/${familyIdNum}/menus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.userId,
          menuName: data.menuName,
          sourceType: data.sourceType,
          // status는 백엔드에서 선택한 가족에서의 역할에 따라 자동 설정됨 (전달하지 않음)
          selectedIngredients: data.selectedIngredients ?? [],
          toBuy: data.toBuy ?? [],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("메뉴 추가 실패:", json);
        alert(json.error || "메뉴 추가 실패");
        return;
      }

      console.log("메뉴 추가 성공:", json);

      // 메뉴 추가 후 목록 새로고침 (현재 선택된 날짜 기준)
      await fetchMenus(selectedDate);
    } catch (err) {
      console.error("메뉴 추가 요청 에러:", err);
      alert("서버 연결 실패");
    }
  };

  // 가족 목록 조회 함수
  const fetchFamilies = useCallback(async () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.log("로그인되지 않은 사용자 - 가족 목록 조회 불가");
      setFamilies([]);
      return;
    }

    try {
      setIsLoadingFamilies(true);
      const res = await fetch(`/api/families?userId=${currentUser.userId}`);
      const json = await res.json();

      if (!res.ok) {
        console.error("가족 목록 조회 실패:", json);
        setFamilies([]);
        return;
      }

      // API 응답 형식에 맞게 변환
      const formattedFamilies = json.map((f: any) => ({
        family_id: f.family_id,
        family_name: f.family_name,
        role: f.role as "PARENT" | "CHILD" | "FOLLOWER",
        member_count: f.member_count || 0,
      }));

      setFamilies(formattedFamilies);
    } catch (err) {
      console.error("가족 목록 조회 요청 에러:", err);
      setFamilies([]);
    } finally {
      setIsLoadingFamilies(false);
    }
  }, []);

  // 컴포넌트 마운트 시 가족 목록 조회
  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    onDateChange(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    onDateChange(d);
  };

  const handleToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    onDateChange(now);
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month, day] = e.target.value.split("-").map(Number);
    // 로컬 시간 기준으로 날짜 생성
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    onDateChange(d);
    setIsCalendarOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // 로컬 시간 기준 오늘 00:00:00

  const getDateLabel = (target: Date) => {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (isSameDate(target, today)) return "오늘";
    if (isSameDate(target, yesterday)) return "어제";
    if (isSameDate(target, tomorrow)) return "내일";
    return `${target.getDate()}일`;
  };

  const sortMenus = (list: MenuItem[]) => {
    if (sortType === "latest") {
      return [...list].sort((a, b) => b.menu_id - a.menu_id);
    }
    if (sortType === "popular") {
      return [...list].sort((a, b) => b.likes - a.likes);
    }
    return list;
  };

  const possibleMenus = sortMenus(
    menus.filter((m) => m.status === "POSSIBLE"),
  );
  const wishMenus = sortMenus(menus.filter((m) => m.status === "WISH"));

  // 오늘의 메뉴로 결정
  const handleDecideToday = async (menu: MenuItem) => {
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

      const res = await fetch("/api/todays_menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyId: familyIdNum,
          menuId: menu.menu_id,
          userId: userId,
          // targetDate는 선택사항, 없으면 오늘 날짜 사용
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("오늘의 메뉴 등록 실패:", data);
        alert(data.error || "오늘의 메뉴 등록에 실패했습니다.");
        return;
      }

      alert(`'${menu.menu_name}'을(를) 오늘의 메뉴로 결정했어요!`);
      
      // 페이지 새로고침하여 오른쪽 섹션의 오늘의 메뉴도 업데이트
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      console.error("오늘의 메뉴 등록 중 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 좋아요 토글 함수
  const handleToggleLike = async (menuId: number, isLiked: boolean) => {
    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다.");
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const familyIdNum = Number(familyIdParam);
    if (Number.isNaN(familyIdNum)) {
      alert("유효하지 않은 가족 ID입니다.");
      return;
    }

    try {
      const res = await fetch(`/family/${familyIdNum}/menus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId,
          userId: currentUser.userId,
          isLiked,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("좋아요 토글 실패:", json);
        throw new Error(json.error || "좋아요 토글 실패");
      }

      // 성공 시 메뉴 목록 새로고침하여 좋아요 수 업데이트
      await fetchMenus(selectedDate);
    } catch (err) {
      console.error("좋아요 토글 요청 에러:", err);
      throw err; // 호출한 곳에서 처리하도록 에러 전달
    }
  };

  // 메뉴 삭제
  const handleDeleteMenu = async (menuId: number) => {
    if (!familyIdParam) {
      alert("가족 ID를 찾을 수 없습니다.");
      return;
    }

    const familyIdNum = Number(familyIdParam);
    if (Number.isNaN(familyIdNum)) {
      alert("유효하지 않은 가족 ID입니다.");
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 삭제 확인
    const menuToDelete = menus.find((m) => m.menu_id === menuId);
    const confirmMessage = menuToDelete
      ? `'${menuToDelete.menu_name}' 메뉴를 정말 삭제하시겠습니까?\n\n이 메뉴가 오늘의 메뉴로 설정되어 있다면, 삭제 후 오늘의 메뉴는 미정으로 변경됩니다. 괜찮으신가요?`
      : "이 메뉴를 정말 삭제하시겠습니까?\n\n이 메뉴가 오늘의 메뉴로 설정되어 있다면, 삭제 후 오늘의 메뉴는 미정으로 변경됩니다. 괜찮으신가요?";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch(
        `/family/${familyIdNum}/menus?menuId=${menuId}&userId=${currentUser.userId}`,
        {
          method: "DELETE",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        console.error("메뉴 삭제 실패:", json);
        alert(json.error || "메뉴 삭제 실패");
        return;
      }

      console.log("메뉴 삭제 성공:", json);

      // 삭제 후 목록 새로고침 (현재 선택된 날짜 기준)
      await fetchMenus(selectedDate);
    } catch (err) {
      console.error("메뉴 삭제 요청 에러:", err);
      alert("서버 연결 실패");
    }
  };

  // 메뉴 복사 - 가족 선택 모달 먼저 띄우기
  const handleCopyMenu = (menu: MenuItem) => {
    setEditingMenu(null);
    setCopyingMenu(menu);
    setIsSelectFamilyOpen(true);
  };

  // 가족 선택 후 AddMenuModal 띄우기
  const handleSelectFamily = (family: {
    family_id: number;
    family_name: string;
    role: "PARENT" | "CHILD" | "FOLLOWER";
    member_count: number;
  }) => {
    setEditingMenu(null);
    setSelectedFamily(family);
    setIsSelectFamilyOpen(false);
    // copyingMenu가 있으면 메뉴 이름이 자동으로 채워지도록 모달 열기
    setIsAddMenuOpen(true);
  };

  // 메뉴 수정
  const handleEditMenu = (menu: MenuItem) => {
    // MenuItem을 그대로 전달 (AddMenuModal에서 필요한 필드만 사용)
    setEditingMenu(menu);
    setIsAddMenuOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddMenuOpen(false);
    setEditingMenu(null);
    setCopyingMenu(null);
    setSelectedFamily(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 날짜 박스 */}
      <div className="flex justify-between items-center w-230 px-8 py-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA]">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col justify-center items-center leading-6">
            <div className="text-[20px] font-bold">
              {getDateLabel(selectedDate)}
            </div>
            <div className="text-[12px]">
              {formatKoreanDate(selectedDate)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-2 items-center relative">
          <button
            type="button"
            onClick={handleToday}
            className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-3 py-3 rounded-xl 
                        text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
          >
            오늘
          </button>

          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-3 py-3 rounded-xl 
                        text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
          >
            <Calendar size={20} />
          </button>

          {isCalendarOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-[#E7E1DA] rounded-xl shadow-lg p-3">
              <input
                type="date"
                value={formatInputDate(selectedDate)}
                onChange={handleDateChange}
                className="p-2 border border-[#E7E1DA] rounded-lg text-[12px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 필터 박스 */}
      <div className="flex justify-between items-center w-230 px-8 py-4 rounded-2xl bg-[#FFFFFF] border border-[#E7E1DA]">
        <div className="flex items-center gap-6 text-[14px]">
          <Filter size={20} />
          <button
            type="button"
            onClick={() => setSortType("latest")}
            className={
              sortType === "latest"
                ? "text-[#F2805A] font-bold"
                : "text-[#32241B] hover:opacity-60"
            }
          >
            최신순
          </button>
          <button
            type="button"
            onClick={() => setSortType("popular")}
            className={
              sortType === "popular"
                ? "text-[#F2805A] font-bold"
                : "text-[#32241B] hover:opacity-60"
            }
          >
            인기순
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              // FOLLOWER는 메뉴 추가 불가
              if (userRole === "FOLLOWER") {
                alert("팔로워는 메뉴를 추가할 수 없습니다.");
                return;
              }
              setEditingMenu(null);
              setIsAddMenuOpen(true);
            }}
            className="flex gap-1 items-center bg-[#F2805A] text-white px-3 py-3 rounded-xl 
                          text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
          >
            <div className="flex gap-1 items-center">
              <Plus size={20} />
              <div>메뉴 추가</div>
            </div>
          </button>
        </div>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-2 w-230">
        <div className="flex gap-2 items-center">
          <div className="text-[24px]">🍳</div>
          <div className="text-[16px] font-semibold">얘들아, 이거 만들어줄게~</div>
          <div className="text-[12px] text-[#7B1E3D] bg-[#F9DDE6] rounded-2xl px-3 py-0.5">
            {possibleMenus.length}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="text-[24px]">🙏</div>
          <div className="text-[16px] font-semibold">엄마 아빠, 이거 먹고 싶어요!</div>
          <div className="text-[12px] text-[#7B1E3D] bg-[#F9DDE6] rounded-2xl px-3 py-0.5">
            {wishMenus.length}
          </div>
        </div>
      </div>

      {/* 상태별 열 정렬 */}
      {isLoadingMenus ? (
        <div className="flex justify-center items-center py-10 text-[14px] text-[#A28B78]">
          메뉴를 불러오는 중...
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-5 w-230">
        <div className="flex flex-col gap-5">
            {possibleMenus.length === 0 ? (
              <div className="text-[12px] text-[#A28B78] text-center py-4">
                가능한 메뉴가 없습니다
              </div>
            ) : (
              possibleMenus.map((m) => {
                const currentUser = getCurrentUser();
                return (
                  <MenuCard
                    key={m.menu_id}
                    {...m}
                    onEdit={() => handleEditMenu(m)}
                    onDelete={() => handleDeleteMenu(m.menu_id)}
                    onCopy={() => handleCopyMenu(m)}
                    onDecideToday={() => handleDecideToday(m)}
                          onToggleLike={handleToggleLike}
                          familyId={Number(familyIdParam)}
                          userId={currentUser?.userId || 0}
                          userRole={userRole}
                  />
                );
              })
            )}
        </div>

        <div className="flex flex-col gap-5">
            {wishMenus.length === 0 ? (
              <div className="text-[12px] text-[#A28B78] text-center py-4">
                먹고 싶은 메뉴가 없습니다
              </div>
            ) : (
              wishMenus.map((m) => {
                const currentUser = getCurrentUser();
                return (
            <MenuCard
              key={m.menu_id}
              {...m}
              onEdit={() => handleEditMenu(m)}
              onDelete={() => handleDeleteMenu(m.menu_id)}
              onCopy={() => handleCopyMenu(m)}
              onDecideToday={() => handleDecideToday(m)}
                    onToggleLike={handleToggleLike}
                    familyId={Number(familyIdParam)}
                    userId={currentUser?.userId || 0}
                    userRole={userRole}
            />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 가족 선택 모달 */}
      <SelectFamilyModal
        isOpen={isSelectFamilyOpen}
        onClose={() => {
          setIsSelectFamilyOpen(false);
        }}
        families={families}
        onSelectFamily={handleSelectFamily}
        currentFamilyId={familyIdParam ? Number(familyIdParam) : undefined}
      />

      {/* 메뉴 추가/수정 모달 */}
      <AddMenuModal
        isOpen={isAddMenuOpen}
        onClose={handleCloseModal}
        familyName={
          selectedFamily?.family_name || 
          currentFamily?.family_name || 
          "가족 메뉴판"
        }
        familyId={selectedFamily?.family_id || (familyIdParam ? Number(familyIdParam) : undefined)}
        userId={getCurrentUser()?.userId}
        editingMenu={editingMenu}
        sourceMenuName={copyingMenu?.menu_name || ""}
        sourceMenuType={copyingMenu?.sourceType || "HOME"}
        onSubmit={async (data) => {
          if (editingMenu) {
            // 수정 모드: PATCH API 호출
            await handleUpdateMenuToServer(editingMenu.menu_id, data);
          } else {
            // 추가 모드 및 복사 모드는 공통으로 서버에 메뉴 생성
            await handleAddMenuToServer(data);
          }

          handleCloseModal();


          console.log("copyingMenu >>> ", copyingMenu);
          console.log("AddMenuModal sourceMenuName >>> ", copyingMenu?.menu_name);
        }}
      />
    </div>
  );
}