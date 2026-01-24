import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { spawn } from "child_process";
import http from "http";
import multer from "multer";
import JSZip from "jszip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // ZIP 파일 업로드를 위해 증가

// multer 설정 (메모리 스토리지)
const upload = multer({ storage: multer.memoryStorage() });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// #region agent log
function debugLog(payload) {
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
}
// #endregion

// 프로젝트 세션 관리
const projectSessions = new Map(); // sessionId -> { projectPath, devServerProcess, previewServer, port, type }

// 임시 디렉토리 경로
const TEMP_DIR = path.join(__dirname, "../temp-projects");

// 임시 디렉토리 생성
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error("임시 디렉토리 생성 실패:", error);
  }
}

function hasPackageJson(projectPath) {
  try {
    fsSync.accessSync(path.join(projectPath, "package.json"));
    return true;
  } catch {
    return false;
  }
}

function findIndexHtml(projectPath) {
  // 루트에서 먼저 확인
  const rootIndex = path.join(projectPath, "index.html");
  if (fsSync.existsSync(rootIndex)) {
    return projectPath;
  }
  
  // 하위 폴더에서 재귀적으로 찾기 (최대 2단계 깊이)
  try {
    const entries = fsSync.readdirSync(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(projectPath, entry.name);
        const subIndex = path.join(subPath, "index.html");
        if (fsSync.existsSync(subIndex)) {
          return subPath;
        }
        // 2단계 깊이까지 확인
        try {
          const subEntries = fsSync.readdirSync(subPath, { withFileTypes: true });
          for (const subEntry of subEntries) {
            if (subEntry.isDirectory()) {
              const subSubPath = path.join(subPath, subEntry.name);
              const subSubIndex = path.join(subSubPath, "index.html");
              if (fsSync.existsSync(subSubIndex)) {
                return subSubPath;
              }
            }
          }
        } catch {
          // 하위 폴더 읽기 실패는 무시
        }
      }
    }
  } catch {
    // 디렉토리 읽기 실패는 무시
  }
  
  return null;
}

function hasIndexHtml(projectPath) {
  return findIndexHtml(projectPath) !== null;
}

