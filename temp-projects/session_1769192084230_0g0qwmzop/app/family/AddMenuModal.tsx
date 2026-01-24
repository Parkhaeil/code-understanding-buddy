// app/family/AddMenuModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Snowflake,
  Refrigerator,
  Thermometer,
  Plus,
} from "lucide-react";

type SourceType = "HOME" | "EAT_OUT";
type MenuStatus = "POSSIBLE" | "WISH";
type SimpleStorage = "FREEZER" | "FRIDGE" | "ROOM";

type MenuIngredient = {
  ingredient_id: number;
  ingredient_name: string;
  storage_type: "ROOM" | "FRIDGE" | "FREEZER" | "NEED";
};

type EditingMenu = {
  menu_id: number;
  menu_name: string;
  status: MenuStatus;
  ingredients: MenuIngredient[];
  sourceType?: SourceType;
  // MenuItem의 나머지 필드들 (optional, 사용하지 않지만 타입 호환성을 위해)
  author?: string;
  roleLabel?: string;
  likes?: number;
  isLiked?: boolean;
  createdBy?: number;
};

interface AddMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyName?: string;
  familyId?: number; // 가족 ID 추가
  userId?: number; // 사용자 ID 추가
  editingMenu?: EditingMenu | null;
  sourceMenuName?: string; // 복사할 메뉴 이름 (다른 가족 메뉴 복사 시 사용)
  sourceMenuType?: SourceType; // 복사할 메뉴의 집밥/외식 정보
  onSubmit?: (data: {
    menuName: string;
    sourceType: SourceType;
    // status는 백엔드에서 역할에 따라 자동 설정됨
    selectedIngredients?: {
      storage: SimpleStorage;
      name: string;
    }[];
    toBuy?: string[];
  }) => void;
}

// 더미 재료 데이터 제거 - 실제 DB에서 가져옴

const storageMeta: Record<
  SimpleStorage,
  { label: string; icon: React.ReactElement; bg: string; border: string }
> = {
  FREEZER: {
    label: "냉동실",
    icon: <Snowflake size={18} className="text-[#4DA3FF]" />,
    bg: "bg-[#F7FBFF]",
    border: "border-[#E2ECF8]",
  },
  FRIDGE: {
    label: "냉장실",
    icon: <Refrigerator size={18} className="text-[#40C2A7]" />,
    bg: "bg-[#F5FEFB]",
    border: "border-[#CFEDE3]",
  },
  ROOM: {
    label: "실온",
    icon: <Thermometer size={18} className="text-[#F07A5A]" />,
    bg: "bg-[#FFFBF7]",
    border: "border-[#F1E0CC]",
  },
};



// 상태 아이콘/라벨 (더 이상 사용하지 않음 - 백엔드에서 역할에 따라 자동 설정)

