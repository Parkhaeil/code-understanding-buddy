import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { question, fileName, selectedCode, selectedRange } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json(
        { ok: false, error: "질문이 필요합니다." },
        { status: 400 }
      );
    }

    // 디버깅: 받은 데이터 확인
    console.log("API received:", {
      question: question.substring(0, 50),
      fileName,
      hasSelectedCode: !!selectedCode,
      selectedCodeLength: selectedCode?.length || 0,
      selectedCodePreview: selectedCode?.substring(0, 100),
      selectedRange,
    });

    // 선택된 코드가 있으면 스니펫 블록 생성
    const snippetBlock =
      selectedCode && selectedCode.trim()
        ? `\n\n[선택한 코드 스니펫]\n\`\`\`\n${selectedCode}\n\`\`\`\n(라인: ${selectedRange?.start}-${selectedRange?.end})`
        : "";

    const systemPrompt = `당신은 친절하고 이해하기 쉬운 프로그래밍 튜터입니다. 학습자가 코드를 이해하는 데 도움을 주는 것이 목표입니다.
- 답변은 한국어로 작성해주세요.
- 기술적인 용어를 사용하되, 쉬운 비유와 예시를 들어 설명해주세요.
- 코드가 선택된 경우, 해당 코드 구간을 중심으로 설명해주세요.
- 답변은 명확하고 구조화되어 있어야 합니다.`;

    const userPrompt = `파일: ${fileName}\n질문: ${question}${snippetBlock}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = response.choices[0]?.message?.content?.trim() || "";

    if (!answer) {
      return NextResponse.json(
        { ok: false, error: "답변을 생성할 수 없습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