// 세션 ID 생성
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Vite dev server 실행
async function startViteDevServer(projectPath, port = 8080) {
  return new Promise((resolve, reject) => {
    if (!hasPackageJson(projectPath)) {
      reject(new Error("package.json을 찾을 수 없습니다. Vite 프로젝트가 아닐 수 있습니다."));
      return;
    }

    // vite dev server 실행 (포트 지정)
    const viteProcess = spawn("npm", ["run", "dev", "--", "--port", port.toString(), "--host"], {
      cwd: projectPath,
      shell: true,
      stdio: "pipe",
      env: {
        ...process.env,
        PORT: port.toString(),
      },
    });

    let isReady = false;
    const timeout = setTimeout(() => {
      if (!isReady) {
        viteProcess.kill();
        reject(new Error("Vite dev server 시작 타임아웃 (30초)"));
      }
    }, 30000);

    viteProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[Vite ${port}]:`, output);
      if (output.includes("Local:") || output.includes("ready") || output.includes(`localhost:${port}`)) {
        isReady = true;
        clearTimeout(timeout);
        resolve(viteProcess);
      }
    });

    viteProcess.stderr.on("data", (data) => {
      const output = data.toString();
      console.error(`[Vite ${port} ERROR]:`, output);
      // 일부 경고는 무시
      if (output.includes("ready") || output.includes(`localhost:${port}`)) {
        isReady = true;
        clearTimeout(timeout);
        resolve(viteProcess);
      }
    });

    viteProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    viteProcess.on("exit", (code) => {
      if (code !== 0 && !isReady) {
        clearTimeout(timeout);
        reject(new Error(`Vite 프로세스가 종료되었습니다 (코드: ${code})`));
      }
    });
  });
}

async function startStaticServer(projectPath, port = 8080, maxAttempts = 5) {
  const indexHtmlPath = findIndexHtml(projectPath);
  if (!indexHtmlPath) {
    throw new Error("정적 프로젝트 미리보기는 index.html이 필요합니다. (프로젝트 루트 또는 하위 폴더에 있어야 합니다)");
  }

  let lastError = null;

  for (let p = port; p < port + maxAttempts; p++) {
    const staticApp = express();
    staticApp.use(cors());
    staticApp.use((req, res, next) => {
      // 수정 반영을 위해 캐시 비활성화(새로고침 시 즉시 파일 재요청)
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      next();
    });
    // index.html이 있는 폴더를 서빙 루트로 사용
    staticApp.use(express.static(indexHtmlPath, { etag: false, lastModified: false, cacheControl: false }));

    const server = http.createServer(staticApp);

    try {
      // #region agent log
      try {
        const indexContent = await fs.readFile(path.join(indexHtmlPath, "index.html"), "utf-8");
        debugLog({
          sessionId: "debug-session",
          runId: "pre-fix",
          hypothesisId: "STATIC_INDEX_CONTENT",
          location: "server/index.mjs:startStaticServer:beforeListen",
          message: "index.html content snapshot before listen",
          data: {
            indexHtmlPath,
            portCandidate: p,
            snippet: indexContent.slice(0, 300),
          },
          timestamp: Date.now(),
        });
      } catch (e) {
        debugLog({
          sessionId: "debug-session",
          runId: "pre-fix",
          hypothesisId: "STATIC_INDEX_CONTENT",
          location: "server/index.mjs:startStaticServer:readError",
          message: "failed to read index.html before listen",
          data: {
            indexHtmlPath,
            portCandidate: p,
            errorMessage: e instanceof Error ? e.message : String(e),
          },
          timestamp: Date.now(),
        });
      }
      // #endregion

      await new Promise((resolve, reject) => {
        server.once("error", (err) => {
          reject(err);
        });
        server.listen(p, resolve);
      });

      console.log(`[STATIC] 정적 미리보기 서버가 포트 ${p}에서 시작되었습니다 (index.html: ${indexHtmlPath})`);
      // 성공 시 실제 사용 포트도 함께 반환
      return { server, port: p };
    } catch (err) {
      lastError = err;
      if (err && typeof err === "object" && err.code === "EADDRINUSE") {
        console.warn(`[STATIC] 포트 ${p}는 이미 사용 중입니다. 다음 포트 시도...`);
        continue;
      }
      // 다른 에러는 즉시 종료
      throw err;
    }
  }

  throw lastError || new Error("사용 가능한 포트를 찾지 못했습니다.");
}

/** 모델 선택: 분석은 gpt-4o, 나머지는 gpt-4o-mini */
function pickModel(task) {
  if (task === "analyze") return "gpt-4o";
  return "gpt-4o-mini";
}

app.post("/api/llm/analyze", async (req, res) => {
  try {
    const { projectName, treeSummary, coreCandidates, snippets } = req.body;

    const prompt = `
You are a senior software engineer and tutor.
Return STRICT JSON ONLY.

JSON schema:
{
  "core_files":[{"path":"", "role":"UI|SERVER|DATA|CONFIG|DOC|OTHER", "why":""}],
  "learning_steps":[{"step":1,"title":"","files":[""],"goal":""}]
}

Rules:
- core_files <= 10
- learning_steps <= 6
- Prefer entry/routing/main UI/API/data/config files.

Project: ${projectName}

TREE_SUMMARY:
${treeSummary}

CORE_CANDIDATES:
${(coreCandidates || []).join("\n")}

SNIPPETS (first ~120 lines each):
${Object.entries(snippets || {}).map(([p,s])=>`--- ${p} ---\n${s}\n`).join("\n")}
`;

    const response = await client.chat.completions.create({
      model: pickModel("analyze"),
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer and tutor. Always return valid JSON only, no markdown code blocks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const text = (response.choices[0]?.message?.content || "").trim();
    // JSON 파싱 실패해도 raw로 반환해서 데모 안죽게
    try {
      res.json({ ok: true, result: JSON.parse(text) });
    } catch {
      res.json({ ok: false, raw: text });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 레벨별 커리큘럼 생성
app.post("/api/llm/curriculum", async (req, res) => {
  try {
    const { level, project_tree, files, projectName } = req.body;

    const prompt = `
너는 “후행학습(artifact-first)” 웹 교육 커리큘럼 디자이너다.
이번 커리큘럼은 “빠른 MVP 데모”가 목표라서, 각 스텝은 ‘중요 파일 1개’를 중심으로,
그 파일에서 꼭 알아야 할 포인트 1~2개만 짚는다. 깊게 파지 말고, 핵심만.

[입력]
AI가 생성한 웹 프로젝트 결과물
- project_tree: 전체 파일 트리(경로 목록)
- files: 중요 파일들의 전문(HTML/CSS/JS/Node 등)

[현재 프로젝트]
- name: ${projectName || "unknown-project"}
- level: ${level || "lv1"}
- project_tree:
${(project_tree || []).join("\n")}

- files:
${Object.entries(files || {}).map(([p, s]) => `--- ${p} ---\n${s}\n`).join("\n")}

[목표]
- 4~8단계(권장 6단계) 커리큘럼을 만든다.
- 각 단계는 “중요 파일 1개”를 중심으로 한다(필요하면 보조 파일 1개까지 허용).
- 각 단계는 반드시 포인트를 1~2개만 다룬다(중요하지 않으면 과감히 생략).
- 각 단계는 “코드에서 위치 찍기(라인 번호 또는 고유한 코드 조각 인용) → 짧은 개념 설명 → (선택) 미니 수정 → 확인 질문 1~2개” 흐름으로 구성한다.
- 변경(do)은 선택이다. 하지만 “선택 미션”은 항상 제안해라(안 해도 되는 형태).

[출력 형식 — JSON]
{
  "curriculum_title": "…",
  "steps": [
    {
      "step": 1,
      "title": "파일명 기반 짧은 제목 (예: index.html 구조 한눈에 보기)",
      "files": ["path/to/important-file", "optional/path/to/helper-file"],
      "goal": "이 파일을 보면 웹 구조에서 무엇을 감 잡게 되는지(1문장)",
      "file_summary": {
        "path/to/important-file": {
          "one_liner": "이 파일이 무엇인지 한 문장 요약 (예: 웹 페이지의 뼈대를 만드는 HTML 파일이야!)",
          "metaphor": "친근한 비유로 설명 (예: 집을 지을 때 기둥과 벽을 세우는 것처럼, 웹사이트의 구조를 만들어요 🏗️)"
        }
      },
      "must_know_points": [
        {
          "point": "꼭 알아야 하는 핵심 1",
          "where_to_look": {
            "type": "line_or_snippet",
            "value": "line 13 또는 \`<p class=\"instructions\">\` 같은 고유 코드"
          },
          "why_it_matters": "이 프로젝트에서 이게 왜 중요한지(2~3문장)",
          "micro_concept": "개념 설명 3~6문장 (너무 길게 금지)"
        },
        {
          "point": "꼭 알아야 하는 핵심 2 (없으면 생략 가능)",
          "where_to_look": {
            "type": "line_or_snippet",
            "value": "line N 또는 고유 코드"
          },
          "why_it_matters": "2~3문장",
          "micro_concept": "3~6문장"
        }
      ],
      "optional_do": {
        "mission": "선택 미니 수정 1개 (5분 컷)",
        "how": ["어떤 줄/어떤 속성을 바꿀지 힌트 2~4개"],
        "acceptance_criteria": ["성공 기준 2~4개 (눈으로 확인 가능하게)"]
      },
      "check": {
        "quick_questions": [
          {"q": "한 줄 질문", "expected_a": "짧은 답"}
        ]
      }
    }
  ]
}

[설계 규칙(중요)]
1) 단계당 ‘파일 1개 중심’ + 포인트 1~2개만. 절대 욕심내지 마라.
2) must_know_points는 “라인 번호”가 있으면 line으로, 없으면 “고유 스니펫”으로 위치를 찍어라.
3) 포인트는 “프로젝트 동작에 실제로 영향 있는 것”을 우선한다.
   - HTML: 구조(컨테이너), id/class(JS/CSS 연결), 리소스 연결(link/script)
   - CSS: 레이아웃 핵심(컨테이너 크기/position/overflow), 애니메이션/충돌 영향
   - JS: 상태 변수, 이벤트 리스너, main loop, DOM 선택(querySelector/getElementById)
   - Node: 정적 제공, 라우팅, API 프록시(키 보호)
