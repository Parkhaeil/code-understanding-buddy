import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // 스니펫만 보내면 2mb면 충분

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

app.listen(3001, () => console.log("API server running on http://localhost:3001"));
