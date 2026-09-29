// Pluggable LLM layer.
//
// Mock mode (default, zero-config): deterministic, template-based generation
// so the whole pipeline runs and looks tailored to the idea with no API key.
// Live mode: set OPENAI_API_KEY (preferred if both are set) or
// ANTHROPIC_API_KEY in .env.local to route through a real model.
//
// See docs/PRD.md FR6.

export function getMode(): "mock" | "live" {
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) return "live";
  return "mock";
}

export async function generateText(opts: {
  system: string;
  prompt: string;
  mockFallback: () => string;
}): Promise<string> {
  const { system, prompt, mockFallback } = opts;

  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(system, prompt);
    } catch (err) {
      console.error("[llm] OpenAI call failed, falling back to mock:", err);
      return mockFallback();
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(system, prompt);
    } catch (err) {
      console.error("[llm] Anthropic call failed, falling back to mock:", err);
      return mockFallback();
    }
  }

  return mockFallback();
}

async function callOpenAI(system: string, prompt: string): Promise<string> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(system: string, prompt: string): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}
