import React, { useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { LineProps } from "react-syntax-highlighter";
import { Edit, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeViewerProps {
  fileName: string;
  fileContent?: string; // 파일 내용 (문자열)
  selectedLine: number | null;
  selectedRange?: { start: number; end: number } | null;
  onSelectLine: (line: number) => void;
  onSelectRange?: (range: { start: number; end: number }) => void;
  editable?: boolean; // 편집 가능 여부
  sessionId?: string; // 프로젝트 세션 ID
  onContentChange?: (content: string) => void; // 내용 변경 콜백
  onCodeSelect?: (code: string) => void; // 드래그 선택한 코드 콜백
}

interface CodeFile {
  name: string;
  content: string[];
  highlights?: number[]; // Important lines for Lv1
}

const codeFiles: Record<string, CodeFile> = {
  "main.tsx": {
    name: "main.tsx",
    content: [
      "import React from 'react'",
      "import ReactDOM from 'react-dom/client'",
      "import App from './App'",
      "import './index.css'",
      "",
      "ReactDOM.createRoot(",
      "  document.getElementById('root')",
      ").render(",
      "  <App />",
      ")",
    ],
    highlights: [1, 3, 6, 9],
  },
  "App.tsx": {
    name: "App.tsx",
    content: [
      "import { useState } from 'react'",
      "import Header from './components/Header'",
      "import Button from './components/Button'",
      "",
      "function App() {",
      "  const [count, setCount] = useState(0)",
      "",
      "  return (",
      '    <div className="app">',
      '      <Header title="내 앱" />',
      "      <h1>카운터: {count}</h1>",
      "      <Button onClick={() => setCount(count + 1)}>",
      "        클릭하세요!",
      "      </Button>",
      "    </div>",
      "  )",
      "}",
      "",
      "export default App",
    ],
    highlights: [5, 6, 10, 11, 12],
  },
  "package.json": {
    name: "package.json",
    content: [
      "{",
      '  "name": "my-project",',
      '  "version": "1.0.0",',
      '  "scripts": {',
      '    "dev": "vite",',
      '    "build": "vite build"',
      "  },",
      '  "dependencies": {',
      '    "react": "^18.2.0",',
      '    "react-dom": "^18.2.0"',
      "  }",
      "}",
    ],
    highlights: [2, 5, 9],
  },
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const CodeViewer = ({
  fileName,
  fileContent,
  selectedLine,
  selectedRange,
  onSelectLine,
  onSelectRange,
  editable = false,
  sessionId,
  onContentChange,
  onCodeSelect,
}: CodeViewerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(fileContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 드래그 선택된 텍스트/버튼 위치
  const [selectedText, setSelectedText] = useState("");
  const [questionButtonPos, setQuestionButtonPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // fileContent 변경 시 editedContent 업데이트
  useEffect(() => {
    if (fileContent !== undefined) setEditedContent(fileContent);
  }, [fileContent]);

  // 편집 모드 시작
  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setEditedContent(fileContent || "");
    setIsEditing(false);
  };

  // 저장
  const handleSave = async () => {
    if (!sessionId || !editable) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/project/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          filePath: fileName,
          content: editedContent,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setIsEditing(false);
        onContentChange?.(editedContent);
      } else {
        alert(`저장 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("파일 저장 오류:", error);
      alert("파일 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // display content
  const displayContent = isEditing ? editedContent : fileContent || "";
  const contentLines = useMemo(() => displayContent.split("\n"), [displayContent]);

  const file = codeFiles[fileName] || { name: fileName, content: contentLines };
  const highlights = file.highlights;

  // 파일 확장자로 언어 감지
  const language = useMemo(() => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      json: "json",
      css: "css",
      html: "html",
      md: "markdown",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      sql: "sql",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sh: "bash",
      bash: "bash",
    };
    return langMap[ext] || "text";
  }, [fileName]);

  // 클릭 이벤트에서 라인 번호 추출
  const getLineNumberFromEvent = (e: React.MouseEvent | MouseEvent): number | null => {
    if (!containerRef.current) return null;

    const target = e.target as HTMLElement | null;
    if (!target) return null;

    if (target.hasAttribute("data-line-number")) {
      const v = target.getAttribute("data-line-number");
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) ? n : null;
    }

    const closest = target.closest("[data-line-number]") as HTMLElement | null;
    if (closest) {
      const v = closest.getAttribute("data-line-number");
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) ? n : null;
    }

    // 라인 번호 gutter 클릭 대비
    const ln = target.closest(".react-syntax-highlighter-line-number, .linenumber");
    if (ln) {
      const text = ln.textContent?.trim();
      const n = text ? parseInt(text, 10) : NaN;
      return Number.isFinite(n) ? n : null;
    }

    return null;
  };

  // selection 노드에서 라인 번호 추출
  const getLineFromNode = (node: Node | null): number | null => {
    if (!node) return null;

    const el =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : (node.parentElement as HTMLElement | null);

    const lineEl = el?.closest?.("[data-line-number]") as HTMLElement | null;
    if (!lineEl) return null;

    const n = parseInt(lineEl.getAttribute("data-line-number") || "", 10);
    return Number.isFinite(n) ? n : null;
  };

  const isInRange = (lineNumber: number): boolean => {
    if (!selectedRange) return false;
    return lineNumber >= selectedRange.start && lineNumber <= selectedRange.end;
  };

  // ===== Render =====
  return (
    <div
      className="h-full flex flex-col rounded-lg overflow-hidden"
      style={{ background: "hsl(var(--code-bg))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="font-semibold text-foreground">{fileName.split("/").pop() || fileName}</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">Lv1</span>
          {isEditing && (
            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-xs font-medium rounded-full">
              편집 중
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editable && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              편집
            </Button>
          )}

          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </Button>
            </>
          )}

        </div>
      </div>

      {/* Code Content */}
      {isEditing ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-sm resize-none bg-background text-foreground border-0 outline-none focus:ring-2 focus:ring-primary/20"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              lineHeight: "1.5rem",
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* 질문하기 버튼 (드래그 선택 후) */}
          {selectedText.trim() && questionButtonPos && (
            <div
              className="absolute z-10 animate-in fade-in slide-in-from-top-2"
              style={{ left: questionButtonPos.x, top: questionButtonPos.y }}
            >
              <Button onClick={() => onCodeSelect?.(selectedText)} className="shadow-lg" size="sm">
                💬 질문하기
              </Button>
            </div>
          )}

          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar code-viewer-container"
            style={{ background: "hsl(var(--code-bg))" }}
            // 드래그 시작: 버튼/선택 텍스트 리셋만
            onMouseDown={() => {
              setQuestionButtonPos(null);
              setSelectedText("");
            }}
            // 드래그 끝: selection 읽고 버튼 띄우기
            onMouseUp={(e) => {
              if (!containerRef.current) return;

              const sel = window.getSelection();
              if (!sel || sel.isCollapsed) {
                setQuestionButtonPos(null);
                setSelectedText("");
                return;
              }

              const text = sel.toString();
              if (!text.trim()) {
                setQuestionButtonPos(null);
                setSelectedText("");
                return;
              }

              setSelectedText(text);

              // anchor/focus에서 라인 범위 계산
              const a = getLineFromNode(sel.anchorNode);
              const f = getLineFromNode(sel.focusNode);
              if (a && f) {
                const start = Math.min(a, f);
                const end = Math.max(a, f);
                onSelectRange?.({ start, end });
              }

              // 버튼 위치: 마우스 업 기준
              const rect = containerRef.current.getBoundingClientRect();
              const x = clamp(e.clientX - rect.left, 8, rect.width - 8);
              const y = clamp(e.clientY - rect.top, 8, rect.height - 8);
              setQuestionButtonPos({ x, y });
            }}
            // 클릭: 라인 선택 (드래그 선택이 있으면 무시)
            onClick={(e) => {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed) return;

              const lineNumber = getLineNumberFromEvent(e);
              if (lineNumber !== null) {
                onSelectLine(lineNumber);
                onSelectRange?.({ start: lineNumber, end: lineNumber });
                // 클릭은 질문 버튼/텍스트 리셋
                setQuestionButtonPos(null);
                setSelectedText("");
              }
            }}
          >
            <SyntaxHighlighter
              language={language}
              style={oneLight}
              customStyle={{
                margin: 0,
                padding: "0.5rem 0",
                background: "hsl(var(--code-bg))",
                fontSize: "0.875rem",
                lineHeight: "1.5rem",
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              }}
              showLineNumbers
              lineNumberStyle={{
                minWidth: "2.5rem",
                paddingRight: "1rem",
                textAlign: "right",
                userSelect: "none",
                color: "hsl(var(--muted-foreground))",
                backgroundColor: "transparent",
              }}
              PreTag="div"
              codeTagProps={{
                style: {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                  color: "hsl(var(--foreground))",
                  background: "transparent",
                },
              }}
              wrapLines={true}
              lineProps={(lineNumber): LineProps => {
                const isSelected = selectedLine === lineNumber;
                const inRange = isInRange(lineNumber);
                const isHighlighted = highlights?.includes(lineNumber) && !isSelected && !inRange;

                return {
                  "data-line-number": String(lineNumber),
                  style: {
                    display: "block",
                    width: "100%",
                    padding: "0 1rem",
                    margin: 0,
                    backgroundColor: isHighlighted ? "rgba(255, 182, 193, 0.1)" : "transparent",
                    borderLeft: "none",
                    fontWeight: 400,
                    userSelect: "text",
                    cursor: "text",
                  } as React.CSSProperties,
                };
              }}
            >
              {displayContent}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

    </div>
  );
};

export default CodeViewer;
