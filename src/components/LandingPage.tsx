import { useState, useRef } from "react";
import { Upload, Sparkles, BookOpen, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CherryCharacter from "./CherryCharacter";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import type { ProjectAnalysis, ProjectFiles, Role } from "@/types/project";

interface LandingPageProps {
  onStart: (payload: {
    analysis: ProjectAnalysis;
    projectFiles: ProjectFiles;
    getFileText: (path: string) => Promise<string>;
    sessionId?: string; // 프로젝트 세션 ID
  }) => void;
}

const LandingPage = ({ onStart }: LandingPageProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipDataRef = useRef<JSZip | null>(null);

  // #region agent log
  const debugLog = (payload: { runId: string; hypothesisId: string; location: string; message: string; data?: Record<string, unknown> }) => {
    fetch("http://127.0.0.1:7242/ingest/cce69336-8107-4f27-b4e4-c2df165ef9a5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: payload.runId,
        hypothesisId: payload.hypothesisId,
        location: payload.location,
        message: payload.message,
        data: payload.data || {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  };
  // #endregion

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
      await processZipFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].name.endsWith('.zip')) {
      await processZipFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const processZipFile = async (file: File) => {
    setIsProcessing(true);
    let sessionId: string | undefined;
    
    try {
      // #region agent log
      debugLog({
        runId: "pre-fix",
        hypothesisId: "A",
        location: "LandingPage.tsx:processZipFile:entry",
        message: "start zip upload",
        data: { name: file.name, size: file.size, type: file.type, href: window.location.href },
      });
      // #endregion

      // 1. ZIP 파일을 서버로 전송하여 추출
      const formData = new FormData();
      formData.append("zipFile", file);

      const uploadUrl = "/api/project/upload";
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      // #region agent log
      debugLog({
        runId: "pre-fix",
        hypothesisId: "B",
        location: "LandingPage.tsx:processZipFile:afterFetch",
        message: "upload response received",
        data: { uploadUrl, status: uploadResponse.status, ok: uploadResponse.ok },
      });
      // #endregion

      const uploadData = await uploadResponse.json();
      if (!uploadData.ok) {
        // #region agent log
        debugLog({
          runId: "pre-fix",
          hypothesisId: "D",
          location: "LandingPage.tsx:processZipFile:uploadNotOk",
          message: "upload returned ok=false",
          data: { uploadData },
        });
        // #endregion
        throw new Error(uploadData.error || "ZIP 파일 업로드 실패");
      }
      sessionId = uploadData.sessionId;

      // #region agent log
      debugLog({
        runId: "pre-fix",
        hypothesisId: "A",
        location: "LandingPage.tsx:processZipFile:uploadOk",
        message: "upload ok",
        data: { sessionId },
      });
      // #endregion

      // 2. ZIP 파일 읽기 (로컬 분석용)
      const zip = await JSZip.loadAsync(file);
      zipDataRef.current = zip;

      // 파일 목록 추출
      const fileList: string[] = [];
      const fileContentMap: Record<string, string> = {};
      
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          fileList.push(path);
          // 텍스트 파일만 미리 읽기 (이미지 등은 제외)
          if (isTextFile(path)) {
            try {
              const content = await zipEntry.async('string');
              fileContentMap[path] = content;
            } catch {
              // 바이너리 파일은 건너뛰기
            }
          }
        }
      }

      // 프로젝트 이름 추출 (ZIP 파일명에서 .zip 제거)
      const projectName = file.name.replace(/\.zip$/i, '');

      // 분석 API 호출
      const analysis = await analyzeProject(projectName, fileList, fileContentMap);

      // fileRoleMap 생성
      const fileRoleMap: Record<string, Role> = {};
      analysis.core_files.forEach((coreFile) => {
        fileRoleMap[coreFile.path] = coreFile.role;
      });
      // 나머지 파일들은 기본값으로 설정
      fileList.forEach((path) => {
        if (!fileRoleMap[path]) {
          fileRoleMap[path] = inferRole(path);
        }
      });

      // getFileText 함수 생성
      const getFileText = async (path: string): Promise<string> => {
        if (fileContentMap[path]) {
          return fileContentMap[path];
        }
        if (zipDataRef.current) {
          const entry = zipDataRef.current.files[path];
          if (entry && !entry.dir) {
            try {
              return await entry.async('string');
            } catch {
              return `// ${path} 파일을 읽을 수 없습니다.`;
            }
          }
        }
        return `// ${path} 파일을 찾을 수 없습니다.`;
      };

      // 핵심 파일들의 내용을 fileContentMap에 추가
      analysis.core_files.forEach((coreFile) => {
        if (!fileContentMap[coreFile.path]) {
          // 나중에 getFileText로 로드
        }
      });

      const projectFiles: ProjectFiles = {
        fileList,
        fileContentMap,
      };

      onStart({
        analysis: {
          ...analysis,
          fileRoleMap,
        },
        projectFiles,
        getFileText,
        sessionId,
      });
    } catch (error) {
      console.error('ZIP 파일 처리 오류:', error);
      // #region agent log
      debugLog({
        runId: "pre-fix",
        hypothesisId: "A",
        location: "LandingPage.tsx:processZipFile:catch",
        message: "zip process error",
        data: {
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      // #endregion
      alert('ZIP 파일을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeProject = async (
    projectName: string,
    fileList: string[],
    snippets: Record<string, string>
  ): Promise<ProjectAnalysis> => {
    // 파일 트리 요약 생성
    const treeSummary = generateTreeSummary(fileList);
    
    // 핵심 후보 파일 추출 (일부 규칙 기반)
    const coreCandidates = fileList.filter((path) => {
      const name = path.toLowerCase();
      return (
        name.includes('main') ||
        name.includes('app') ||
        name.includes('index') ||
        name.includes('package.json') ||
        name.includes('config') ||
        name.includes('route') ||
        name.includes('api')
      );
    }).slice(0, 20); // 최대 20개

    try {
      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          treeSummary,
          coreCandidates,
          snippets,
        }),
      });

      const data = await response.json();
      
      if (data.ok && data.result) {
        return {
          projectName,
          core_files: data.result.core_files || [],
          learning_steps: data.result.learning_steps || [],
          fileRoleMap: {}, // 나중에 채워짐
        };
      } else {
        throw new Error(data.error || '분석 실패');
      }
    } catch (error) {
      console.error('분석 API 오류:', error);
      // 폴백: 기본 분석 결과 반환
      return {
        projectName,
        core_files: coreCandidates.slice(0, 10).map((path) => ({
          path,
          role: inferRole(path),
          why: '자동 추출된 핵심 파일',
        })),
        learning_steps: [
          { step: 1, title: '프로젝트 시작', files: [coreCandidates[0] || ''], goal: '프로젝트 구조 이해하기' },
        ],
        fileRoleMap: {},
      };
    }
  };

  const generateTreeSummary = (fileList: string[]): string => {
    const structure: Record<string, string[]> = {};
    
    fileList.forEach((path) => {
      const parts = path.split('/');
      const dir = parts.slice(0, -1).join('/') || '/';
      const file = parts[parts.length - 1];
      
      if (!structure[dir]) {
        structure[dir] = [];
      }
      structure[dir].push(file);
    });

    return Object.entries(structure)
      .map(([dir, files]) => `${dir}\n  ${files.join(', ')}`)
      .join('\n');
  };

  const isTextFile = (path: string): boolean => {
    const ext = path.split('.').pop()?.toLowerCase();
    const textExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt', 'css', 'html', 'yaml', 'yml', 'xml'];
    return textExts.includes(ext || '');
  };

  const inferRole = (path: string): "UI" | "SERVER" | "DATA" | "CONFIG" | "DOC" | "OTHER" => {
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('api') || lowerPath.includes('server') || lowerPath.includes('route')) {
      return 'SERVER';
    }
    if (lowerPath.includes('component') || lowerPath.includes('page') || lowerPath.includes('view')) {
      return 'UI';
    }
    if (lowerPath.includes('model') || lowerPath.includes('schema') || lowerPath.includes('type')) {
      return 'DATA';
    }
    if (lowerPath.includes('config') || lowerPath.includes('package.json') || lowerPath.includes('vite.config') || lowerPath.includes('tsconfig')) {
      return 'CONFIG';
    }
    if (lowerPath.includes('readme') || lowerPath.includes('.md')) {
      return 'DOC';
    }
    return 'OTHER';
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "w-full max-w-md p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
            "hover:border-primary hover:bg-secondary/50",
            isDragging 
              ? "border-primary bg-secondary scale-105 shadow-cherry-lg animate-pulse-glow" 
              : "border-border bg-card",
            isProcessing && "opacity-50 cursor-wait"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}>
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {isProcessing ? "📦 ZIP 파일 분석 중..." : "📁 프로젝트 ZIP을 여기에 드래그!"}
              </p>
              <p className="text-muted-foreground mt-1">
                {isProcessing ? "잠시만 기다려주세요..." : "또는 클릭해서 선택하기"}
              </p>
            </div>
          </div>
        </div>

        {/* Sample Project Button */}
        <Button 
          onClick={handleClick}
          disabled={isProcessing}
          className="mt-6 gap-2 text-lg px-8 py-6 rounded-xl shadow-cherry hover:shadow-cherry-lg transition-all hover:scale-105 disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5" />
          {isProcessing ? "처리 중..." : "체험해보기 - 샘플 프로젝트로 시작"}
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
