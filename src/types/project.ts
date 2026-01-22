export type Role = "UI" | "SERVER" | "DATA" | "CONFIG" | "DOC" | "OTHER";

export type CoreFile = {
  path: string;
  role: Role;
  why: string;
};

export type LearningStep = {
  step: number;
  title: string;
  files: string[];
  goal: string;
};

export type ProjectAnalysis = {
  projectName: string;
  core_files: CoreFile[]; // 핵심 파일 10개 정도
  learning_steps: LearningStep[]; // Step 1~6
  fileRoleMap: Record<string, Role>; // 전체 파일에 대한 역할(룰 기반 + 일부 보정)
};

export type ProjectFiles = {
  fileList: string[]; // 전체 파일 경로 목록
  fileContentMap: Record<string, string>; // (최소) 핵심파일 + 클릭한 파일의 내용
};