4) do는 선택이지만, 항상 “5분짜리 선택 미션”은 제안해라.
5) 총 steps는 project_tree에서 “실제로 핵심인 파일들”을 우선으로 선정해라.
   - 예: index.html → style.css → game.js (또는 main.html → script1.js → script2.js → server.js 등)
6) level 정보가 있다면 lv1/lv2 난이도 차이를 반영하고, 없으면 lv1 기준으로 설계해ra.
7) 반드시 file_summary를 각 스텝의 files에 포함된 모든 파일에 대해 작성해ra.
   - one_liner: 초보자도 이해하기 쉽게 "~하는 파일이야!" 형식으로
   - metaphor: 이모지를 포함한 친근한 비유 (예: 게임기의 전원 버튼처럼 🎮, 레고 블록처럼 🧱)
`;

    const response = await client.chat.completions.create({
      model: pickModel("curriculum"),
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer and tutor. Always return valid JSON only, no markdown code blocks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const text = (response.choices[0]?.message?.content || "").trim();
    try {
      res.json({ ok: true, result: JSON.parse(text) });
    } catch {
      res.json({ ok: false, raw: text });
    }
  } catch (e) {
    console.error("커리큘럼 생성 오류:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/llm/explain", async (req, res) => {
  try {
    const { level, filePath, fileSnippet, selectedLine, question } = req.body;

    const levelPrompt =
      level === 1 ? `Beginner. Explain in very easy Korean.
