import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Role } from "@/types/project";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
};

interface FileTreeProps {
  projectName: string;
  files: string[]; // 현재 레벨에서 보여줄 파일들(이미 필터된 리스트)
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  fileRoleMap: Record<string, Role>;
  coreFiles: string[]; // analysis.core_files.map(f=>f.path)
  level: 1 | 2;
}

const roleIcons: Record<Role, string> = {
  UI: "🎨",
  SERVER: "⚡",
  DATA: "🗄️",
  CONFIG: "⚙️",
  DOC: "📄",
  OTHER: "📄",
};

const roleLabels: Record<Role, string> = {
  UI: "UI",
  SERVER: "API",
  DATA: "DB",
  CONFIG: "CFG",
  DOC: "DOC",
  OTHER: "FILE",
};

const FileTree = ({
  projectName,
  files,
  selectedFile,
  onSelectFile,
  fileRoleMap,
  coreFiles,
  level,
}: FileTreeProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const coreFilesSet = useMemo(() => new Set(coreFiles), [coreFiles]);

  // selectedFile의 상위 폴더들을 자동으로 펼치기
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.split("/");
      const newExpanded = new Set(expandedFolders);
      let currentPath = "";
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        newExpanded.add(currentPath);
      }
      setExpandedFolders(newExpanded);
    }
  }, [selectedFile]);

  // files로부터 트리 구조 생성
  const buildTree = (filePaths: string[]): TreeNode[] => {
    const root: Record<string, TreeNode> = {};

    for (const filePath of filePaths) {
      const parts = filePath.split("/");
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const path = parts.slice(0, i + 1).join("/");

        if (!current[part]) {
          current[part] = {
            name: part,
            path,
            type: isLast ? "file" : "folder",
            children: isLast ? undefined : {},
          } as TreeNode;
        }

        if (!isLast && current[part].children) {
          current = current[part].children as Record<string, TreeNode>;
        }
      }
    }

    // children을 Record에서 배열로 변환하고 정렬
    const convertToArray = (node: TreeNode): TreeNode => {
      if (node.children && typeof node.children === "object" && !Array.isArray(node.children)) {
        const childrenArray = Object.values(node.children)
          .map(convertToArray)
          .sort((a, b) => {
            // 폴더 먼저, 그 다음 파일
            if (a.type !== b.type) {
              return a.type === "folder" ? -1 : 1;
            }
            // 이름순
            return a.name.localeCompare(b.name);
          });
        return { ...node, children: childrenArray };
      }
      return node;
    };

    return Object.values(root)
      .map(convertToArray)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  };

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // 검색 필터링: 파일명에 검색어가 포함되는지 확인
  const matchesSearch = (node: TreeNode): boolean => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(query);
  };

  // 폴더가 검색 결과에 포함되는지 확인 (자식 중 하나라도 매치되면)
  const folderHasMatch = (node: TreeNode): boolean => {
    if (!searchQuery) return true;
    if (matchesSearch(node)) return true;
    if (node.children) {
      return node.children.some((child) =>
        child.type === "file" ? matchesSearch(child) : folderHasMatch(child)
      );
    }
    return false;
  };

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element | null => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    const isCore = coreFilesSet.has(node.path);
    const role = fileRoleMap[node.path] || "OTHER";

    if (node.type === "folder") {
      // 검색 필터링
      if (searchQuery && !folderHasMatch(node)) {
        return null;
      }

      const visibleChildren = node.children
        ?.map((child) => renderNode(child, depth + 1))
        .filter(Boolean);

      if (searchQuery && (!visibleChildren || visibleChildren.length === 0)) {
        return null;
      }

      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-muted/50 transition-colors",
              "text-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="font-medium truncate">{node.name}</span>
          </button>
          {isExpanded && visibleChildren && (
            <div className="animate-accordion-down">{visibleChildren}</div>
          )}
        </div>
      );
    }

    // 파일 노드
    if (searchQuery && !matchesSearch(node)) {
      return null;
    }

    return (
      <button
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all group",
          isSelected
            ? "bg-secondary text-secondary-foreground font-medium"
            : "hover:bg-muted/50 text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
      >
        <File className={cn("w-4 h-4 flex-shrink-0", isCore && "text-primary")} />
        <span
          className={cn(
            "truncate",
            isCore && "text-primary font-semibold",
            isSelected && "font-medium"
          )}
        >
          {isCore && <span className="mr-1">⭐</span>}
          {node.name}
        </span>
        {isSelected && (
          <span className="ml-auto text-xs text-primary font-medium flex-shrink-0">◀</span>
        )}
        {/* Role Badge */}
        <span
          className={cn(
            "ml-auto text-xs px-1.5 py-0.5 rounded flex-shrink-0",
            "bg-muted text-muted-foreground",
            isSelected && "bg-primary/20 text-primary"
          )}
          title={role}
        >
          <span className="mr-1">{roleIcons[role]}</span>
          {roleLabels[role]}
        </span>
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
        {tree.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            파일이 없습니다
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      {/* Level Info */}
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Lv{level}</span> · {files.length}개 파일
        </div>
      </div>
    </div>
  );
};

export default FileTree;
