import { useState, useMemo, useEffect } from "react";
import { Settings, HelpCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LearningSteps from "./LearningSteps";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import ExplanationPanel from "./ExplanationPanel";
import type { ProjectAnalysis, ProjectFiles, Role } from "@/types/project";

interface MainDashboardProps {
  onBack: () => void;
  analysis: ProjectAnalysis;
  projectFiles: ProjectFiles;
  getFileText: (path: string) => Promise<string>;
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

const MainDashboard = ({ onBack, analysis: projectAnalysis, projectFiles: initialProjectFiles, getFileText }: MainDashboardProps) => {
  // 프로젝트 파일 상태
  const [projectFiles, setProjectFiles] = useState<ProjectFiles>(initialProjectFiles);

  const [selectedFile, setSelectedFile] = useState<string>(
    projectAnalysis.core_files[0]?.path || projectFiles.fileList[0] || ""
  );
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [currentStep, setCurrentStep] = useState(2);
  const [level, setLevel] = useState<Level>(1);
  const [leftPanelTab, setLeftPanelTab] = useState<"steps" | "files">("steps");

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

  // 파일 선택 핸들러
  const handleSelectFile = (filePath: string) => {
    setSelectedFile(filePath);
    setSelectedLine(null);
    setSelectedRange(null);
    // useEffect가 자동으로 파일 로드 처리
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
                onSelectStep={setCurrentStep} 
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
            }}
            onSelectRange={(range) => {
              setSelectedRange(range);
              setSelectedLine(range.start === range.end ? range.start : null);
            }}
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
          />
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
