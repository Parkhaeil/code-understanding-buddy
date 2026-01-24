import { useState, useMemo, useEffect, useRef } from "react";
import { Settings, HelpCircle, ChevronLeft, ExternalLink, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LearningSteps from "./LearningSteps";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import ExplanationPanel from "./ExplanationPanel";
import type { ProjectAnalysis, ProjectFiles, Role } from "@/types/project";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MainDashboardProps {
  onBack: () => void;
  analysis: ProjectAnalysis;
  projectFiles: ProjectFiles;
  getFileText: (path: string) => Promise<string>;
  sessionId?: string; // 프로젝트 세션 ID
}

type Level = 1 | 2;

// 초기 샘플 데이터 (실제로는 프로젝트 분석 결과를 받아옴)
const initialProjectAnalysis: ProjectAnalysis = {
  projectName: "my-app",
  core_files: [
    { path: "src/main.tsx", role: "UI", why: "앱의 시작점, React 앱을 초기화함" },
    { path: "src/App.tsx", role: "UI", why: "메인 앱 컴포넌트, 화면 구조를 정의함" },
    { path: "package.json", role: "CONFIG", why: "프로젝트 의존성과 스크립트를 관리함" },
    { path: "src/components/Button.tsx", role: "UI", why: "재사용 가능한 버튼 컴포넌트" },
    { path: "src/components/Header.tsx", role: "UI", why: "앱의 헤더 영역을 담당함" },
    { path: "src/routes/index.tsx", role: "UI", why: "메인 페이지 라우트" },
    { path: "src/routes/api/users.ts", role: "SERVER", why: "사용자 관련 API 엔드포인트" },
    { path: "vite.config.js", role: "CONFIG", why: "Vite 빌드 도구 설정" },
    { path: "tsconfig.json", role: "CONFIG", why: "TypeScript 컴파일러 설정" },
    { path: "README.md", role: "DOC", why: "프로젝트 문서화" },
  ],
  learning_steps: [
    { step: 1, title: "시작 파일 찾기", files: ["src/main.tsx"], goal: "앱이 어떻게 시작되는지 이해하기" },
    { step: 2, title: "화면 파일 이해", files: ["src/App.tsx"], goal: "메인 화면 구조 파악하기" },
    { step: 3, title: "컴포넌트 만들기", files: ["src/components/Button.tsx", "src/components/Header.tsx"], goal: "재사용 가능한 컴포넌트 이해하기" },
    { step: 4, title: "페이지 만들기", files: ["src/routes/index.tsx"], goal: "라우팅과 페이지 구조 이해하기" },
    { step: 5, title: "API 연결하기", files: ["src/routes/api/users.ts"], goal: "서버와 통신하는 방법 배우기" },
    { step: 6, title: "설정 파일 이해", files: ["package.json", "vite.config.js", "tsconfig.json"], goal: "프로젝트 설정과 빌드 과정 이해하기" },
  ],
  fileRoleMap: {
    "src/main.tsx": "UI",
    "src/App.tsx": "UI",
    "src/components/Button.tsx": "UI",
    "src/components/Header.tsx": "UI",
    "src/routes/index.tsx": "UI",
    "src/routes/api/users.ts": "SERVER",
    "package.json": "CONFIG",
    "vite.config.js": "CONFIG",
    "tsconfig.json": "CONFIG",
    "README.md": "DOC",
  },
};

// 초기 파일 목록 (실제로는 프로젝트에서 가져옴)
const initialFileList = [
  "src/main.tsx",
  "src/App.tsx",
  "src/components/Button.tsx",
  "src/components/Header.tsx",
  "src/routes/index.tsx",
  "src/routes/api/users.ts",
  "package.json",
  "vite.config.js",
  "tsconfig.json",
  "README.md",
  "public/logo.png",
  "public/index.html",
];

// 핵심 파일의 초기 내용 (실제로는 파일 시스템에서 읽어옴)
const getInitialFileContent = (filePath: string): string => {
  const contentMap: Record<string, string> = {
    "src/main.tsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <App />
)`,
    "src/App.tsx": `import { useState } from 'react'
import Header from './components/Header'
import Button from './components/Button'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <Header title="내 앱" />
      <h1>카운터: {count}</h1>
      <Button onClick={() => setCount(count + 1)}>
        클릭하세요!
      </Button>
    </div>
  )
}

