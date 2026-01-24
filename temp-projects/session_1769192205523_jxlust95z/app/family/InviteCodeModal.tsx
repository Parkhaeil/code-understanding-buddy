"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyName?: string;
  inviteCode?: string;
  familyId?: number;
}

const InviteCodeModal: React.FC<InviteCodeModalProps> = ({
  isOpen,
  onClose,
  familyName = "이유민네 메뉴판",
  inviteCode = "FAMXXXXXXX",
  familyId,
}) => {
  const [copied, setCopied] = useState(false);
  const [inviteCodeValue, setInviteCodeValue] = useState(inviteCode);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 이미 props로 초대코드를 받은 경우 (홈에서 가족 생성 직후 모달)
    if (inviteCode && inviteCode !== "FAMXXXXXXX") {
      setInviteCodeValue(inviteCode);
      return;
    }

    // 가족 상세 페이지 등에서 familyId 기반으로 조회해서 쓰고 싶은 경우
    const fetchInviteCode = async () => {
      if (!familyId) return;
      if (typeof window === "undefined") return;

      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem("currentUser");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        if (!isLoggedIn || !storedUser) {
          console.error("로그인이 필요합니다.");
          return;
        }

        const currentUser = JSON.parse(storedUser);
        const userId = currentUser.userId;

        const res = await fetch(
          `/api/families/invite?familyId=${familyId}&userId=${userId}`
        );
        const data = await res.json();

        if (!res.ok) {
          console.error("초대코드 조회 실패:", data);
          return;
        }

        // API에서 { code: { family_id, code } } 형태로 내려옴
        setInviteCodeValue(data.code.code);
      } catch (e) {
        console.error("초대코드 조회 중 오류:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteCode();
  }, [familyId, inviteCode]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCodeValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("초대코드 복사 실패:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-[#32241B]">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 카드 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#FFFEFB] border border-[#E7E1DA] px-6 py-5 shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-[18px]">가족 초대하기</div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition-all duration-150 transform active:scale-95"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* 설명 */}
        <p className="text-[12px] text-[#847062] font-semibold mb-5">
          이 코드를 공유하여 가족 구성원을 초대하세요.
        </p>

        {/* 가족 이름 */}
        <div className="mb-4">
          <div className="text-[12px] text-[#847062] mb-1 font-semibold">가족 이름</div>
          <div className="text-[14px] font-semibold">{familyName}</div>
        </div>

        {/* 초대코드 박스 */}
        <div className="mb-5 rounded-2xl border border-[#FDE0D8] bg-[#FFF6F4] px-6 py-5 flex flex-col items-center gap-3">
          <div className="text-[11px] text-[#C08A6B]">초대코드</div>
          <div className="text-[24px] font-extrabold tracking-widest text-[#F2805A]">
            {isLoading ? "불러오는 중..." : inviteCodeValue}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-1 px-5 py-2 rounded-xl text-[12px] font-bold bg-[#F2805A] text-white
                       transition-all duration-150 transform active:scale-95"
          >
            {copied ? "복사 완료!" : "코드 복사하기"}
          </button>
        </div>

        {/* 초대코드 사용 방법 */}
        <div className="mb-5">
          <div className="text-[13px] font-bold mb-2">💡 초대코드 사용 방법</div>
          <ol className="text-[12px] text-[#5B4636] space-y-1 list-decimal list-inside">
            <li>위 초대코드를 가족들에게 공유하세요.</li>
            <li>가족의 &quot;초대코드로 참여&quot; 메뉴에서 코드를 입력합니다.</li>
            <li>
              처음 참여하면 팔로워 역할로 추가되며, 부모가 역할을 변경할 수
              있습니다.
            </li>
          </ol>
        </div>

        {/* 부모님 전용 기능 안내 */}
        <div className="rounded-2xl bg-[#FFF7E0] px-4 py-3">
          <div className="text-[12px] font-bold mb-1">부모님 전용 기능</div>
          <div className="text-[11px] text-[#7A5B33] leading-relaxed">
            초대된 구성원의 역할은 가족 메뉴판의 &quot;역할 관리&quot;에서 부모가
            변경할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteCodeModal;