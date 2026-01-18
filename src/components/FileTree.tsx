import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface FileNode {
  name: string;
  type: "file" | "folder";
  icon?: string;
  color?: string;
  level?: number;
  description?: string;
  children?: FileNode[];
}

interface FileTreeProps {
  selectedFile: string | null;
  onSelectFile: (fileName: string) => void;
  showOnlyImportant?: boolean;
}

const sampleFileTree: FileNode[] = [
  {
    name: "my-project",
    type: "folder",
    children: [
      {
        name: "src",
        type: "folder",
        children: [
          { name: "main.tsx", type: "file", icon: "🔴", color: "text-primary", level: 1, description: "시작 버튼" },
          { name: "App.tsx", type: "file", icon: "🎨", color: "text-primary", level: 1, description: "화면 그리기" },
          { 
            name: "components", 
            type: "folder",
            level: 2,
            children: [
              { name: "Button.tsx", type: "file", icon: "🧩", level: 2, description: "버튼 블록" },
              { name: "Header.tsx", type: "file", icon: "🧩", level: 2, description: "머리 부분" },
            ]
          },
          { 
            name: "routes", 
            type: "folder",
            level: 1,
            children: [
              { name: "index.tsx", type: "file", icon: "🗺️", level: 1, description: "첫 페이지" },
              { 
                name: "api", 
                type: "folder",
                level: 2,
                children: [
                  { name: "users.ts", type: "file", icon: "⚡", level: 2, description: "사용자 기능" },
                ]
              },
            ]
          },
        ]
      },
      {
        name: "public",
        type: "folder",
        level: 2,
        children: [
          { name: "logo.png", type: "file", icon: "🖼️", level: 2, description: "로고 이미지" },
          { name: "index.html", type: "file", icon: "📄", level: 2, description: "HTML 파일" },
        ]
      },
      { name: "package.json", type: "file", icon: "📦", color: "text-accent", level: 1, description: "재료 목록표" },
      { name: "vite.config.js", type: "file", icon: "⚙️", level: 3, description: "설정 파일" },
    ]
  }
];

const FileTree = ({ selectedFile, onSelectFile, showOnlyImportant = true }: FileTreeProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["my-project", "src", "routes"])
  );

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, path: string = "", depth: number = 0) => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(currentPath);
    const isSelected = selectedFile === node.name;

    // Filter by level if showOnlyImportant
    if (showOnlyImportant && node.level && node.level > 1) {
      return null;
    }

    // Filter by search
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (node.type === "file") return null;
    }

    if (node.type === "folder") {
      const visibleChildren = node.children?.map((child, i) => 
        renderNode(child, currentPath, depth + 1)
      ).filter(Boolean);

      if (searchQuery && visibleChildren?.length === 0) return null;

      return (
        <div key={currentPath}>
          <button
            onClick={() => toggleFolder(currentPath)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-muted/50 transition-colors",
              "text-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500" />
            )}
            <span className="font-medium">{node.name}</span>
          </button>
          {isExpanded && (
            <div className="animate-accordion-down">
              {visibleChildren}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={currentPath}
        onClick={() => onSelectFile(node.name)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
          isSelected 
            ? "bg-secondary text-secondary-foreground font-medium" 
            : "hover:bg-muted/50 text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
      >
        <span className="text-base">{node.icon || "📄"}</span>
        <span className={cn(node.color)}>{node.name}</span>
        {isSelected && (
          <span className="ml-auto text-xs text-primary font-medium">◀ 지금</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="파일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {sampleFileTree.map((node) => renderNode(node))}
      </div>

      {/* Level Filter */}
      <div className="p-3 border-t border-border">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input 
            type="checkbox" 
            checked={showOnlyImportant}
            readOnly
            className="rounded border-border text-primary focus:ring-primary"
          />
          Lv1만 보기 ✓
        </label>
      </div>
    </div>
  );
};

export default FileTree;
