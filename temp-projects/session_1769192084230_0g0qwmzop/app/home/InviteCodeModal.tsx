"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteCodeModal: React.FC<InviteCodeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!code.trim()) {
      setError("초대 코드를 입력해주세요.");
      return;
    }

    if (typeof window === "undefined") return;

    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    try {
      const currentUser = JSON.parse(storedUser);
      const userId = currentUser.userId;

      if (!userId) {
        setError("사용자 정보를 찾을 수 없습니다.");
        return;
      }

      setIsLoading(true);

      const res = await fetch("/api/families/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "가족 참여에 실패했습니다.");
      }

      // 성공
      setSuccessMessage("가족에 성공적으로 참여했습니다!");

      // 가족 페이지로 이동
      if (data.family?.familyId) {
        setTimeout(() => {
          onClose();
          router.push(`/family/${data.family.familyId}`);
        }, 800);
      } else {
        // familyId가 없으면 페이지 리로드
        setTimeout(() => {
          onClose();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 800);
      }
    } catch (err) {
      console.error("가족 참여 에러:", err);
      setError(err instanceof Error ? err.message : "가족 참여에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-[#32241B]">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* 모달 카드 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#FFFEFB] border border-[#E7E1DA] px-6 py-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-[18px]">가족 참여하기</div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition-all duration-150 transform active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* 설명 */}
        <p className="text-[12px] text-[#847062] font-semibold mb-4">
          초대코드를 입력하여 가족 메뉴판에 참여하세요.
        </p>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px]">
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[12px]">
            {successMessage}
          </div>
        )}

        {/* 폼 */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          {/* 초대 코드 입력 */}
          <div className="flex flex-col gap-1">
            <label className="text-[14px] font-semibold text-[#32241B]">
              초대 코드
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="예) FAMXXXXXXX"
                className="w-6/7 rounded-xl border border-[#E7E1DA] bg-[#FFFFFF] px-3 py-2 text-[12px] focus:outline-none focus:border-[#F2805A]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/7 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F2805A] text-white
                          transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>

          {/* 안내 박스 – CreateFamilyModal 스타일 맞춤 */}
          <div className="bg-[#F5F0EC] p-4 rounded-2xl mb-10">
            <div className="text-[14px] font-bold mb-2">💡 초대코드</div>
            <div className="text-[12px]">
              가족 메뉴판의 구성원이 공유한 초대코드를 입력하세요.
            </div>
            <div className="text-[12px]">
              초대코드는 가족 메뉴판 내에서 확인할 수 있어요.
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[12px] border border-[#E7E1DA] bg-[#FFFFFF]
                         transition-all duration-150 transform active:scale-95"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F2805A] text-white
                         transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "참여 중..." : "참여하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteCodeModal;
