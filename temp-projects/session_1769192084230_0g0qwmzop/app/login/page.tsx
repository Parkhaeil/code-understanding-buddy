// app/login/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupNickname, setSignupNickname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  
  // 회원가입 에러 메시지
  const [signupErrors, setSignupErrors] = useState<{
    nickname?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
    general?: string;
  }>({});
  
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "로그인 실패");
      return;
    }

    console.log("로그인 성공:", data);

    // ✅ 로그인 유저 정보 저장
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("currentUser", JSON.stringify(data));

    router.push("/"); // 로그인 후 이동 페이지
  } catch (error) {
    console.error("로그인 에러:", error);
    alert("서버 연결 실패");
  }
};


  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 에러 초기화
    setSignupErrors({});

    // 프론트엔드 검증
    const errors: typeof signupErrors = {};

    // 닉네임 검증
    if (!signupNickname.trim()) {
      errors.nickname = "닉네임을 입력해주세요.";
    }

    // 이메일 검증
    if (!signupEmail.trim()) {
      errors.email = "이메일을 입력해주세요.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupEmail)) {
        errors.email = "올바른 이메일 형식이 아닙니다.";
      }
    }

    // 비밀번호 길이 검증
    if (!signupPassword) {
      errors.password = "비밀번호를 입력해주세요.";
    } else if (signupPassword.length < 4) {
      errors.password = "비밀번호는 최소 4자 이상이어야 합니다.";
    }

    // 비밀번호 확인 검증
    if (!signupPasswordConfirm) {
      errors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    } else if (signupPassword !== signupPasswordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    // 에러가 있으면 표시하고 중단
    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      return;
    }

    try {
      setIsSigningUp(true);
      
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          nickname: signupNickname.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 서버 에러 처리
        const errorMessage = data.error || "회원가입 실패";
        
        // 에러 메시지에 따라 필드별로 표시
        if (errorMessage.includes("이메일")) {
          setSignupErrors({ email: errorMessage });
        } else if (errorMessage.includes("닉네임")) {
          setSignupErrors({ nickname: errorMessage });
        } else if (errorMessage.includes("비밀번호")) {
          setSignupErrors({ password: errorMessage });
        } else {
          setSignupErrors({ general: errorMessage });
        }
        return;
      }

      console.log("회원가입 성공:", data);
      alert("회원가입이 완료되었습니다!");
      
      // 회원가입 완료 → 로그인 탭으로 전환
      setAuthMode("login");
      
      // 이메일 자동 입력
      setLoginEmail(signupEmail.trim());
      
      // 회원가입 폼 초기화
      setSignupNickname("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupPasswordConfirm("");
      setSignupErrors({});
    } catch (error) {
      console.error("회원가입 에러:", error);
      setSignupErrors({ general: "서버 연결 실패" });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#FCFAF8] text-[#32241B]">
      {/* 헤더 */}
      <div className="flex items-center justify-start w-full h-18 gap-4 px-10 bg-[#FFFFFF] border-b border-[#E7E1DA]">
        <div className="flex gap-3 items-center">
          <UtensilsCrossed className="scale-130 text-[#F2805A]" />
          <div className="font-bold text-[24px]">WantToEat</div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 justify-between items-start w-full px-60 pt-55 gap-8">
        {/* 왼쪽 설명 영역 */}
        <div className="flex flex-col items-start gap-3">
          <UtensilsCrossed size={60} className="text-[#F2805A]" />
          <div className="font-bold text-[24px]">WantToEat</div>
          <div className="text-[14px]">가족끼리 같이 정하는 오늘의 메뉴</div>

          <div className="leading-8">
            <div className="flex items-center gap-2">
              <div className="text-[26px]">🍽️</div>
              <div className="text-[14px]">메뉴를 제안하고 좋아요로 투표하세요</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[26px]">❤️</div>
              <div className="text-[14px]">가족 모두가 함께 결정해요</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[26px]">📱</div>
              <div className="text-[14px]">냉장고 재료도 함께 관리할 수 있어요</div>
            </div>
          </div>
        </div>

        {/* 오른쪽 로그인/회원가입 카드 */}
        <div
          className={`w-[450px] transition-all duration-200 ${
            authMode === "signup" ? "-mt-18" : "-mt-10"
          }`}
        >
          <div className="w-full rounded-2xl bg-[#FFFFFF] border border-[#DDDDDD] px-6 py-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[18px]">
                {authMode === "login" ? "로그인" : "회원가입"}
              </div>
            </div>

            {/* 애니메이션 탭 */}
            <div className="relative flex bg-[#F5F0EC] py-1.5 px-1.5 rounded-xl mb-4 overflow-hidden">
              <div
                className={`
                  absolute top-1.5 bottom-1.5 left-1.5 
                  w-1/2 rounded-xl bg-[#FCFAF8] 
                  transition-transform duration-200
                  ${authMode === "signup" ? "translate-x-47" : ""}
                `}
              />
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`relative z-10 flex-1 py-2 text-[12px] font-semibold transition-all ${
                  authMode === "login" ? "text-[#32241B]" : "text-[#847062]"
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`relative z-10 flex-1 py-2 text-[12px] font-semibold transition-all ${
                  authMode === "signup" ? "text-[#32241B]" : "text-[#847062]"
                }`}
              >
                회원가입
              </button>
            </div>

            {/* 로그인 폼 */}
            {authMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">이메일</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="예) your@email.com"
                    className="w-full rounded-xl border border-[#E7E1DA] px-3 py-2 text-[12px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">비밀번호</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full rounded-xl border border-[#E7E1DA] px-3 py-2 text-[12px]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F2805A] text-white"
                >
                  로그인
                </button>
              </form>
            ) : (
              /* 회원가입 폼 */
              <form onSubmit={handleSignupSubmit} className="flex flex-col gap-3">
                {/* 일반 에러 메시지 */}
                {signupErrors.general && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px]">
                    {signupErrors.general}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">닉네임</label>
                  <input
                    type="text"
                    value={signupNickname}
                    onChange={(e) => {
                      setSignupNickname(e.target.value);
                      if (signupErrors.nickname) {
                        setSignupErrors({ ...signupErrors, nickname: undefined });
                      }
                    }}
                    placeholder="가족 내에서 사용할 이름"
                    className={`w-full rounded-xl border px-3 py-2 text-[12px] ${
                      signupErrors.nickname 
                        ? "border-red-300 bg-red-50" 
                        : "border-[#E7E1DA]"
                    }`}
                  />
                  {signupErrors.nickname && (
                    <div className="text-[11px] text-red-500 mt-0.5">
                      {signupErrors.nickname}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">이메일</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      if (signupErrors.email) {
                        setSignupErrors({ ...signupErrors, email: undefined });
                      }
                    }}
                    placeholder="예) your@email.com"
                    className={`w-full rounded-xl border px-3 py-2 text-[12px] ${
                      signupErrors.email 
                        ? "border-red-300 bg-red-50" 
                        : "border-[#E7E1DA]"
                    }`}
                  />
                  {signupErrors.email && (
                    <div className="text-[11px] text-red-500 mt-0.5">
                      {signupErrors.email}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">비밀번호</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (signupErrors.password) {
                        setSignupErrors({ ...signupErrors, password: undefined });
                      }
                      // 비밀번호 확인도 다시 검증
                      if (signupPasswordConfirm && e.target.value !== signupPasswordConfirm) {
                        setSignupErrors(prev => ({ ...prev, passwordConfirm: "비밀번호가 일치하지 않습니다." }));
                      } else if (signupPasswordConfirm) {
                        setSignupErrors(prev => ({ ...prev, passwordConfirm: undefined }));
                      }
                    }}
                    placeholder="비밀번호를 입력하세요 (최소 4자)"
                    className={`w-full rounded-xl border px-3 py-2 text-[12px] ${
                      signupErrors.password 
                        ? "border-red-300 bg-red-50" 
                        : "border-[#E7E1DA]"
                    }`}
                  />
                  {signupErrors.password && (
                    <div className="text-[11px] text-red-500 mt-0.5">
                      {signupErrors.password}
                    </div>
                  )}
                  {!signupErrors.password && signupPassword && signupPassword.length < 4 && (
                    <div className="text-[11px] text-amber-600 mt-0.5">
                      비밀번호는 최소 4자 이상이어야 합니다.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-semibold">비밀번호 확인</label>
                  <input
                    type="password"
                    value={signupPasswordConfirm}
                    onChange={(e) => {
                      setSignupPasswordConfirm(e.target.value);
                      if (signupErrors.passwordConfirm) {
                        setSignupErrors({ ...signupErrors, passwordConfirm: undefined });
                      }
                      // 비밀번호 일치 여부 실시간 검증
                      if (e.target.value && e.target.value !== signupPassword) {
                        setSignupErrors(prev => ({ ...prev, passwordConfirm: "비밀번호가 일치하지 않습니다." }));
                      }
                    }}
                    placeholder="비밀번호를 한 번 더 입력하세요"
                    className={`w-full rounded-xl border px-3 py-2 text-[12px] ${
                      signupErrors.passwordConfirm 
                        ? "border-red-300 bg-red-50" 
                        : "border-[#E7E1DA]"
                    }`}
                  />
                  {signupErrors.passwordConfirm && (
                    <div className="text-[11px] text-red-500 mt-0.5">
                      {signupErrors.passwordConfirm}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="mt-4 w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F2805A] text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningUp ? "회원가입 중..." : "회원가입"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}