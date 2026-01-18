import { useState } from "react";
import { Upload, Sparkles, BookOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import CherryCharacter from "./CherryCharacter";
import { cn } from "@/lib/utils";

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage = ({ onStart }: LandingPageProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // For demo purposes, just start the app
    onStart();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-cherry-pink/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-cherry-pink/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-cherry-green/20 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto text-center">
        {/* Logo & Character */}
        <div className="mb-6 animate-float">
          <CherryCharacter size="xl" mood="happy" animate />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-4">
          <span className="text-primary">🍒 체리</span>코딩
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-2 font-medium">
          AI가 만들어준 프로젝트,
        </p>
        <p className="text-xl md:text-2xl text-foreground mb-10 font-semibold">
          이제 나도 이해할 수 있어요! ✨
        </p>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onStart}
          className={cn(
            "w-full max-w-md p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
            "hover:border-primary hover:bg-secondary/50",
            isDragging 
              ? "border-primary bg-secondary scale-105 shadow-cherry-lg animate-pulse-glow" 
              : "border-border bg-card"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}>
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                📁 프로젝트 폴더를 여기에 드래그!
              </p>
              <p className="text-muted-foreground mt-1">
                또는 클릭해서 선택하기
              </p>
            </div>
          </div>
        </div>

        {/* Sample Project Button */}
        <Button 
          onClick={onStart}
          className="mt-6 gap-2 text-lg px-8 py-6 rounded-xl shadow-cherry hover:shadow-cherry-lg transition-all hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          체험해보기 - 샘플 프로젝트로 시작
        </Button>

        {/* Help Link */}
        <button className="mt-8 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          처음 사용하시나요? 사용법 보기
        </button>

        {/* Features Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <FeatureCard 
            icon="🔍"
            title="파일 구조 이해"
            description="복잡한 폴더, 쉽게 설명해줘요"
          />
          <FeatureCard 
            icon="📚"
            title="단계별 학습"
            description="게임처럼 차근차근 배워요"
          />
          <FeatureCard 
            icon="💬"
            title="질문하기"
            description="궁금한 건 바로 물어봐요"
          />
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-soft transition-all">
    <div className="text-3xl mb-3">{icon}</div>
    <h3 className="font-bold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default LandingPage;