export default App`,
    "package.json": `{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
  };
  return contentMap[filePath] || "";
};

const MainDashboard = ({ onBack, analysis: projectAnalysis, projectFiles: initialProjectFiles, getFileText, sessionId }: MainDashboardProps) => {
  // 프로젝트 파일 상태
  const [projectFiles, setProjectFiles] = useState<ProjectFiles>(initialProjectFiles);

  const [selectedFile, setSelectedFile] = useState<string>(
    projectAnalysis.core_files[0]?.path || projectFiles.fileList[0] || ""
  );
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [level, setLevel] = useState<Level>(1);
  const [leftPanelTab, setLeftPanelTab] = useState<"steps" | "files">("steps");
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showCongratulations, setShowCongratulations] = useState(false);
  
  // Dev server 상태
  const [devServerStatus, setDevServerStatus] = useState<{
    isRunning: boolean;
    port: number | null;
    isStarting: boolean;
  }>({
    isRunning: false,
    port: null,
    isStarting: false,
  });

  const previewWindowRef = useRef<Window | null>(null);

  // 커리큘럼 상태 (LLM 기반 레벨별 학습 단계)
  const [curriculumTitle, setCurriculumTitle] = useState<string>("");
  const [curriculumSteps, setCurriculumSteps] = useState<
    Array<{
      step: number;
      title: string;
      goal: string;
      files: string[];
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
    }>
  >([]);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  // 스텝 선택 핸들러 (스텝 클릭 시 해당 파일로 자동 전환)
  const handleSelectStep = (stepId: number) => {
    setCurrentStep(stepId);
    
    // 해당 스텝의 주요 파일로 자동 전환
    const step = curriculumSteps.find(s => s.step === stepId);
    if (step && step.files && step.files.length > 0) {
      const mainFile = step.files[0]; // 첫 번째 파일을 주요 파일로 간주
      setSelectedFile(mainFile);
    }
  };

  // 스텝 완료 핸들러
  const handleCompleteStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      const newCompletedSteps = [...completedSteps, stepId];
      setCompletedSteps(newCompletedSteps);
      
      // 다음 스텝으로 자동 이동
      const totalSteps = (curriculumSteps && curriculumSteps.length > 0) 
        ? curriculumSteps.length 
        : projectAnalysis.learning_steps.length;
      
      if (stepId < totalSteps) {
        const nextStepId = stepId + 1;
        handleSelectStep(nextStepId); // 다음 스텝의 파일로도 자동 전환
      }
      
      // 모든 스텝 완료 체크
      if (newCompletedSteps.length === totalSteps && totalSteps > 0) {
        setShowCongratulations(true);
      }
    }
  };

  // selectedFile 변경 시 자동 로드
  useEffect(() => {
    const run = async () => {
      if (selectedFile && !projectFiles.fileContentMap[selectedFile]) {
        try {
          const text = await getFileText(selectedFile);
          setProjectFiles(prev => ({
            ...prev,
            fileContentMap: { ...prev.fileContentMap, [selectedFile]: text }
          }));
        } catch (error) {
          console.error(`Failed to load file ${selectedFile}:`, error);
          setProjectFiles(prev => ({
            ...prev,
            fileContentMap: {
              ...prev.fileContentMap,
              [selectedFile]: `// ${selectedFile} 파일을 불러오는 중 오류가 발생했습니다.`
            }
          }));
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, getFileText]);

  // 레벨 변경 시 커리큘럼 요청
  useEffect(() => {
    const run = async () => {
      try {
        setIsCurriculumLoading(true);
        setCurriculumError(null);

        const response = await fetch("/api/llm/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: level === 1 ? "lv1" : "lv2",
            project_tree: projectFiles.fileList,
            files: projectFiles.fileContentMap,
            projectName: projectAnalysis.projectName,
          }),
        });

        const data = await response.json();
        if (!data.ok || !data.result) {
          setCurriculumError(data.error || "커리큘럼을 불러오지 못했습니다.");
          setCurriculumSteps([]);
          return;
        }

        const result = data.result;
        setCurriculumTitle(result.curriculum_title || "");
        setCurriculumSteps(
          (result.steps || []).map((s: any) => ({
            step: s.step,
            title: s.title,
            goal: s.goal,
            files: s.files || [],
            file_summary: s.file_summary || {},
            must_know_points: s.must_know_points || [],
            optional_do: s.optional_do,
            check: s.check,
          }))
        );
      } catch (e) {
        console.error("커리큘럼 로딩 오류:", e);
        setCurriculumError(e instanceof Error ? e.message : String(e));
        setCurriculumSteps([]);
      } finally {
        setIsCurriculumLoading(false);
      }
    };

    // 파일 리스트가 있을 때만 호출
    if (projectFiles.fileList.length > 0) {
      run();
    }
  }, [level, projectFiles.fileList, projectFiles.fileContentMap, projectAnalysis.projectName]);

  // 파일 선택 핸들러
  const handleSelectFile = (filePath: string) => {
    setSelectedFile(filePath);
    setSelectedLine(null);
    setSelectedRange(null);
    // useEffect가 자동으로 파일 로드 처리
  };

  // 파일 내용 변경 핸들러
  const handleFileContentChange = (newContent: string) => {
    setProjectFiles(prev => ({
      ...prev,
      fileContentMap: {
        ...prev.fileContentMap,
        [selectedFile]: newContent
      }
    }));

    // 저장 후 미리보기 자동 새로고침(정적 서버는 HMR이 없어서 필요)
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      try {
        previewWindowRef.current.location.reload();
      } catch {
        // cross-origin/blocked 등은 무시
      }
    }
  };

  // Dev server 시작
  const handleStartDevServer = async () => {
    if (!sessionId) {
      alert("세션이 없습니다. ZIP을 다시 업로드해주세요.");
      return;
    }

    setDevServerStatus(prev => ({ ...prev, isStarting: true }));
    try {
      const response = await fetch("/api/project/dev-server/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, port: 8080 }),
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Dev server 시작 실패");
      }
      setDevServerStatus({ isRunning: true, port: data.port ?? 8080, isStarting: false });
    } catch (e) {
      console.error("Dev server 시작 오류:", e);
      alert(`Dev server 시작 오류: ${e instanceof Error ? e.message : String(e)}`);
      setDevServerStatus(prev => ({ ...prev, isStarting: false }));
    }
  };

  // Dev server 중지
  const handleStopDevServer = async () => {
    if (!sessionId) return;
    try {
      await fetch("/api/project/dev-server/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (e) {
      console.error("Dev server 중지 오류:", e);
    } finally {
      setDevServerStatus({ isRunning: false, port: null, isStarting: false });
    }
  };

  // 미리보기 열기
  const handleOpenPreview = () => {
    if (!devServerStatus.isRunning || !devServerStatus.port) return;
    previewWindowRef.current = window.open(`http://localhost:${devServerStatus.port}`, "_blank", "noopener,noreferrer");
  };

  // 현재 선택된 파일의 내용
  const selectedFileContent = useMemo(() => {
    return projectFiles.fileContentMap[selectedFile] || "";
  }, [selectedFile, projectFiles.fileContentMap]);

  // 레벨별 visibleFiles 계산
  const visibleFiles = useMemo(() => {
    const allFiles = projectFiles.fileList;
    const coreFilePaths = new Set(projectAnalysis.core_files.map((f) => f.path));
    const result = new Set<string>();

    // selectedFile은 항상 포함
    if (selectedFile) {
      result.add(selectedFile);
    }

    if (level === 1) {
      // Lv1: 분석 API가 말해준 핵심 파일만
      coreFilePaths.forEach((path) => result.add(path));
    } else {
      // Lv2: 전체 파일
      allFiles.forEach((file) => result.add(file));
    }

    return Array.from(result);
  }, [
    level,
    projectFiles.fileList,
    projectAnalysis.core_files,
    selectedFile,
  ]);

  const levelLabels: Record<Level, { label: string; emoji: string }> = {
    1: { label: "핵심만", emoji: "⭐" },
    2: { label: "전체", emoji: "📁" },
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
            내 프로젝트: <span className="text-foreground font-medium">{projectAnalysis.projectName}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Dev Server Controls */}
          <div className="flex items-center gap-2">
            {!sessionId ? (
              <span className="text-xs text-muted-foreground">
                (편집/미리보기는 ZIP 업로드 세션이 필요해요)
              </span>
            ) : !devServerStatus.isRunning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartDevServer}
                disabled={devServerStatus.isStarting}
                className="gap-2"
              >
                {devServerStatus.isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Dev Server 시작
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopDevServer}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  중지
                </Button>
                <Button size="sm" onClick={handleOpenPreview} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  미리보기 열기
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  localhost:{devServerStatus.port}
                </span>
              </>
            )}
          </div>

          {/* Level Selector */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            {([1, 2] as Level[]).map((l) => (
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
                onSelectStep={handleSelectStep} 
                level={level}
                curriculumSteps={curriculumSteps}
                isLoading={isCurriculumLoading}
                error={curriculumError}
                curriculumTitle={curriculumTitle}
                completedSteps={completedSteps}
                onCompleteStep={handleCompleteStep}
              />
            ) : (
              <FileTree
                projectName={projectAnalysis.projectName}
                files={visibleFiles}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
                fileRoleMap={projectAnalysis.fileRoleMap}
                coreFiles={projectAnalysis.core_files.map((f) => f.path)}
                level={level}
              />
            )}
          </div>
        </div>

        {/* Center Panel - Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 p-4 bg-background">
          <CodeViewer 
            fileName={selectedFile}
            fileContent={selectedFileContent}
            selectedLine={selectedLine}
            selectedRange={selectedRange}
            onSelectLine={(line) => {
              setSelectedLine(line);
              setSelectedRange(null);
              // 단일 라인 클릭 시에는 코드 초기화하지 않음 (드래그 구간 유지)
            }}
            onSelectRange={(range) => {
              setSelectedRange(range);
              setSelectedLine(range.start === range.end ? range.start : null);
              // 구간이 변경되면 이전 질문 상태 초기화
              if (range.start !== range.end) {
                setSelectedCode("");
              }
            }}
            onCodeSelect={(code) => {
              setSelectedCode(code);
            }}
            editable={!!sessionId}
            sessionId={sessionId}
            onContentChange={handleFileContentChange}
          />
        </div>

        {/* Right Panel - Explanation */}
        <div className="w-96 border-l border-border shrink-0 overflow-hidden">
          <ExplanationPanel 
            fileName={selectedFile}
            selectedLine={selectedLine}
            selectedRange={selectedRange}
            fileContent={selectedFileContent}
            level={level}
            currentStep={currentStep}
            curriculumSteps={curriculumSteps}
            selectedCode={selectedCode}
            onClearSelection={() => {
              setSelectedCode("");
              setSelectedRange(null);
            }}
          />
        </div>
      </div>

      {/* 축하 팝업 */}
      <AlertDialog open={showCongratulations} onOpenChange={setShowCongratulations}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2 justify-center">
              🎉 축하합니다! 🎉
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2 pt-4">
              <p className="text-lg font-medium text-foreground">
                모든 학습 스텝을 완료하셨습니다!
              </p>
              <p className="text-muted-foreground">
                {projectAnalysis.projectName} 프로젝트의 구조와 동작 원리를<br />
                성공적으로 이해하셨습니다.
              </p>
              <div className="pt-4 text-sm text-muted-foreground">
                <p>💪 계속해서 코드를 탐험하고 수정해보세요!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCongratulations(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MainDashboard;
