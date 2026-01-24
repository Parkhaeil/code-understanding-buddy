// app/family/[familyId]/page.tsx
"use client";

import InviteCodeModal from "../InviteCodeModal";
import MemberEditModal, { FamilyMember } from "../MemberEditModal";
import FamilyLeftSection from "../FamilyLeftSection";
import FamilyRightSection from "../FamilyRightSection";

import AddMenuModal from "../AddMenuModal";

import { useRouter, useParams } from "next/navigation";
import { Users, ArrowLeft, Key, Settings, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

type Role = "PARENT" | "CHILD" | "FOLLOWER";

type SourceType = "HOME" | "EAT_OUT";
type MenuStatus = "POSSIBLE" | "WISH";
type SimpleStorage = "FREEZER" | "FRIDGE" | "ROOM";

type CurrentUser = {
  userId: number;
  email: string;
  nickname: string;
};

interface FamilyHeaderInfo {
  family_id: number;
  family_name: string;
  role: Role;
  member_count: number;
}

function RoleBadge({ role }: { role: Role }) {
  let label = "";
  let className =
    "rounded-2xl px-2.5 py-1 text-[10px] font-semibold flex items-center justify-center";

  if (role === "PARENT") {
    label = "부모";
    className += " bg-[#F2805A] text-white";
  } else if (role === "CHILD") {
    label = "자녀";
    className += " bg-[#86E0B3] text-[#32241B]";
  } else if (role === "FOLLOWER") {
    label = "팔로워";
    className += " bg-[#F5F0EC] text-[#847062]";
  }

  return <div className={className}>{label}</div>;
}

export default function FamilyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const familyIdParam = params?.familyId;

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false); // ⭐ 메뉴 추가 모달

  const [familyInfo, setFamilyInfo] = useState<FamilyHeaderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null); // ⭐ 현재 유저
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    const fetchFamilyInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const storedUser = localStorage.getItem("currentUser");
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        setIsLoggedIn(loggedIn);

        if (!loggedIn || !storedUser) {
          setError("로그인이 필요합니다.");
          router.push("/login");
          return;
        }

        const currentUserParsed = JSON.parse(storedUser);
        setCurrentUser(currentUserParsed); // ⭐ currentUser 저장
        const userId = currentUserParsed.userId;

        const res = await fetch(`/api/families?userId=${userId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          console.error("가족 목록 조회 에러:", data);
          setError(data.error || "가족 정보를 불러오지 못했습니다.");
          return;
        }

        const familyIdNum = Number(familyIdParam);
        const found: FamilyHeaderInfo | undefined = data.find(
          (f: any) => f.family_id === familyIdNum
        );

        if (!found) {
          setError("해당 가족에 대한 접근 권한이 없거나 존재하지 않습니다.");
          return;
        }

        setFamilyInfo(found);
      } catch (err) {
        console.error("가족 정보 조회 오류:", err);
        setError("가족 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyInfo();
  }, [familyIdParam, router]);

  // 가족 구성원 목록 조회
  useEffect(() => {
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    const fetchMembers = async () => {
      try {
        const familyIdNum = Number(familyIdParam);
        if (Number.isNaN(familyIdNum)) return;

        const res = await fetch(`/api/families/role?familyId=${familyIdNum}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          console.error("가족 구성원 조회 에러:", data);
          return;
        }

        if (data.data) {
          setMembers(data.data);
        }
      } catch (err) {
        console.error("가족 구성원 조회 오류:", err);
      }
    };

    fetchMembers();
  }, [familyIdParam]);

  const familyName = familyInfo?.family_name ?? "가족 메뉴판";
  const currentFamilyRole: Role = familyInfo?.role ?? "FOLLOWER";
  const memberCount = familyInfo?.member_count ?? members.length;

  // 날짜 상태 관리 (왼쪽 섹션과 오른쪽 섹션 공유)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  // 역할 변경 핸들러
  const handleChangeRole = async (targetUserId: number, newRole: Role) => {
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
      const res = await fetch("/api/families/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: familyIdNum,
          targetUserId: targetUserId,
          newRole: newRole,
          userId: currentUser.userId,
        }),
      });

      // 응답이 비어있을 수 있으므로 체크
      let data;
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("JSON 파싱 에러:", e, "응답:", text);
          alert("서버 응답을 처리할 수 없습니다.");
          return;
        }
      } else {
        data = {};
      }

      if (!res.ok) {
        console.error("역할 변경 실패:", data);
        alert(data.error || "역할 변경에 실패했습니다.");
        return;
      }

      // 성공 시 로컬 state 업데이트
      setMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, role: newRole } : m))
      );

      // 성공 알림
      const roleLabels: { [key: string]: string } = {
        PARENT: "부모",
        CHILD: "자녀",
        FOLLOWER: "팔로워",
      };
      const targetMember = members.find((m) => m.id === targetUserId);
      alert(`${targetMember?.name || "구성원"}의 역할이 ${roleLabels[newRole]}로 변경되었습니다.`);
    } catch (err) {
      console.error("역할 변경 요청 오류:", err);
      alert("서버 연결 실패");
    }
  };

  // 구성원 제거 핸들러
  const handleKickMember = async (targetUserId: number) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const familyIdNum = Number(familyIdParam);
    if (Number.isNaN(familyIdNum)) {
      alert("유효하지 않은 가족 ID입니다.");
      return;
    }

    const targetMember = members.find((m) => m.id === targetUserId);
    if (!targetMember) {
      alert("구성원을 찾을 수 없습니다.");
      return;
    }

    // 확인 메시지
    if (!confirm(`${targetMember.name}을(를) 가족에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch("/api/families/role", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: familyIdNum,
          targetUserId: targetUserId,
          userId: currentUser.userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("구성원 제거 실패:", data);
        alert(data.error || "구성원 제거에 실패했습니다.");
        return;
      }

      // 성공 시 로컬 state 업데이트
      setMembers((prev) => prev.filter((m) => m.id !== targetUserId));

      // 성공 알림
      alert(`${targetMember.name}이(가) 가족에서 제거되었습니다.`);
    } catch (err) {
      console.error("구성원 제거 요청 오류:", err);
      alert("서버 연결 실패");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("currentUser");
    }
    router.push("/");
  };

  // ⭐ AddMenuModal이 호출할 핸들러
  const handleAddMenuSubmit = async (data: {
    menuName: string;
    sourceType: SourceType;
    status?: MenuStatus;
    selectedIngredients?: { storage: SimpleStorage; name: string }[];
    toBuy?: string[];
  }) => {
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
      // 실제 라우트 위치: app/family/[familyId]/menus/route.ts -> /family/[familyId]/menus
      const res = await fetch(`/family/${familyIdNum}/menus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.userId,
          menuName: data.menuName,
          sourceType: data.sourceType,
          status: data.status ?? "POSSIBLE",
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
      // TODO: FamilyRightSection에서 메뉴 목록 fetch 함수를 분리해뒀다면 여기서 호출
    } catch (err) {
      console.error("메뉴 추가 요청 에러:", err);
      alert("서버 연결 실패");
    }
  };

  return (
    <div className="flex flex-col w-screen min-h-screen bg-[#FCFAF8] text-[#32241B]">
      {/* 헤더 */}
      <div className="flex items-center justify-between w-full h-[72px] gap-4 px-10 bg-[#FFFFFF] border-b border-[#E7E1DA]">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col justify-center">
            <div className="font-bold text-[20px] leading-tight">
              {loading ? "가족 불러오는 중..." : familyName}
            </div>

            <div className="flex items-center gap-2 text-[#847062] mt-1">
              <RoleBadge role={currentFamilyRole} />
              <Users size={15} />
              <div className="text-[12px] font-semibold">
                {memberCount}명
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {currentFamilyRole !== "FOLLOWER" && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-4 py-2 rounded-xl 
                            text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
              >
                <Key size={15} />
                초대코드
              </button>
            )}
            {currentFamilyRole === "PARENT" && (
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-4 py-2 rounded-xl 
                            text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
              >
                <Settings size={15} />
                가족 관리
              </button>
            )}
          </div>

          {/* 로그인 정보 */}
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <div className="leading-4 flex flex-col items-end">
                <div className="text-[10px] text-[#847062]">안녕하세요,</div>
                <div className="text-[14px] font-bold">{(currentUser?.nickname ?? "사용자")}님</div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl border border-[#E9E4DE] bg-[#FCFAF8]
                           transition-all duration-150 transform active:scale-95"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="w-full px-10 mt-4">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px]">
            {error}
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 justify-center items-start w-full px-60 pt-10 pb-20 gap-8">
        <FamilyLeftSection 
          userRole={currentFamilyRole} 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
        <FamilyRightSection 
          userRole={currentFamilyRole} 
          selectedDate={selectedDate}
        />
      </div>

      {/* 초대코드 모달 */}
      <InviteCodeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        familyName={familyName}
        familyId={Number(familyIdParam)}
      />

      {/* 가족 구성원 관리 모달 */}
      <MemberEditModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        familyName={familyName}
        members={members}
        currentUserId={currentUser?.userId}
        onChangeRole={handleChangeRole}
        onKick={handleKickMember}
      />

      {/* ⭐ 메뉴 추가 모달 */}
      <AddMenuModal
        isOpen={isAddMenuOpen}
        onClose={() => setIsAddMenuOpen(false)}
        familyName={familyName}
        simpleMode={false}
        onSubmit={handleAddMenuSubmit}
      />
    </div>
  );
}