function IngredientChip({
  name,
  selected,
  onToggle,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-2 py-0.5 rounded-full text-[10px] border transition
        ${
          selected
            ? "bg-[#F2805A] border-[#F2805A] text-white"
            : "bg-white border-[#E7E1DA] text-[#32241B]"
        }`}
    >
      {name}
    </button>
  );
}

const AddMenuModal: React.FC<AddMenuModalProps> = ({
  isOpen,
  onClose,
  familyName = "이유민네 메뉴판",
  familyId,
  userId,
  editingMenu = null,
  sourceMenuName = "",
  sourceMenuType = "HOME",
  onSubmit,
}) => {
  const [menuName, setMenuName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("HOME");
  // status는 백엔드에서 역할에 따라 자동 설정되므로 제거

  // 재료 선택 상태
  const [selectedFreezer, setSelectedFreezer] = useState<string[]>([]);
  const [selectedFridge, setSelectedFridge] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string[]>([]);

  // 장 봐야 할 것 (기본값 없음)
  const [toBuyInput, setToBuyInput] = useState("");
  const [toBuyList, setToBuyList] = useState<string[]>([]);

  // 실제 냉장고 재료 데이터
  const [freezerIngredients, setFreezerIngredients] = useState<string[]>([]);
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [roomIngredients, setRoomIngredients] = useState<string[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  // 냉장고 재료 데이터 가져오기
  useEffect(() => {
    const fetchIngredients = async () => {
      if (!isOpen || !familyId || !userId) {
        // 모달이 닫혀있거나 필수 정보가 없으면 재료를 가져오지 않음
        return;
      }

      try {
        setIsLoadingIngredients(true);
        const res = await fetch(`/api/fridge?familyId=${familyId}&userId=${userId}`);
        const json = await res.json();

        if (!res.ok) {
          console.error("냉장고 재료 조회 실패:", json);
          // 에러가 발생해도 계속 진행 (빈 배열로 설정)
          setFreezerIngredients([]);
          setFridgeIngredients([]);
          setRoomIngredients([]);
          return;
        }

        // API 응답에서 재료 데이터 설정 (객체 배열에서 name만 추출)
        setFreezerIngredients(
          (json.freezer || []).map((item: { id: number; name: string }) => item.name)
        );
        setFridgeIngredients(
          (json.fridge || []).map((item: { id: number; name: string }) => item.name)
        );
        setRoomIngredients(
          (json.room || []).map((item: { id: number; name: string }) => item.name)
        );
      } catch (err) {
        console.error("냉장고 재료 조회 요청 에러:", err);
        // 에러 발생 시 빈 배열로 설정
        setFreezerIngredients([]);
        setFridgeIngredients([]);
        setRoomIngredients([]);
      } finally {
        setIsLoadingIngredients(false);
      }
    };

    fetchIngredients();
  }, [isOpen, familyId, userId]);


  

  // 수정 모드일 때 기존 데이터로 폼 초기화
  React.useEffect(() => {
    if (!isOpen) {
      // 모달이 닫혔을 때 상태 초기화
      setMenuName("");
      setSourceType("HOME");
      return;
    }
    
    // sourceMenuName이 있으면 (다른 가족 메뉴 복사 시) 메뉴 이름과 집밥/외식 정보 설정
    if (!editingMenu && sourceMenuName && sourceMenuName.trim().length > 0) {
      setMenuName(sourceMenuName);
      setSourceType(sourceMenuType || "HOME");
      setSelectedFreezer([]);
      setSelectedFridge([]);
      setSelectedRoom([]);
      setToBuyList([]);
      setToBuyInput("");
      

    } else if (editingMenu) {
      setMenuName(editingMenu.menu_name);
      setSourceType(editingMenu.sourceType || "HOME");
      
      // 재료 분류
      const freezer: string[] = [];
      const fridge: string[] = [];
      const room: string[] = [];
      const toBuy: string[] = [];
      
      editingMenu.ingredients.forEach((ing) => {
        if (ing.storage_type === "NEED") {
          toBuy.push(ing.ingredient_name);
        } else if (ing.storage_type === "FREEZER") {
          freezer.push(ing.ingredient_name);
        } else if (ing.storage_type === "FRIDGE") {
          fridge.push(ing.ingredient_name);
        } else if (ing.storage_type === "ROOM") {
          room.push(ing.ingredient_name);
        }
      });
      
      setSelectedFreezer(freezer);
      setSelectedFridge(fridge);
      setSelectedRoom(room);
      setToBuyList(toBuy);
    } else {
      // 추가 모드일 때 폼 초기화
      setMenuName("");
      setSourceType("HOME");
      setSelectedFreezer([]);
      setSelectedFridge([]);
      setSelectedRoom([]);
      setToBuyList([]);
      setToBuyInput("");
    }
  }, [isOpen, editingMenu, sourceMenuName, sourceMenuType]);

  if (!isOpen) return null;

  const handleToggleIngredient = (storage: SimpleStorage, name: string) => {
    const updater =
      storage === "FREEZER"
        ? setSelectedFreezer
        : storage === "FRIDGE"
        ? setSelectedFridge
        : setSelectedRoom;

    const current =
      storage === "FREEZER"
        ? selectedFreezer
        : storage === "FRIDGE"
        ? selectedFridge
        : selectedRoom;

    if (current.includes(name)) {
      updater(current.filter((n) => n !== name));
    } else {
      updater([...current, name]);
    }
  };

  const handleAddToBuy = () => {
    const trimmed = toBuyInput.trim();
    if (!trimmed) return;
    setToBuyList((prev) => [...prev, trimmed]);
    setToBuyInput("");
  };

  const handleRemoveToBuy = (index: number) => {
    setToBuyList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // 모든 정보 포함 (status는 백엔드에서 역할에 따라 자동 설정)
    const data = {
      menuName,
      sourceType,
      // status는 제거 - 백엔드에서 역할에 따라 자동 설정
      selectedIngredients: [
        ...selectedFreezer.map((name) => ({
          storage: "FREEZER" as const,
          name,
        })),
        ...selectedFridge.map((name) => ({
          storage: "FRIDGE" as const,
          name,
        })),
        ...selectedRoom.map((name) => ({ storage: "ROOM" as const, name })),
      ],
      toBuy: toBuyList,
    };

    onSubmit?.(data);
    onClose();
  };

  const isFormValid = menuName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-[#32241B]">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 카드 */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#FFFEFB] border border-[#E7E1DA] px-6 py-5 shadow-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <div className="text-[18px] font-bold">
              {editingMenu ? "메뉴 수정" : "메뉴 추가"}
            </div>
            <div className="text-[12px] text-[#847062]">{familyName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F5F0EC] transition transform active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-[12px]">
          {/* 메뉴 이름 & 집밥/외식 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 font-semibold">
              메뉴 이름 <span className="text-[#F2805A]">*</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-[#E7E1DA] bg-white px-3 py-2.5">
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="예) 김치찌개"
                  className="w-full text-[12px] text-[#32241B] outline-none placeholder:text-[#C2B5A8]"
                />
              </div>

              {/* 집밥/외식 토글 */}
              <div className="flex rounded-xl border border-[#E7E1DA] bg-[#FCFAF8] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSourceType("HOME")}
                  className={`px-4 py-2.5 text-[12px] font-semibold ${
                    sourceType === "HOME"
                      ? "bg-[#F2805A] text-white"
                      : "text-[#32241B]"
                  }`}
                >
                  집밥
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("EAT_OUT")}
                  className={`px-4 py-2.5 text-[12px] font-semibold border-l border-[#E7E1DA] ${
                    sourceType === "EAT_OUT"
                      ? "bg-[#F2805A] text-white"
                      : "text-[#32241B]"
                  }`}
                >
                  외식
                </button>
              </div>
            </div>
          </div>

          {/* 재료 선택 */}
          <div className="flex flex-col gap-2">
                <div className="font-semibold">재료 선택</div>

                <div className="rounded-2xl border border-[#E4D8CB] bg-[#FDFBF8] px-4 py-3 flex flex-col gap-3">
                  {(["FREEZER", "FRIDGE", "ROOM"] as SimpleStorage[]).map(
                    (storage, idx) => {
                      const meta = storageMeta[storage];
                      const list =
                        storage === "FREEZER"
                          ? freezerIngredients
                          : storage === "FRIDGE"
                          ? fridgeIngredients
                          : roomIngredients;

                      const selected =
                        storage === "FREEZER"
                          ? selectedFreezer
                          : storage === "FRIDGE"
                          ? selectedFridge
                          : selectedRoom;

                      return (
                        <div key={storage}>
                          <div
                            className={`rounded-xl border ${meta.border} ${meta.bg} px-3 pt-2.5 pb-2.5`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              {meta.icon}
                              <div className="text-[12px] font-semibold">
                                {meta.label}
                              </div>
                            </div>
                            {isLoadingIngredients ? (
                              <div className="text-[11px] text-[#A28B78] py-2">
                                재료를 불러오는 중...
                              </div>
                            ) : list.length === 0 ? (
                              <div className="text-[11px] text-[#A28B78] py-2">
                                재료가 없습니다
                              </div>
                            ) : (
                            <div className="flex flex-wrap gap-1">
                              {list.map((name, index) => (
                                <IngredientChip
                                  key={`${storage}-${name}-${index}`}
                                  name={name}
                                  selected={selected.includes(name)}
                                  onToggle={() =>
                                    handleToggleIngredient(storage, name)
                                  }
                                />
                              ))}
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 장 봐야 할 것 */}
              <div className="flex flex-col gap-2">
                <div className="font-semibold">장 봐야 할 것</div>
                <div className="rounded-xl border border-[#E7E1DA] bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {toBuyList.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="px-2 py-0.5 rounded-full bg-[#FFF5F0] border border-[#F2B8A3] text-[10px] text-[#C36037] flex items-center gap-1"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveToBuy(idx)}
                          className="ml-0.5 rounded-full hover:bg-[#F8CBC0] flex items-center justify-center"
                        >
                          <X size={9} className="text-[#C36037]" />
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={toBuyInput}
                      onChange={(e) => setToBuyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddToBuy();
                        }
                      }}
                      placeholder="입력하세요."
                      className="flex-1 min-w-[80px] text-[11px] outline-none bg-transparent placeholder:text-[#C2B5A8] ml-1"
                    />

                    <button
                      type="button"
                      onClick={handleAddToBuy}
                      className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-[#F2805A] text-white text-[9px]"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E7E1DA] bg-white text-[12px] font-semibold text-[#32241B] hover:bg-[#FCFAF8]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-5 py-2 rounded-xl text-white text-[12px] font-semibold transition
              ${
                isFormValid
                  ? "bg-[#F2805A] hover:brightness-95 cursor-pointer"
                  : "bg-[#F8BEAA] cursor-not-allowed"
              }`}          >
            {editingMenu ? "수정하기" : "추가하기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMenuModal;