import { cn } from "@/lib/utils";
import { Check, Circle, Play } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
  status: "completed" | "current" | "locked";
}

interface LearningStepsProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
}

const steps: Step[] = [
  {
    id: 1,
    title: "시작 파일 찾기",
    description: "main.tsx를 찾았어요!",
    icon: "🔴",
    status: "completed",
  },
  {
    id: 2,
    title: "화면 파일 이해",
    description: "App.tsx 살펴보기",
    icon: "🎨",
    status: "current",
  },
  {
    id: 3,
    title: "기능 추가 방법",
    description: "아직 잠겨있어요",
    icon: "⚡",
    status: "locked",
  },
  {
    id: 4,
    title: "페이지 만들기",
    description: "routes 폴더 탐험",
    icon: "🗺️",
    status: "locked",
  },
  {
    id: 5,
    title: "완성!",
    description: "마무리 단계",
    icon: "🚀",
    status: "locked",
  },
];

const LearningSteps = ({ currentStep, onSelectStep }: LearningStepsProps) => {
  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          📚 학습 스텝
        </h3>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isLocked = step.status === "locked";

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && onSelectStep(step.id)}
              disabled={isLocked}
              className={cn(
                "w-full p-3 rounded-xl text-left transition-all",
                isCompleted && "bg-accent/10 hover:bg-accent/20",
                isCurrent && "bg-secondary border-2 border-primary shadow-cherry",
                isLocked && "opacity-50 cursor-not-allowed bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && "bg-primary text-primary-foreground animate-pulse",
                  isLocked && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted && <Check className="w-3.5 h-3.5" />}
                  {isCurrent && <Play className="w-3 h-3 ml-0.5" />}
                  {isLocked && <Circle className="w-3 h-3" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{step.icon}</span>
                    <span className={cn(
                      "font-semibold truncate",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      Step {step.id}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm font-medium mt-0.5",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">진행도</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-cherry-pink rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default LearningSteps;
