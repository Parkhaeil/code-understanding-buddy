import { cn } from "@/lib/utils";

interface CodeViewerProps {
  fileName: string;
  selectedLine: number | null;
  onSelectLine: (line: number) => void;
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

const CodeViewer = ({ fileName, selectedLine, onSelectLine }: CodeViewerProps) => {
  const file = codeFiles[fileName] || codeFiles["main.tsx"];

  return (
    <div className="h-full flex flex-col bg-code rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="font-semibold text-foreground">{file.name}</span>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2 font-mono text-sm">
        {file.content.map((line, index) => {
          const lineNumber = index + 1;
          const isSelected = selectedLine === lineNumber;
          const isHighlighted = file.highlights?.includes(lineNumber);

          return (
            <div
              key={lineNumber}
              onClick={() => onSelectLine(lineNumber)}
              className={cn(
                "code-line flex",
                isSelected && "selected",
                isHighlighted && !isSelected && "bg-cherry-pink/10"
              )}
            >
              {/* Line Number */}
              <span className={cn(
                "w-10 text-right pr-4 select-none flex-shrink-0",
                isSelected ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {lineNumber}
              </span>
              
              {/* Code */}
              <span className={cn(
                "flex-1",
                isSelected && "text-foreground font-medium"
              )}>
                <SyntaxHighlight code={line} />
              </span>

              {/* Highlight Indicator */}
              {isHighlighted && (
                <span className="ml-2 text-primary text-xs opacity-60">●</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Line Info */}
      {selectedLine && (
        <div className="p-4 bg-card border-t border-border animate-slide-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                선택한 코드: 라인 {selectedLine}
              </p>
              <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                {file.content[selectedLine - 1] || "빈 줄"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple syntax highlighting
const SyntaxHighlight = ({ code }: { code: string }) => {
  if (!code.trim()) return <span>&nbsp;</span>;

  // Very basic highlighting
  const keywords = ["import", "from", "export", "default", "const", "function", "return", "if", "else"];
  const parts = code.split(/(\s+|[{}()[\]<>.,;:'"])/);

  return (
    <>
      {parts.map((part, i) => {
        if (keywords.includes(part)) {
          return <span key={i} className="text-purple-600">{part}</span>;
        }
        if (part.startsWith("'") || part.startsWith('"')) {
          return <span key={i} className="text-cherry-green">{part}</span>;
        }
        if (part.startsWith("//")) {
          return <span key={i} className="text-muted-foreground italic">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export default CodeViewer;
