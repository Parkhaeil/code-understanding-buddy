import { cn } from "@/lib/utils";
import { Check, Circle, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StaticStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  status: "completed" | "current" | "locked";
}

interface CurriculumStep {
  step: number;
  title: string;
  goal: string;
  files?: string[];
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

interface LearningStepsProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  level: 1 | 2;
  curriculumSteps?: CurriculumStep[];
  isLoading?: boolean;
  error?: string | null;
  curriculumTitle?: string;
  completedSteps: number[];
  onCompleteStep: (stepId: number) => void;
}

const staticSteps: StaticStep[] = [
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

const LearningSteps = ({ 
  currentStep, 
  onSelectStep, 
  level, 
  curriculumSteps, 
  isLoading, 
  error, 
  curriculumTitle,
  completedSteps,
  onCompleteStep 
}: LearningStepsProps) => {
  const hasCurriculum = !!curriculumSteps && curriculumSteps.length > 0;
  const stepsToRender: StaticStep[] = hasCurriculum
    ? curriculumSteps.map((s, index) => {
        const stepId = s.step ?? index + 1;
        
        // 스텝 1은 항상 접근 가능
        // 그 외 스텝은 이전 스텝(stepId - 1)이 완료되어야만 접근 가능
        const isPreviousStepCompleted = stepId === 1 || completedSteps.includes(stepId - 1);
        const isCompleted = completedSteps.includes(stepId);
        
        return {
          id: stepId,
          title: s.title || `학습 스텝 ${stepId}`,
          description: s.goal || "",
          icon: "📌",
          status: isCompleted 
            ? "completed" 
            : isPreviousStepCompleted
            ? "current"
            : "locked",
        };
      })
    : staticSteps;

  const completedCount = completedSteps.length;
  const progress = (completedCount / stepsToRender.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          📚 학습 스텝
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Lv{level} 커리큘럼
          </span>
        </h3>
        {curriculumTitle && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {curriculumTitle}
          </p>
        )}
        {isLoading && (
          <p className="mt-1 text-xs text-primary">
            커리큘럼 불러오는 중...
          </p>
        )}
        {error && !isLoading && (
          <p className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {stepsToRender.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isLocked = step.status === "locked";

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && onSelectStep(step.id)}
              disabled={isLocked}
              className={cn(
                "w-full rounded-xl transition-all p-3 text-left relative",
                isCompleted && "bg-accent/10",
                isCurrent && "bg-secondary border-2 border-primary shadow-cherry",
                isLocked && "opacity-50 cursor-not-allowed",
                !isLocked && "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <div className="flex items-start gap-3">
                {/* 체크박스 (왼쪽 상단) */}
                {isLocked ? (
                  // 잠긴 스텝: 잠금 아이콘
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  </div>
                ) : isCompleted ? (
                  // 완료된 스텝: 채워진 체크박스
                  <div className="w-6 h-6 rounded border-2 border-accent bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-accent-foreground" />
                  </div>
                ) : (
                  // 진행 중 스텝: 빈 체크박스 (클릭 가능)
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteStep(step.id);
                    }}
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 hover:bg-primary/10 flex-shrink-0 mt-0.5"
                  >
                    <div className="w-5 h-5 rounded border-2 border-primary" />
                  </Button>
                )}

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
          <span className="text-sm text-muted-foreground">
            {completedCount}/{stepsToRender.length} ({Math.round(progress)}%)
          </span>
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