- 1 sentence what it does
- 3 bullets in simple words
- 1 next thing to read
Avoid jargon; if needed, explain jargon in parentheses.` :
      `Intermediate. Explain in Korean.
- responsibilities and data flow
- key functions/components
- likely pitfalls`;

    const prompt = `
You are a helpful coding tutor.
${levelPrompt}

Context:
File: ${filePath}
SelectedLine: ${selectedLine ?? "none"}

Code:
${fileSnippet}

UserQuestion:
${question ?? "Explain the selected code/file."}

Rules:
- Be explicit about uncertainty; answer likely impacts, not guaranteed.
- Keep it concise but clear.
`;

    const response = await client.chat.completions.create({
      model: pickModel("explain"),
      messages: [
        {
          role: "system",
          content: "You are a helpful coding tutor. Always respond in Korean.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    res.json({ ok: true, answer: (response.choices[0]?.message?.content || "").trim() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ZIP 파일 업로드 및 추출
app.post("/api/project/upload", upload.single("zipFile"), async (req, res) => {
  try {
    // #region agent log
    debugLog({
      runId: "pre-fix",
      hypothesisId: "C",
      location: "server/index.mjs:/api/project/upload:entry",
      message: "upload route hit",
      data: {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        originalname: req.file?.originalname,
      },
    });
    // #endregion

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "ZIP 파일이 필요합니다" });
    }

    await ensureTempDir();
    const sessionId = generateSessionId();
    const projectPath = path.join(TEMP_DIR, sessionId);

    // ZIP 파일 추출
    const zip = await JSZip.loadAsync(req.file.buffer);
    await fs.mkdir(projectPath, { recursive: true });

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) {
        await fs.mkdir(path.join(projectPath, relativePath), { recursive: true });
      } else {
        const content = await zipEntry.async("nodebuffer");
        const fullPath = path.join(projectPath, relativePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
      }
    }

    // package.json 확인 및 의존성 설치
    const packageJsonPath = path.join(projectPath, "package.json");
    try {
      await fs.access(packageJsonPath);
      // npm install 실행
      const installProcess = spawn("npm", ["install"], {
        cwd: projectPath,
        shell: true,
        stdio: "pipe",
      });

      await new Promise((resolve, reject) => {
        installProcess.on("exit", (code) => {
          if (code === 0) {
            resolve();
          } else {
            console.warn(`npm install 경고 (코드: ${code})`);
            resolve(); // 실패해도 계속 진행
          }
        });
        installProcess.on("error", reject);
      });
    } catch {
      console.log("package.json이 없습니다. 의존성 설치를 건너뜁니다.");
    }

    projectSessions.set(sessionId, {
      projectPath,
      devServerProcess: null,
      previewServer: null,
      port: null,
      type: null,
    });

    // #region agent log
    debugLog({
      runId: "pre-fix",
      hypothesisId: "C",
      location: "server/index.mjs:/api/project/upload:success",
      message: "upload extracted ok",
      data: { sessionId },
    });
    // #endregion

    res.json({ ok: true, sessionId, projectPath });
  } catch (e) {
    console.error("ZIP 추출 오류:", e);
    // #region agent log
    debugLog({
      runId: "pre-fix",
      hypothesisId: "C",
      location: "server/index.mjs:/api/project/upload:catch",
      message: "upload handler error",
      data: { errorMessage: e instanceof Error ? e.message : String(e) },
    });
    // #endregion
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 파일 수정
app.post("/api/project/file", async (req, res) => {
  try {
    const { sessionId, filePath, content } = req.body;

    if (!sessionId || !filePath || content === undefined) {
      return res.status(400).json({ ok: false, error: "sessionId, filePath, content가 필요합니다" });
    }

    const session = projectSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: "세션을 찾을 수 없습니다" });
    }

    const fullPath = path.join(session.projectPath, filePath);
    
    // 경로 검증 (디렉토리 탈출 방지)
    if (!fullPath.startsWith(session.projectPath)) {
      return res.status(400).json({ ok: false, error: "잘못된 파일 경로입니다" });
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");

    // #region agent log
    debugLog({
      sessionId: "debug-session",
      runId: "post-fix",
      hypothesisId: "FILE_WRITE",
      location: "server/index.mjs:/api/project/file:afterWrite",
      message: "file written",
      data: {
        sessionId,
        filePath,
        fullPath,
        snippet: (content || "").slice(0, 200),
      },
      timestamp: Date.now(),
    });
    // #endregion

    res.json({ ok: true, message: "파일이 수정되었습니다" });
  } catch (e) {
    console.error("파일 수정 오류:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Vite dev server 시작
app.post("/api/project/dev-server/start", async (req, res) => {
  try {
    const { sessionId, port = 8080 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "sessionId가 필요합니다" });
    }

    const session = projectSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: "세션을 찾을 수 없습니다" });
    }

    if (session.devServerProcess || session.previewServer) {
      return res.json({ ok: true, message: "이미 실행 중입니다", port: session.port, type: session.type });
    }

    try {
      if (hasPackageJson(session.projectPath)) {
        const viteProcess = await startViteDevServer(session.projectPath, port);
        session.devServerProcess = viteProcess;
        session.previewServer = null;
        session.port = port;
        session.type = "vite";

        viteProcess.on("exit", () => {
          session.devServerProcess = null;
          session.port = null;
          session.type = null;
        });

        res.json({ ok: true, port, type: "vite", message: "Vite dev server가 시작되었습니다" });
      } else {
        const { server: staticServer, port: usedPort } = await startStaticServer(session.projectPath, port);
        session.previewServer = staticServer;
        session.devServerProcess = null;
        session.port = usedPort;
        session.type = "static";

        staticServer.on("close", () => {
          session.previewServer = null;
          session.port = null;
          session.type = null;
        });

        res.json({ ok: true, port: usedPort, type: "static", message: "정적 미리보기 서버가 시작되었습니다" });
      }
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  } catch (e) {
    console.error("Dev server 시작 오류:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Vite dev server 중지
app.post("/api/project/dev-server/stop", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "sessionId가 필요합니다" });
    }

    const session = projectSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: "세션을 찾을 수 없습니다" });
    }

    if (session.devServerProcess) {
      session.devServerProcess.kill();
      session.devServerProcess = null;
      session.previewServer = null;
      session.port = null;
      session.type = null;
      res.json({ ok: true, message: "Dev server가 중지되었습니다" });
    } else if (session.previewServer) {
      session.previewServer.close();
      session.previewServer = null;
      session.devServerProcess = null;
      session.port = null;
      session.type = null;
      res.json({ ok: true, message: "정적 미리보기 서버가 중지되었습니다" });
    } else {
      res.json({ ok: true, message: "실행 중인 dev server가 없습니다" });
    }
  } catch (e) {
    console.error("Dev server 중지 오류:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 세션 정리 (선택적)
app.post("/api/project/cleanup", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      const session = projectSessions.get(sessionId);
      if (session) {
        if (session.devServerProcess) {
          session.devServerProcess.kill();
        }
        if (session.previewServer) {
          session.previewServer.close();
        }
        // 디렉토리 삭제 (선택적)
        // await fs.rm(session.projectPath, { recursive: true, force: true });
        projectSessions.delete(sessionId);
      }
      res.json({ ok: true, message: "세션이 정리되었습니다" });
    } else {
      res.json({ ok: true, message: "sessionId가 제공되지 않았습니다" });
    }
  } catch (e) {
    console.error("세션 정리 오류:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 초기화
ensureTempDir().then(() => {
  // #region agent log
  debugLog({
    runId: "pre-fix",
    hypothesisId: "A",
    location: "server/index.mjs:listen",
    message: "server attempting to listen",
    data: { port: 3001 },
  });
  // #endregion

  app.listen(3001, () => {
    console.log("API server running on http://localhost:3001");
    // #region agent log
    debugLog({
      runId: "pre-fix",
      hypothesisId: "A",
      location: "server/index.mjs:listen:ready",
      message: "server listening",
      data: { port: 3001 },
    });
    // #endregion
  });
});
