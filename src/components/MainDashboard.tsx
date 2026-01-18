import { useState } from "react";
import { Settings, HelpCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LearningSteps from "./LearningSteps";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import ExplanationPanel from "./ExplanationPanel";

interface MainDashboardProps {
  onBack: () => void;
}

type Level = 1 | 2 | 3;

const MainDashboard = ({ onBack }: MainDashboardProps) => {
  const [selectedFile, setSelectedFile] = useState<string>("main.tsx");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(2);
  const [level, setLevel] = useState<Level>(1);
  const [cherryCount] = useState(3);
  const [leftPanelTab, setLeftPanelTab] = useState<"steps" | "files">("steps");

  const levelLabels: Record<Level, { label: string; emoji: string }> = {
    1: { label: "쉬워요", emoji: "😊" },
    2: { label: "보통", emoji: "🤓" },
    3: { label: "어려워요", emoji: "😎" },
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🍒</span>
            <span className="font-bold text-foreground">체리코딩</span>
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <span className="text-sm text-muted-foreground">
            내 프로젝트: <span className="text-foreground font-medium">my-app</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Level Selector */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            {([1, 2, 3] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  level === l 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Lv{l} {levelLabels[l].label}
                {level === l && <span className="ml-1">{levelLabels[l].emoji}</span>}
              </button>
            ))}
          </div>

          {/* Cherry Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cherry-pink/20 rounded-lg">
            <span className="text-sm">🍒</span>
            <span className="text-sm font-bold text-primary">{cherryCount}개</span>
          </div>

          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content - Three Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
          {/* Panel Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setLeftPanelTab("steps")}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                leftPanelTab === "steps" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              📚 학습 스텝
            </button>
            <button
              onClick={() => setLeftPanelTab("files")}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                leftPanelTab === "files" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              📁 파일 구조
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {leftPanelTab === "steps" ? (
              <LearningSteps 
                currentStep={currentStep} 
                onSelectStep={setCurrentStep} 
              />
            ) : (
              <FileTree 
                selectedFile={selectedFile}
                onSelectFile={(file) => {
                  setSelectedFile(file);
                  setSelectedLine(null);
                }}
                showOnlyImportant={level === 1}
              />
            )}
          </div>
        </div>

        {/* Center Panel - Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 p-4 bg-background">
          <CodeViewer 
            fileName={selectedFile}
            selectedLine={selectedLine}
            onSelectLine={setSelectedLine}
          />
        </div>

        {/* Right Panel - Explanation */}
        <div className="w-96 border-l border-border shrink-0 overflow-hidden">
          <ExplanationPanel 
            fileName={selectedFile}
            selectedLine={selectedLine}
            level={level}
          />
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
