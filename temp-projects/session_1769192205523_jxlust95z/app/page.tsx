// app/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { UtensilsCrossed, LogOut, Users, Plus, Key } from "lucide-react";
import CreateFamilyModal from "./home/CreateFamilyModal";
import InviteCodeModal from "./home/InviteCodeModal";
import InviteCodeDisplayModal from "./family/InviteCodeModal";

type FamilyCard = {
  family_id: number;
  family_name: string;
  role: "PARENT" | "CHILD" | "FOLLOWER";
  member_count: number;
  today_menu: string | null;
};

type CurrentUser = {
  userId: number;
  email: string;
  nickname: string;
};

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [families, setFamilies] = useState<FamilyCard[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviteCodeDisplayModalOpen, setIsInviteCodeDisplayModalOpen] = useState(false);
  const [createdFamilyName, setCreatedFamilyName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");

   // 🔹 첫 진입 시 localStorage 보고 로그인 상태 & 유저 복원 + 가족 목록 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);

    const storedUser = localStorage.getItem("currentUser");

    console.log("Home useEffect 실행");
    console.log("localStorage.isLoggedIn =", loggedIn);
    console.log("localStorage.currentUser =", storedUser);

    if (loggedIn && storedUser) {
      try {
        const parsed: CurrentUser = JSON.parse(storedUser);
        setCurrentUser(parsed);

        // 로그인 + 유저 정보 있으면 가족 목록 불러오기
        fetchFamilies(parsed.userId);
      } catch (e) {
        console.error("currentUser 파싱 에러:", e);
      }
    }
  }, []);


  const fetchFamilies = async (userId: number) => {
    try {
      setLoadingFamilies(true);
      const res = await fetch(`/api/families?userId=${userId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("가족 목록 에러:", data);
        return;
      }

      setFamilies(data);
    } catch (error) {
      console.error("가족 목록 불러오기 실패:", error);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFamilies([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn");
       localStorage.removeItem("currentUser");
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FCFAF8] text-[#32241B]">
      {/* 헤더 */}
      <div className="flex items-center justify-between w-full h-18 gap-4 px-10 bg-[#FFFFFF] border-b border-[#E7E1DA]">
        {/* 로고 */}
        <div className="flex gap-3 items-center">
          <UtensilsCrossed className="scale-130 text-[#F2805A]" />
          <div className="font-bold text-[24px]">WantToEat</div>
        </div>

        {/* 로그인 상태별 UI */}
        <div className="flex items-center gap-3">
          {!isLoggedIn && (
            <button
              onClick={() => router.push("/login")}
              className="bg-[#FCFAF8] border border-[#E9E4DE] px-4 py-2 rounded-xl 
                         text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
            >
              로그인 / 회원가입
            </button>
          )}

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

      {/* 메인 콘텐츠 */}
      <div className="flex flex-col w-full px-40 py-10 gap-8">
        {/* 인삿말 */}
        <div>
          <div className="font-bold text-[30px]">환영합니다! 👋</div>
          <div className="text-[#847062] text-[14px]">
            가족들과 함께 오늘의 메뉴를 정해보세요!
          </div>
        </div>

        {/* 내 가족 목록 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-[#F2805A]" />
            <div className="font-bold">내 가족 목록</div>
          </div>

          {isLoggedIn ? (
            <div className="flex gap-6">
              {loadingFamilies && (
                <div className="text-[12px] text-[#847062]">가족 목록 불러오는 중...</div>
              )}

              {!loadingFamilies && families.length === 0 && (
                <div className="text-[12px] text-[#847062]">
                  아직 참여 중인 가족이 없습니다. 아래에서 가족을 생성하거나 초대 코드를 입력해보세요.
                </div>
              )}

                {!loadingFamilies &&
                families.map((f) => (
                  <div
                    key={f.family_id}
                    className="bg-[#FFFFFF] border border-[#DDDDDD] p-4 rounded-xl w-85"
                  >
                    {/* 제목 + 역할 */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-[18px]">{f.family_name}</div>

                      <div
                        className={`rounded-2xl px-2.5 py-1 text-[10px] font-semibold 
                          ${
                            f.role === "PARENT"
                              ? "bg-[#F2805A] text-white"
                              : f.role === "FOLLOWER"
                              ? "bg-[#F5F0EC] text-[#847062]"
                              : f.role === "CHILD"
                              ? "bg-[#86E0B3] text-[#32241B]"
                              : ""
                          }`}
                      >
                        {f.role === "PARENT" && "부모"}
                        {f.role === "CHILD" && "자녀"}
                        {f.role === "FOLLOWER" && "팔로워"}
                      </div>
                    </div>

                    {/* 인원 */}
                    <div className="flex items-center gap-2 mb-3 text-[#847062]">
                      <Users size={15} />
                      <div className="text-[12px] font-semibold">
                        {f.member_count}명
                      </div>
                    </div>

                    <div className="border-[0.5px] border-[#E7E1DA] mb-3" />

                    {/* 오늘의 메뉴 */}
                    <div className="text-[12px] text-[#847062] font-semibold">
                      오늘의 메뉴
                    </div>
                    <div className="text-[14px] font-extrabold text-[#F2805A] mb-4">
                      {f.today_menu ?? "미정"}
                    </div>

                    <button
                      className="bg-[#F2805A] text-white rounded-2xl text-[12px] 
                                font-bold py-2 w-full transition-all duration-150 transform active:scale-95"
                      onClick={() => router.push(`/family/${f.family_id}`)}
                    >
                      가족 들어가기
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="bg-[#FFFFFF] border border-[#DDDDDD] p-4 rounded-xl w-85 flex flex-col items-center justify-center text-center gap-2">
                <Users size={24} className="text-[#F2805A]" />
                <div className="font-bold text-[16px]">로그인이 필요해요</div>
                <div className="text-[12px] text-[#847062]">
                  내 가족 메뉴판을 확인하려면 먼저 로그인해주세요.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 가족 참여하기 */}
        <div>
          <div className="flex items-center gap-2 mb-4 font-bold">
            가족 참여하기
          </div>

          {isLoggedIn ? (
            <div className="flex gap-6">
              {/* 새 가족 만들기 카드 */}
              <div className="bg-[#FFF6F4] border border-[#FDE0D8] rounded-2xl flex flex-col items-center py-10 px-33">
                <Plus
                  size={35}
                  className="bg-[#FDDED4] rounded-full text-[#F2805A] w-auto h-auto p-2 mb-4"
                />
                <div className="font-bold mb-1">새 가족 만들기</div>
                <div className="text-[#847062] text-[11px] font-semibold mb-4">
                  우리 가족만이 메뉴판을 시작하세요
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-[#F2805A] text-white rounded-xl px-11 py-2 text-[12px] font-bold
                           transition-all duration-150 transform active:scale-95"
                >
                  가족 생성하기
                </button>
              </div>

              {/* 초대코드로 참여 카드 */}
              <div className="bg-[#FFFEFB] border border-[#E7E1DA] rounded-2xl flex flex-col items-center py-10 px-33">
                <Key
                  size={25}
                  className="bg-[#FFFAEC] rounded-full w-auto h-auto p-3 mb-4"
                />
                <div className="font-bold mb-1">초대 코드로 참여</div>
                <div className="text-[#847062] text-[11px] font-semibold mb-4">
                  가족이 보낸 코드를 입력하세요
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-[#FCFAF8] border border-[#E7E1DA] rounded-xl px-11 py-2 text-[12px] font-bold
                           transition-all duration-150 transform active:scale-95"
                >
                  가족 참여하기
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* 새 가족 만들기 (비로그인 안내용) */}
              <div className="bg-[#FFF6F4] border border-[#FDE0D8] rounded-2xl flex flex-col items-center py-10 px-33 text-center">
                <Plus
                  size={35}
                  className="bg-[#FDDED4] rounded-full text-[#F2805A] w-auto h-auto p-2 mb-4"
                />
                <div className="font-bold mb-1">새 가족 만들기</div>
                <div className="text-[#847062] text-[11px] font-semibold">
                  가족 메뉴판을 만들려면 먼저 로그인해주세요.
                </div>
              </div>

              {/* 초대코드로 참여 (비로그인 안내용) */}
              <div className="bg-[#FFFEFB] border border-[#E7E1DA] rounded-2xl flex flex-col items-center py-10 px-33 text-center">
                <Key
                  size={25}
                  className="bg-[#FFFAEC] rounded-full w-auto h-auto p-3 mb-4"
                />
                <div className="font-bold mb-1">초대 코드로 참여</div>
                <div className="text-[#847062] text-[11px] font-semibold">
                  초대 코드를 사용하려면 로그인 후 이용할 수 있어요.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새 가족 생성 모달 */}
      <CreateFamilyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async (familyName, inviteCode) => {
          setCreatedFamilyName(familyName);
          setCreatedInviteCode(inviteCode);
          setIsInviteCodeDisplayModalOpen(true);
          
          // 가족 목록 새로고침
          if (currentUser) {
            await fetchFamilies(currentUser.userId);
          }
        }}
      />

      {/* 초대 코드 입력 모달 */}
      <InviteCodeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* 초대 코드 표시 모달 */}
      <InviteCodeDisplayModal
        isOpen={isInviteCodeDisplayModalOpen}
        onClose={() => setIsInviteCodeDisplayModalOpen(false)}
        familyName={createdFamilyName}
        inviteCode={createdInviteCode}
      />
    </div>
  );
}