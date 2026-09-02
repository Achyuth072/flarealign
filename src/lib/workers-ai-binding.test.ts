import { describe, it, expect } from "vitest";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool } from "ai";
import { TailorResumeSchema } from "./tool-schemas";
import { withDedupedToolCallEnvelopes } from "./workers-ai-binding";

// SSE frames captured verbatim from a live `env.AI.run(
// "@cf/meta/llama-3.3-70b-instruct-fp8-fast", { tools, stream: true })` call.
// Workers AI routes tool calls to @cf/meta/llama-3.3-70b-json, which repeats
// every argument delta in two envelopes on the SAME event: the native
// top-level `tool_calls` and the OpenAI-compatible `choices[0].delta.tool_calls`.
// Argument payloads are shortened; the envelope shape is untouched.
const ARG_CHUNKS = [
  '{"company": "',
  "Cloud",
  'flare", "jobTitle": "Software Engineer", "executiveSummary": "Edge engineer.", "tailoredBullets": ["Shipped Workers"]}',
];

const EXPECTED_INPUT = {
  company: "Cloudflare",
  jobTitle: "Software Engineer",
  executiveSummary: "Edge engineer.",
  tailoredBullets: ["Shipped Workers"],
};

const CAPTURED_EVENTS: unknown[] = [
  { choices: [{ delta: { content: "", role: "assistant" }, index: 0 }], response: "", tool_calls: [] },
  {
    choices: [
      {
        delta: {
          tool_calls: [
            { function: { name: "tailorResume" }, id: "chatcmpl-tool-acc9fca58cf68ba2", index: 0, type: "function" },
          ],
        },
        index: 0,
      },
    ],
    tool_calls: [{ name: "tailorResume" }],
  },
  ...ARG_CHUNKS.map((args) => ({
    choices: [{ delta: { tool_calls: [{ function: { arguments: args }, index: 0 }] }, index: 0 }],
    tool_calls: [{ arguments: args }],
  })),
  { choices: [], tool_calls: [] },
  { response: "", usage: { prompt_tokens: 965, completion_tokens: 143, total_tokens: 1108 } },
];

function sseStream(events: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

type Binding = Extract<Parameters<typeof createWorkersAI>[0], { binding: unknown }>["binding"];

function fakeBinding(events: unknown[]): Binding {
  return { run: async () => sseStream(events) } as unknown as Binding;
}

/** Drive the real provider + streamText path and report what the tool received. */
async function runToolCall(binding: Binding): Promise<{ input?: unknown; error?: string }> {
  const workersai = createWorkersAI({ binding });
  const result = streamText({
    model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    prompt: "Tailor my resume for Cloudflare.",
    tools: {
      tailorResume: tool({
        description: "Generate tailored resume bullet points.",
        inputSchema: TailorResumeSchema,
        execute: async (args) => args,
      }),
    },
  });

  let input: unknown;
  let error: string | undefined;
  for await (const part of result.fullStream) {
    if (part.type === "tool-call") input = part.input;
    if (part.type === "error") error = part.error instanceof Error ? part.error.message : String(part.error);
  }
  return { input, error };
}

// SSE frames for a plain assistant explanation (no tool call): Workers AI
// carries each token in both the native top-level `response` field and the
// OpenAI-compatible `choices[0].delta.content`, so workers-ai-provider emits
// every token twice — e.g. "This This function function call call...".
const TEXT_CHUNKS = ["This", " function", " call", " generates", " a", " tailored", " resume"];

const CAPTURED_TEXT_EVENTS: unknown[] = [
  { choices: [{ delta: { content: "", role: "assistant" }, index: 0 }], response: "", tool_calls: [] },
  ...TEXT_CHUNKS.map((t) => ({ choices: [{ delta: { content: t }, index: 0 }], response: t })),
  { choices: [{ delta: {}, finish_reason: "stop", index: 0 }], response: "" },
  { response: "", usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 } },
];

/** Drive the real provider + streamText path and report the assembled text. */
async function collectText(binding: Binding): Promise<string> {
  const workersai = createWorkersAI({ binding });
  const result = streamText({
    model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    prompt: "Explain the tool call.",
  });

  let text = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") text += part.text;
  }
  return text;
}

// For a purely-numeric token, Workers AI's native `response` field arrives as
// a bare JSON number (e.g. `90`, not `"90"`) while the OpenAI-compatible
// mirror still carries a string — workers-ai-provider defensively coerces
// this with `String(nativeResponse)` (streaming.ts), which is the tell that
// non-string `response` values are expected on the wire.
const NUMERIC_TEXT_EVENTS: unknown[] = [
  { choices: [{ delta: { content: "Skills Fit: ", role: "assistant" }, index: 0 }], response: "Skills Fit: " },
  { choices: [{ delta: { content: "90" }, index: 0 }], response: 90 },
  { choices: [{ delta: {}, finish_reason: "stop", index: 0 }], response: "" },
];

describe("withDedupedToolCallEnvelopes", () => {
  it("dedupes a numeric response chunk sent as a bare JSON number", async () => {
    const text = await collectText(withDedupedToolCallEnvelopes(fakeBinding(NUMERIC_TEXT_EVENTS)));
    expect(text).toBe("Skills Fit: 90");
  });

  it("delivers non-duplicated text from a stream carrying both envelopes", async () => {
    const text = await collectText(withDedupedToolCallEnvelopes(fakeBinding(CAPTURED_TEXT_EVENTS)));
    expect(text).toBe(TEXT_CHUNKS.join(""));
  });

  it("leaves a text stream that only uses the native envelope alone", async () => {
    const nativeOnly = CAPTURED_TEXT_EVENTS.map((event) => {
      const { choices: _choices, ...rest } = event as Record<string, unknown>;
      return rest;
    });
    const text = await collectText(withDedupedToolCallEnvelopes(fakeBinding(nativeOnly)));
    expect(text).toBe(TEXT_CHUNKS.join(""));
  });

  it("delivers valid tool input from a stream carrying both envelopes", async () => {
    const { input, error } = await runToolCall(
      withDedupedToolCallEnvelopes(fakeBinding(CAPTURED_EVENTS))
    );
    expect(error).toBeUndefined();
    expect(input).toEqual(EXPECTED_INPUT);
  });

  it("leaves a stream that only uses the native envelope alone", async () => {
    const nativeOnly = CAPTURED_EVENTS.map((event) => {
      const { choices: _choices, ...rest } = event as Record<string, unknown>;
      return rest;
    });
    const { input } = await runToolCall(withDedupedToolCallEnvelopes(fakeBinding(nativeOnly)));
    expect(input).toEqual(EXPECTED_INPUT);
  });

  // Fails once workers-ai-provider stops reading both envelopes, which is the
  // signal that this wrapper can be deleted.
  it("documents the provider defect the wrapper exists to work around", async () => {
    const { input } = await runToolCall(fakeBinding(CAPTURED_EVENTS));
    expect(input).toBe(
      '{"company": "{"company": "CloudCloudflare", "jobTitle": "Software Engineer", ' +
        '"executiveSummary": "Edge engineer.", "tailoredBullets": ["Shipped Workers"]}' +
        'flare", "jobTitle": "Software Engineer", "executiveSummary": "Edge engineer.", ' +
        '"tailoredBullets": ["Shipped Workers"]}'
    );
  });
});
