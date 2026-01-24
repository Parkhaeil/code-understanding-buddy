// app/family/page.tsx
"use client";

import InviteCodeModal from "./InviteCodeModal";
import MemberEditModal, { FamilyMember } from "./MemberEditModal";
import FamilyLeftSection from "./FamilyLeftSection";
import FamilyRightSection from "./FamilyRightSection";

import { useRouter } from "next/navigation";
import { Users, ArrowLeft, Key, Settings } from "lucide-react";
import { useState } from "react";

const currentFamilyRole = "PARENT" as "PARENT" | "CHILD" | "FOLLOWER";

function RoleBadge({ role }: { role: "PARENT" | "CHILD" | "FOLLOWER" }) {
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

/* ===========================
   페이지
   =========================== */

export default function FamilyPage() {
  const router = useRouter();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  const [members, setMembers] = useState<FamilyMember[]>([
    { id: 1, name: "엄마", joinedAt: "2024.01.01", role: "PARENT" },
    { id: 2, name: "아빠", joinedAt: "2024.01.01", role: "PARENT" },
    { id: 3, name: "이유민", joinedAt: "2024.01.01", role: "CHILD" },
    { id: 4, name: "서혜민", joinedAt: "2024.01.01", role: "FOLLOWER" },
  ]);

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
              이유민네 메뉴판
            </div>

            <div className="flex items-center gap-2 text-[#847062] mt-1">
              <RoleBadge role={currentFamilyRole} />
              <Users size={15} />
              <div className="text-[12px] font-semibold">4명</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-4 py-2 rounded-xl 
                        text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
          >
            <Key size={15} />
            초대코드
          </button>
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="flex gap-1 items-center bg-[#FCFAF8] border border-[#E9E4DE] px-4 py-2 rounded-xl 
                        text-[12px] font-semibold transition-all duration-150 transform active:scale-95"
          >
            <Settings size={15} />
            가족 관리
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 justify-center items-start w-full px-60 pt-10 pb-20 gap-8">
        <FamilyLeftSection />
        <FamilyRightSection />
      </div>

      {/* 초대코드 모달 */}
      <InviteCodeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        familyName="이유민네 메뉴판"
        inviteCode="FAM2024XYZ"
      />

      {/* 가족 구성원 관리 모달 */}
      <MemberEditModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        familyName="이유민네 메뉴판"
        members={members}
        onChangeRole={(id, newRole) =>
          setMembers((prev) =>
            prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
          )
        }
        onKick={(id) =>
          setMembers((prev) => prev.filter((m) => m.id !== id))
        }
      />
    </div>
  );
}