import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const { treeSummary, coreCandidates, snippets, projectName } = await req.json();

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
- Prefer files that represent entry, routing, main UI, API, data model, config.

Project: ${projectName}

TREE_SUMMARY:
${treeSummary}

CORE_CANDIDATES:
${coreCandidates.join("\n")}

SNIPPETS:
${Object.entries(snippets).map(([p,s])=>`--- ${p} ---\n${s}\n`).join("\n")}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    const text = response.choices[0]?.message?.content?.trim() || "";

    // Remove markdown code blocks if present
    const cleanedText = text.replace(/^```json\s*|\s*```$/g, "").trim();

    try {
      const json = JSON.parse(cleanedText);
      return NextResponse.json({ ok: true, result: json });
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", text);
      return NextResponse.json({ ok: false, raw: text, error: "Failed to parse JSON" }, { status: 500 });
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
