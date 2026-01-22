import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { LineProps } from "react-syntax-highlighter";

interface CodeViewerProps {
  fileName: string;
  fileContent?: string; // 파일 내용 (문자열)
  selectedLine: number | null;
  selectedRange?: { start: number; end: number } | null;
  onSelectLine: (line: number) => void;
  onSelectRange?: (range: { start: number; end: number }) => void;
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
      "    <div className=\"app\">",
      "      <Header title=\"내 앱\" />",
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

const CodeViewer = ({ fileName, fileContent, selectedLine, selectedRange, onSelectLine, onSelectRange }: CodeViewerProps) => {
  // fileContent가 제공되면 사용하고, 없으면 기존 codeFiles에서 가져옴
  const contentLines = fileContent 
    ? fileContent.split('\n')
    : (codeFiles[fileName]?.content || codeFiles["main.tsx"]?.content || []);
  
  const file = codeFiles[fileName] || { name: fileName, content: contentLines };
  const highlights = file.highlights; // 기존 하이라이트 정보 (있으면 사용)

  // 파일 확장자로 언어 감지
  const language = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'bash',
      'bash': 'bash',
    };
    return langMap[ext] || 'text';
  }, [fileName]);

  // 드래그 선택 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartLine, setDragStartLine] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 마우스 위치에서 라인 번호 계산 (실제 DOM 요소 기반)
  const getLineNumberFromEvent = (e: React.MouseEvent | MouseEvent): number | null => {
    if (!containerRef.current) return null;
    
    // 마우스 위치의 실제 DOM 요소 찾기
    const target = e.target as HTMLElement;
    if (!target) return null;

    // 가장 가까운 code-line 요소 또는 data-line-number 속성이 있는 요소 찾기
    let lineElement: HTMLElement | null = target.closest('.code-line') || 
      target.closest('[data-line-number]') as HTMLElement;
    
    if (!lineElement) {
      // code-line을 찾지 못한 경우, 마우스 위치에서 가장 가까운 라인 요소 찾기
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseY = e.clientY;
      
      // 모든 라인 요소를 확인하여 가장 가까운 것 찾기
      let closestLine: { lineNumber: number; distance: number } | null = null;
      
      lineRefs.current.forEach((element, lineNumber) => {
        const elementRect = element.getBoundingClientRect();
        const elementCenterY = elementRect.top + elementRect.height / 2;
        const distance = Math.abs(mouseY - elementCenterY);
        
        if (!closestLine || distance < closestLine.distance) {
          closestLine = { lineNumber, distance };
        }
      });
      
      if (closestLine) {
        return closestLine.lineNumber;
      }
      
      return null;
    }

    // data-line-number 속성에서 라인 번호 가져오기
    const lineNumber = lineElement.getAttribute('data-line-number');
    if (lineNumber) {
      const num = parseInt(lineNumber, 10);
      if (!isNaN(num)) return num;
    }

    return null;
  };

  // 드래그 시작
  const handleMouseDown = (lineNumber: number, e: React.MouseEvent) => {
    e.preventDefault();
    // Shift 키를 누르고 있으면 범위 선택
    if (e.shiftKey && selectedRange) {
      const newRange = {
        start: Math.min(selectedRange.start, lineNumber),
        end: Math.max(selectedRange.end, lineNumber),
      };
      onSelectRange?.(newRange);
      return;
    }

    setIsDragging(true);
    setDragStartLine(lineNumber);
    onSelectRange?.({ start: lineNumber, end: lineNumber });
  };

  // 라인에서 마우스 이동 처리 (드래그 중일 때)
  const handleLineMouseEnter = (lineNumber: number) => {
    if (isDragging && dragStartLine !== null) {
      const start = Math.min(dragStartLine, lineNumber);
      const end = Math.max(dragStartLine, lineNumber);
      onSelectRange?.({ start, end });
    }
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartLine(null);
  };

  // 라인 요소들을 추적하기 위한 useEffect
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateLineRefs = () => {
      const lines = containerRef.current?.querySelectorAll('span[data-line-number], td[data-line-number]');
      lines?.forEach((line) => {
        const lineNumber = parseInt(line.getAttribute('data-line-number') || '0', 10);
        if (lineNumber > 0) {
          lineRefs.current.set(lineNumber, line as HTMLDivElement);
        }
      });
    };

    // 초기 업데이트 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
    const timeoutId = setTimeout(updateLineRefs, 100);

    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver(() => {
      setTimeout(updateLineRefs, 50);
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [fileContent, contentLines.length]);

  // 전역 마우스 이벤트 처리
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (dragStartLine !== null && containerRef.current) {
          const currentLine = getLineNumberFromEvent(e);
          if (currentLine !== null) {
            const start = Math.min(dragStartLine, currentLine);
            const end = Math.max(dragStartLine, currentLine);
            onSelectRange?.({ start, end });
          }
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragStartLine(null);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStartLine, onSelectRange, contentLines.length]);

  // 라인이 선택 범위에 포함되는지 확인
  const isInRange = (lineNumber: number): boolean => {
    if (!selectedRange) return false;
    return lineNumber >= selectedRange.start && lineNumber <= selectedRange.end;
  };

  return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden" style={{ background: 'hsl(var(--code-bg))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="font-semibold text-foreground">{fileName.split('/').pop() || fileName}</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
            Lv1
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            전체 보기
          </button>
          <button className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
            중요 부분만
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar select-none"
        style={{ background: 'hsl(var(--code-bg))' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={(e) => {
          if (isDragging && dragStartLine !== null) {
            const currentLine = getLineNumberFromEvent(e);
            if (currentLine !== null) {
              const start = Math.min(dragStartLine, currentLine);
              const end = Math.max(dragStartLine, currentLine);
              onSelectRange?.({ start, end });
            }
          }
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          customStyle={{
            margin: 0,
            padding: '0.5rem 0',
            background: 'hsl(var(--code-bg))',
            fontSize: '0.875rem',
            lineHeight: '1.5rem',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          }}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            textAlign: 'right',
            userSelect: 'none',
            color: 'hsl(var(--muted-foreground))',
            backgroundColor: 'transparent',
          }}
          PreTag="div"
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              color: 'hsl(var(--foreground))',
              background: 'transparent',
            },
          }}
          wrapLines={false}
          lineProps={(lineNumber): LineProps => {
            const isSelected = selectedLine === lineNumber;
            const isInSelectedRange = isInRange(lineNumber);
            const isHighlighted = highlights?.includes(lineNumber) && !isSelected && !isInSelectedRange;

            return {
              'data-line-number': lineNumber.toString(),
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDragging) {
                  onSelectLine(lineNumber);
                  onSelectRange?.({ start: lineNumber, end: lineNumber });
                }
              },
              onMouseDown: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleMouseDown(lineNumber, e);
              },
              onMouseEnter: () => {
                handleLineMouseEnter(lineNumber);
              },
              className: cn(
                "code-line cursor-pointer transition-colors",
                isSelected && "!bg-primary/20 !border-l-2 !border-primary",
                isInSelectedRange && !isSelected && "!bg-primary/10 !border-l-2 !border-primary/50",
                isHighlighted && "!bg-cherry-pink/10",
                isDragging && dragStartLine === lineNumber && "!bg-primary/30"
              ),
              style: {
                display: 'block',
                padding: '0 1rem',
                margin: 0,
                width: '100%',
                ...(isSelected || isInSelectedRange ? { fontWeight: 500 } : {}),
              } as React.CSSProperties,
            };
          }}
        >
          {fileContent || contentLines.join('\n')}
        </SyntaxHighlighter>
      </div>

      {/* Selected Line/Range Info */}
      {(selectedLine || selectedRange) && (
        <div className="p-4 bg-card border-t border-border animate-slide-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              {selectedRange && selectedRange.start !== selectedRange.end ? (
                <>
                  <p className="text-sm font-medium text-foreground mb-1">
                    선택한 코드: 라인 {selectedRange.start} ~ {selectedRange.end}
                  </p>
                  <div className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded max-h-32 overflow-y-auto">
                    {contentLines.slice(selectedRange.start - 1, selectedRange.end).map((line, idx) => (
                      <div key={idx}>
                        {selectedRange.start + idx}: {line || " "}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground mb-1">
                    선택한 코드: 라인 {selectedLine}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                    {contentLines[selectedLine! - 1] || "빈 줄"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default CodeViewer;
