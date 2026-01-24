import { useState, useEffect } from "react";
import { Send, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CherryCharacter from "./CherryCharacter";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CurriculumStep {
  step: number;
  title: string;
  goal: string;
  files?: string[];
  file_summary?: Record<string, {
    one_liner: string;
    metaphor: string;
  }>;
  must_know_points?: Array<{
    point: string;
    where_to_look?: { type: string; value: string };
    why_it_matters?: string;
    micro_concept?: string;
  }>;
  optional_do?: {
    mission?: string;
    how?: string[];
    acceptance_criteria?: string[];
  };
  check?: {
    quick_questions?: Array<{ q: string; expected_a: string }>;
  };
}

interface ExplanationPanelProps {
  fileName: string;
  selectedLine: number | null;
  selectedRange?: { start: number; end: number } | null;
  fileContent?: string;
  level: 1 | 2;
  currentStep: number;
  curriculumSteps?: CurriculumStep[];
  selectedCode?: string;
  onClearSelection?: () => void;
}

interface FileExplanation {
  title: string;
  metaphor: string;
  description: string;
  steps: string[];
  lineExplanations: Record<number, string>;
}

const explanations: Record<string, FileExplanation> = {
  "main.tsx": {
    title: "시작 버튼",
    metaphor: "게임기의 전원 버튼처럼, 이 파일이 실행되면 웹사이트가 켜져요! 🚀",
    description: "main.tsx는 앱의 '시작 버튼' 같은 파일이야!",
    steps: [
      "App.tsx를 불러와요",
      "화면에 보여줘요",
      "앱이 시작돼요!",
    ],
    lineExplanations: {
      1: "React라는 도구를 가져와요. 레고 상자에서 블록을 꺼내는 것과 같아요! 🧱",
      2: "ReactDOM은 화면에 그림을 그려주는 도구예요. 스케치북 같은 거죠! 🎨",
      3: "다른 파일(App.tsx)에서 만든 '앱 화면'을 여기로 가져오는 거예요!",
      6: "createRoot는 앱이 나타날 '무대'를 만들어요! 🎭",
      9: "<App />은 우리가 만든 앱을 화면에 보여달라는 뜻이에요!",
    },
  },
  "App.tsx": {
    title: "화면 그리기",
    metaphor: "도화지에 그림을 그리듯, 여기서 화면을 만들어요! 🎨",
    description: "App.tsx는 사용자가 보는 화면을 만드는 파일이야!",
    steps: [
      "필요한 도구를 가져와요",
      "화면에 보여줄 내용을 정해요",
      "예쁘게 꾸며서 보여줘요!",
    ],
    lineExplanations: {
      1: "useState는 '기억력'을 주는 도구예요. 숫자나 글자를 기억할 수 있어요! 🧠",
      5: "function App()은 '앱 만들기 시작!'이라는 뜻이에요",
      6: "count는 숫자를 세는 변수예요. 지금은 0부터 시작해요!",
      10: "Header는 화면 맨 위에 보이는 제목 부분이에요! 📌",
      11: "카운터 숫자를 화면에 보여줘요. {count}는 저장된 숫자를 가져와요!",
      12: "버튼을 누르면 count가 1씩 늘어나요! 🔼",
    },
  },
  "package.json": {
    title: "재료 목록표",
    metaphor: "요리 레시피의 재료 목록처럼, 앱에 필요한 도구들을 적어둬요! 📋",
    description: "package.json은 앱을 만드는 데 필요한 재료들의 목록이야!",
    steps: [
      "프로젝트 이름을 정해요",
      "실행 명령어를 등록해요",
      "필요한 라이브러리를 적어요",
    ],
    lineExplanations: {
      2: "프로젝트의 이름이에요. 앱의 별명이라고 생각하면 돼요! 🏷️",
      5: "'npm run dev'를 입력하면 앱이 실행돼요! ▶️",
      9: "React는 화면을 만드는 도구예요. 필수 재료죠!",
    },
  },
};


const ExplanationPanel = ({ 
  fileName, 
  selectedLine, 
  selectedRange, 
  fileContent, 
  level,
  currentStep,
  curriculumSteps,
  selectedCode,
  onClearSelection
}: ExplanationPanelProps) => {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([
    { q: "React가 뭐예요?", a: "React는 웹사이트 화면을 만드는 도구예요! 레고처럼 작은 조각들을 조립해서 큰 화면을 만들어요 🧱" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatForModal, setSelectedChatForModal] = useState<{ q: string; a: string } | null>(null);

  // selectedCode가 바뀌면 구간 정보를 상단에 표시 (질문하기 버튼 클릭 시)
  useEffect(() => {
    if (selectedCode && selectedCode.trim() && selectedRange) {
      // 질문은 비워두고 사용자가 직접 입력하게 함
      setQuestion("");
    }
  }, [selectedCode, selectedRange]);

  // 선택된 코드 제거
  const handleClearSelectedCode = () => {
    setQuestion("");
  };

  const explanation = explanations[fileName] || explanations["main.tsx"];
  
  // 현재 스텝의 커리큘럼 정보 가져오기
  const currentCurriculumStep = curriculumSteps && curriculumSteps.length > 0 
    ? curriculumSteps.find(s => s.step === currentStep) 
    : undefined;
  
  // 파일 요약 가져오기 (항상 현재 스텝의 주요 파일 설명 표시)
  const getFileSummary = () => {
    if (!currentCurriculumStep?.file_summary || !currentCurriculumStep.files || currentCurriculumStep.files.length === 0) {
      return null;
    }
    
    // 현재 스텝의 주요 파일 (files[0])
    const mainFile = currentCurriculumStep.files[0];
    const mainFileNameOnly = mainFile.split('/').pop() || mainFile;
    
    // 현재 스텝의 주요 파일 설명만 표시
    // 1. 전체 경로로 먼저 시도
    if (currentCurriculumStep.file_summary[mainFile]) {
      return currentCurriculumStep.file_summary[mainFile];
    }
    
    // 2. 파일명만으로 시도
    if (currentCurriculumStep.file_summary[mainFileNameOnly]) {
      return currentCurriculumStep.file_summary[mainFileNameOnly];
    }
    
    return null;
  };
  
  const fileSummary = getFileSummary();

  // 선택된 코드: selectedCode prop이 우선, 없으면 fileContent에서 추출
  const getSelectedSnippet = (): string | null => {
    // selectedCode prop이 있으면 우선 사용
    if (selectedCode && selectedCode.trim()) {
      return selectedCode.trim();
    }
    
    // 없으면 fileContent에서 추출
    if (!fileContent) return null;
    
    if (selectedRange && selectedRange.start !== selectedRange.end) {
      const lines = fileContent.split('\n');
      return lines.slice(selectedRange.start - 1, selectedRange.end).join('\n');
    } else if (selectedLine) {
      const lines = fileContent.split('\n');
      return lines[selectedLine - 1] || null;
    }
    return null;
  };

  const selectedSnippet = getSelectedSnippet();

  const handleSendQuestion = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    
    // 안전장치: question 문자열에 스니펫 포함 (서버가 selectedCode 필드를 무시해도 무조건 포함됨)
    const snippet = selectedSnippet ? `\n\n선택한 코드:\n\`\`\`\n${selectedSnippet}\n\`\`\`\n` : "";
    
    // 디버깅: 전송 전 데이터 확인
    console.log("Sending question with:", {
      question: question.trim(),
      fileName,
      hasSelectedCode: !!selectedCode,
      hasSelectedSnippet: !!selectedSnippet,
      selectedCodeLength: selectedCode?.length || 0,
      selectedSnippetLength: selectedSnippet?.length || 0,
      selectedCodePreview: selectedCode?.substring(0, 100),
      selectedRange,
    });
    
    try {
      const requestBody = {
        question: question.trim() + snippet, // question에 스니펫 포함
        fileName,
        selectedCode: selectedSnippet || null, // selectedSnippet 사용
        selectedRange: selectedRange || null,
      };
      
      const response = await fetch('/api/llm/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || '답변을 받을 수 없습니다.');
      }

      const newChat = {
        q: question.trim(),
        a: data.answer || '답변을 생성할 수 없습니다.',
      };
      
      setChatHistory([newChat, ...chatHistory]);
      setQuestion("");
      
      // 선택된 코드가 있으면 선택 해제 (선택 사항)
      if (selectedCode && onClearSelection) {
        // 선택 해제하지 않고 유지하는 것이 더 나을 수 있음
        // onClearSelection();
      }
    } catch (error) {
      console.error('Failed to send question:', error);
      const errorMessage = error instanceof Error ? error.message : '질문 전송에 실패했습니다.';
      const errorChat = {
        q: question.trim(),
        a: `❌ 오류: ${errorMessage}`,
      };
      setChatHistory([errorChat, ...chatHistory]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Explanation Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Main Explanation */}
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" />
            체리가 설명해줘요
          </h3>

          {/* Cherry Character with Speech Bubble */}
          <div className="flex flex-col items-center mb-4">
            <CherryCharacter size="md" mood={selectedCode ? "thinking" : "happy"} />
          </div>

          {/* Speech Bubble */}
          <div className="bg-secondary/50 rounded-2xl p-4 relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary/50 rotate-45" />
            
            {fileSummary ? (
              <>
                <p className="text-foreground font-medium leading-relaxed mb-3">
                  🍒 "{fileSummary.one_liner}"
                </p>
                <p className="text-muted-foreground text-sm">{fileSummary.metaphor}</p>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium leading-relaxed mb-3">
                  🍒 "{explanation.description}"
                </p>
                <p className="text-muted-foreground text-sm">{explanation.metaphor}</p>
              </>
            )}
          </div>

          {/* Learning Step Content - 커리큘럼 상세 내용 */}
          {currentCurriculumStep && (
            <div className="mt-4 space-y-4">
              {/* Must Know Points */}
              {currentCurriculumStep.must_know_points && currentCurriculumStep.must_know_points.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    💡 꼭 알아야 할 포인트
                  </p>
                  <div className="space-y-3">
                    {currentCurriculumStep.must_know_points.map((point, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {idx + 1}. {point.point}
                        </p>
                        {point.where_to_look && (
                          <p className="text-xs text-muted-foreground">
                            📍 {point.where_to_look.value}
                          </p>
                        )}
                        {point.why_it_matters && (
                          <p className="text-xs text-muted-foreground">
                            {point.why_it_matters}
                          </p>
                        )}
                        {point.micro_concept && (
                          <p className="text-xs text-foreground/90 mt-2 bg-background/60 rounded p-2 leading-relaxed">
                            {point.micro_concept}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Do (Mission) */}
              {currentCurriculumStep.optional_do?.mission && (
                <div>
                  <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                    ✏️ 선택 미션
                  </p>
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-2">
                    <p className="text-sm text-foreground">{currentCurriculumStep.optional_do.mission}</p>
                    
                    {currentCurriculumStep.optional_do.how && currentCurriculumStep.optional_do.how.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">힌트:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          {currentCurriculumStep.optional_do.how.map((hint, idx) => (
                            <li key={idx}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentCurriculumStep.optional_do.acceptance_criteria && currentCurriculumStep.optional_do.acceptance_criteria.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">성공 기준:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          {currentCurriculumStep.optional_do.acceptance_criteria.map((criteria, idx) => (
                            <li key={idx}>{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Check (Quick Questions) */}
              {currentCurriculumStep.check?.quick_questions && currentCurriculumStep.check.quick_questions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    ✅ 확인 질문
                  </p>
                  <div className="space-y-2">
                    {currentCurriculumStep.check.quick_questions.map((qa, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-foreground mb-1">Q: {qa.q}</p>
                        <p className="text-sm text-muted-foreground">A: {qa.expected_a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback: What This File Does (커리큘럼 없을 때만) */}
          {!currentCurriculumStep && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">이 파일이 하는 일:</p>
              {explanation.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question Section with Selected Range */}
        <div className="p-4 border-t border-border">
          <h4 className="font-bold text-foreground flex items-center gap-2 mb-3">
            💬 궁금한 거 물어봐요!
          </h4>

          {/* Selected Range Info는 이제 Input 영역 위에서 표시 */}

          {/* Input */}
          <div className="mb-4">
            <div className="space-y-3">
              {/* 선택한 구간 정보 (코드 선택 시에만 표시) */}
              {selectedCode && selectedCode.trim() && selectedRange && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {fileName.split('/').pop()}의 line {selectedRange.start}-{selectedRange.end}
                    <button
                      onClick={() => {
                        onClearSelection?.();
                        setQuestion("");
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      aria-label="구간 선택 취소"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
              
              {/* 질문 입력 (항상 표시) */}
              <div className="flex gap-2">
                <Input
                  placeholder={selectedCode && selectedRange ? "이 구간에 대해 질문하세요... (예: 이 줄에서 div 문법이 궁금해)" : "여기에 질문을 입력하세요..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendQuestion()}
                  className="flex-1"
                  autoFocus={!!(selectedCode && selectedRange)}
                />
                <Button 
                  onClick={handleSendQuestion} 
                  size="icon" 
                  className="shrink-0"
                  disabled={isLoading || !question.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* 기존 코드 제거: selectedRange 구간 정보는 위에서 이미 표시됨 */}

          {/* Chat History */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">📌 최근 질문:</p>
            {chatHistory.map((chat, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <p className="text-sm font-medium text-foreground">Q: "{chat.q}"</p>
                <p className="text-sm text-muted-foreground">
                  🍒: {chat.a.length > 80 ? `${chat.a.slice(0, 80)}...` : chat.a}
                  {chat.a.length > 80 && (
                    <button 
                      onClick={() => setSelectedChatForModal(chat)}
                      className="text-primary text-xs ml-1 hover:underline"
                    >
                      전체 답변 보기
                    </button>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* 전체 답변 모달 */}
          <Dialog open={!!selectedChatForModal} onOpenChange={(open) => !open && setSelectedChatForModal(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle>질문과 답변</DialogTitle>
                <DialogDescription>
                  선택한 질문에 대한 전체 답변을 확인하세요.
                </DialogDescription>
              </DialogHeader>
              {selectedChatForModal && (
                <div className="space-y-4 mt-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">❓ 질문:</p>
                    <p className="text-sm text-foreground">{selectedChatForModal.q}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">🍒 답변:</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedChatForModal.a}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;
