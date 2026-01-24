// app/family/StatsModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { X, BarChart3 } from "lucide-react";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StatsApiResponse = {
  topMenus: { menu_name: string; cnt: string }[];
  homePercent: number;
  eatOutPercent: number;
  topIngredients: { ingredient_name: string; cnt: string }[];
  leastIngredients: { ingredient_name: string; cnt: string }[];
};

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const params = useParams();
  const familyIdParam = params?.familyId;

  const [stats, setStats] = useState<StatsApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!familyIdParam) return;
    if (typeof window === "undefined") return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const storedUser = localStorage.getItem("currentUser");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (!isLoggedIn || !storedUser) {
          setError("로그인이 필요합니다.");
          return;
        }

        const currentUser = JSON.parse(storedUser);
        const userId = currentUser.userId;
        const familyIdNum = Number(familyIdParam);

        const res = await fetch(
          `/api/stats?familyId=${familyIdNum}&userId=${userId}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!res.ok) {
          console.error("통계 조회 에러:", data);
          setError(data.error || "통계를 불러오지 못했습니다.");
          return;
        }

        setStats(data as StatsApiResponse);
      } catch (e) {
        console.error("통계 조회 중 오류:", e);
        setError("통계를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, familyIdParam]);

  const topMenus = stats?.topMenus ?? [];
  const topIngredients = stats?.topIngredients ?? [];
  const leastIngredients = stats?.leastIngredients ?? [];
  const homePercent = stats?.homePercent ?? 0;
  const eatOutPercent = stats?.eatOutPercent ?? 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-[#32241B]">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 카드 */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#FFFEFB] border border-[#E7E1DA] px-6 py-5 shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#F2805A]" />
            <div className="flex flex-col">
              <div className="font-bold text-[18px]">우리 가족 메뉴 통계</div>
              <div className="text-[12px] text-[#847062]">
                좋아요, 식사 기록, 냉장고 재료까지 한눈에 볼 수 있어요.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#F5F0EC] transition-all duration-150 transform active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-4 text-[12px] text-[#5B4636]">
          {/* 좋아요 통계 */}
          <div className="rounded-2xl bg-[#FFF7E0] px-4 py-3">
            <div className="font-bold mb-1.5">📅 이번 달에 가장 많이 먹은 메뉴</div>
            <div className="text-[12px] mb-2">
              이번 달 <span className="font-semibold">식사 기록 횟수</span>를
              기준으로 많이 먹은 메뉴를 보여줘요.
            </div>
            {loading && (
              <div className="text-[12px] text-[#847062]">통계를 불러오는 중...</div>
            )}
            {error && !loading && (
              <div className="text-[12px] text-red-500">{error}</div>
            )}
            {!loading && !error && (
              <ul className="space-y-1.5">
                {topMenus.length === 0 ? (
                  <li className="text-[12px] text-[#847062]">
                    아직 이번 달 식사 기록이 없어요.
                  </li>
                ) : (
                  topMenus.map((m, idx) => (
                    <li
                      key={`${m.menu_name}-${idx}`}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F2805A]/10 text-[#F2805A] text-[11px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{m.menu_name}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* 배달/집밥 비율 */}
          <div className="rounded-2xl bg-[#FCFAF8] px-4 py-3 flex flex-col gap-3">
            <div>
              <div className="font-bold mb-1">🏠 집밥 / 배달 비율</div>
              <div className="text-[11px] text-[#8A6A4D] mb-2">
                이번 달 식사 기록 기준으로 집밥, 배달 음식 비율을 보여드려요.
              </div>

              <div className="w-full flex items-center gap-3">
                {/* 집밥 퍼센트 (왼쪽) */}
                <span className="text-[11px] font-semibold text-[#C45A2A] whitespace-nowrap">
                  집밥 {homePercent.toFixed(0)}%
                </span>

                {/* 두 색상이 이어지는 바 */}
                <div className="flex-1 h-3 rounded-full bg-[#F0E6DD] overflow-hidden flex">
                  {/* 집밥 오렌지 부분 */}
                  <div
                    className="h-full bg-[#F2805A]"
                    style={{ width: `${homePercent}%` }}
                  />
                  {/* 배달 블루 부분 */}
                  <div
                    className="h-full bg-[#86C5F0]"
                    style={{ width: `${eatOutPercent}%` }}
                  />
                </div>

                {/* 배달 퍼센트 (오른쪽) */}
                <span className="text-[11px] font-semibold text-[#2F7A9F] whitespace-nowrap">
                  배달 {eatOutPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 재료 선호도 */}
          <div className="rounded-2xl bg-[#F5F0EC] px-4 py-3 flex flex-col gap-3">
            <div className="font-bold">🧊 식재료 선호도 (냉장고 기준)</div>
            <div className="text-[12px]">
              냉장고와 메뉴 기록을 기반으로{" "}
              <span className="font-semibold">어떤 재료를 자주/거의 안 쓰는지</span>
              를 보여줘요.
            </div>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {/* TOP 5 */}
              <div>
                <div className="text-[11px] font-semibold mb-1">
                  가장 많이 쓴 재료 TOP 5
                </div>
                <ul className="space-y-1">
                  {topIngredients.length === 0 ? (
                    <li className="text-[11px] text-[#847062]">
                      아직 이번 달 사용 기록이 없어요.
                    </li>
                  ) : (
                    topIngredients.map((ing, idx) => (
                      <li
                        key={ing.ingredient_name + idx}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#86E0B3]/20 text-[#2E6F51] text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{ing.ingredient_name}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* BOTTOM 5 */}
              <div>
                <div className="text-[11px] font-semibold mb-1">
                  거의 안 쓴 재료 TOP 5
                </div>
                <ul className="space-y-1">
                  {leastIngredients.length === 0 ? (
                    <li className="text-[11px] text-[#847062]">
                      아직 이번 달 사용 기록이 없어요.
                    </li>
                  ) : (
                    leastIngredients.map((ing, idx) => (
                      <li
                        key={ing.ingredient_name + idx}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#F2E1D2] text-[#8A6A4D] text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{ing.ingredient_name}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] border border-[#E7E1DA] bg-[#FFFFFF]
                       transition-all duration-150 transform active:scale-95"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;