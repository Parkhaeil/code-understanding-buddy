import { useState } from "react";
import { Send, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CherryCharacter from "./CherryCharacter";
import { cn } from "@/lib/utils";

interface ExplanationPanelProps {
  fileName: string;
  selectedLine: number | null;
  selectedRange?: { start: number; end: number } | null;
  fileContent?: string;
  level: 1 | 2;
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

const suggestedQuestions = [
  "import가 뭐예요?",
  "ReactDOM은 뭘 하는 거예요?",
  "이 코드 없으면 어떻게 돼요?",
];

const ExplanationPanel = ({ fileName, selectedLine, selectedRange, fileContent, level }: ExplanationPanelProps) => {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([
    { q: "React가 뭐예요?", a: "React는 웹사이트 화면을 만드는 도구예요! 레고처럼 작은 조각들을 조립해서 큰 화면을 만들어요 🧱" },
  ]);

  const explanation = explanations[fileName] || explanations["main.tsx"];
  const lineExplanation = selectedLine ? explanation.lineExplanations[selectedLine] : null;

  // 선택된 범위의 코드 스니펫 추출
  const getSelectedSnippet = (): string | null => {
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
    
    // 선택된 스니펫이 있으면 포함
    const contextSnippet = selectedSnippet 
      ? `\n\n선택한 코드:\n\`\`\`\n${selectedSnippet}\n\`\`\``
      : '';
    
    const fullQuestion = `${question}${contextSnippet}`;
    
    try {
      // 실제 API 호출 (나중에 구현)
      // const response = await fetch('/api/llm/explain', {
      //   method: 'POST',
      //   body: JSON.stringify({ question: fullQuestion, fileName, selectedRange }),
      // });
      
      // Simulate AI response
      const newChat = {
        q: question,
        a: `"${question}"에 대해 설명해줄게요! 🍒${selectedSnippet ? ' 선택하신 코드를 참고해서' : ''} 이건 프로그래밍에서 정말 중요한 개념이에요...`,
      };
      setChatHistory([newChat, ...chatHistory]);
      setQuestion("");
    } catch (error) {
      console.error('Failed to send question:', error);
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
            <CherryCharacter size="md" mood={selectedLine ? "thinking" : "happy"} />
          </div>

          {/* Speech Bubble */}
          <div className="bg-secondary/50 rounded-2xl p-4 relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary/50 rotate-45" />
            
            {lineExplanation ? (
              <p className="text-foreground font-medium leading-relaxed">
                🍒 "{lineExplanation}"
              </p>
            ) : (
              <>
                <p className="text-foreground font-medium leading-relaxed mb-3">
                  🍒 "{explanation.description}
                </p>
                <p className="text-muted-foreground text-sm">
                  {explanation.metaphor}
                </p>
              </>
            )}
          </div>

          {/* What This File Does */}
          {!selectedLine && !selectedRange && (
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

          {/* Selected Range Info */}
          {(selectedRange && selectedRange.start !== selectedRange.end) || selectedLine ? (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              {selectedRange && selectedRange.start !== selectedRange.end ? (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    📌 선택한 구간: 라인 {selectedRange.start} ~ {selectedRange.end}
                  </p>
                  {selectedSnippet && (
                    <div className="p-2 bg-background rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{selectedSnippet}</pre>
                    </div>
                  )}
                </div>
              ) : selectedLine ? (
                <p className="text-sm font-medium text-foreground">
                  📌 선택한 라인: {selectedLine}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="여기에 질문을 입력하세요..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendQuestion()}
              className="flex-1"
            />
            <Button onClick={handleSendQuestion} size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Suggested Questions */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">💡 이런 질문 해보세요:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-2.5 py-1 bg-muted rounded-full text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">📌 최근 질문:</p>
            {chatHistory.map((chat, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <p className="text-sm font-medium text-foreground">Q: "{chat.q}"</p>
                <p className="text-sm text-muted-foreground">
                  🍒: {chat.a.slice(0, 80)}...
                  <button className="text-primary text-xs ml-1 hover:underline">
                    전체 답변 보기
                  </button>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;
