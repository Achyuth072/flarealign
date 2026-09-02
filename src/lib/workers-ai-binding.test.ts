import { describe, it, expect } from "vitest";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool, isStepCount } from "ai";
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

  it("delivers valid tool input from a stream with CRLF (\\r\\n\\r\\n) boundaries", async () => {
    function crlfSseStream(events: unknown[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          for (const event of events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\r\n\r\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\r\n\r\n"));
          controller.close();
        },
      });
    }

    const { input, error } = await runToolCall(
      withDedupedToolCallEnvelopes({ run: async () => crlfSseStream(CAPTURED_EVENTS) } as unknown as Binding)
    );
    expect(error).toBeUndefined();
    expect(input).toEqual(EXPECTED_INPUT);
  });

  it("handles streams fragmented across arbitrary byte chunks", async () => {
    function fragmentedSseStream(events: unknown[], chunkSize = 5): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      let fullText = "";
      for (const event of events) {
        fullText += `data: ${JSON.stringify(event)}\r\n\r\n`;
      }
      fullText += "data: [DONE]\r\n\r\n";
      const fullBytes = encoder.encode(fullText);

      return new ReadableStream({
        start(controller) {
          for (let i = 0; i < fullBytes.length; i += chunkSize) {
            controller.enqueue(fullBytes.slice(i, i + chunkSize));
          }
          controller.close();
        },
      });
    }

    const { input, error } = await runToolCall(
      withDedupedToolCallEnvelopes({ run: async () => fragmentedSseStream(CAPTURED_EVENTS, 5) } as unknown as Binding)
    );
    expect(error).toBeUndefined();
    expect(input).toEqual(EXPECTED_INPUT);
  });

  it("handles multi-step tool call and streams UI response properly", async () => {
    let callIndex = 0;
    const multiStepBinding: Binding = {
      run: async (_model: string, _inputs: unknown) => {
        callIndex++;
        if (callIndex === 1) {
          return sseStream(CAPTURED_EVENTS);
        }
        return sseStream(CAPTURED_TEXT_EVENTS);
      },
    } as unknown as Binding;

    const workersai = createWorkersAI({ binding: withDedupedToolCallEnvelopes(multiStepBinding) });
    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      prompt: "Tailor resume",
      tools: {
        tailorResume: tool({
          description: "Generate tailored resume",
          inputSchema: TailorResumeSchema,
          execute: async (args) => {
            return { tailored: true, args };
          },
        }),
      },
      stopWhen: isStepCount(5),
    });

    const uiResponse = result.toUIMessageStreamResponse();
    const reader = uiResponse.body!.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }
    const fullUIStream = chunks.join("");
    const uiLines = fullUIStream.split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]");
    const parts: any[] = [];
    for (const line of uiLines) {
      const data = JSON.parse(line.slice(6));
      if (data.type === "start-step" || data.type === "finish-step") continue;
      if (data.type === "start" || data.type === "finish") continue;
      if (data.type === "tool-input-start") {
        parts.push({ type: `tool-${data.toolName}`, toolCallId: data.toolCallId, toolName: data.toolName, state: "input-streaming" });
      } else if (data.type === "tool-input-available") {
        const p = parts.find((x) => x.toolCallId === data.toolCallId);
        if (p) {
          p.state = "input-available";
          p.input = data.input;
        }
      } else if (data.type === "tool-output-available") {
        const p = parts.find((x) => x.toolCallId === data.toolCallId);
        if (p) {
          p.state = "output-available";
          p.output = data.output;
        }
      } else if (data.type === "text-start") {
        parts.push({ type: "text", text: "", state: "streaming" });
      } else if (data.type === "text-delta") {
        const last = parts.filter((p) => p.type === "text").pop();
        if (last) last.text += data.delta;
      }
    }

    expect(parts.length).toBe(2);
    expect(parts[0].type).toBe("tool-tailorResume");
    expect(parts[0].state).toBe("output-available");
    expect(parts[1].type).toBe("text");
    expect(parts[1].text).toBe(TEXT_CHUNKS.join(""));
  });

  it("normalizes tool call IDs in assistant and tool messages to strip provider suffix markers", async () => {
    let capturedInputs: any = null;
    const testBinding: Binding = {
      run: async (_model: string, inputs: unknown) => {
        capturedInputs = inputs;
        return sseStream(CAPTURED_TEXT_EVENTS);
      },
    } as unknown as Binding;

    const proxy = withDedupedToolCallEnvelopes(testBinding);
    await proxy.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_123::cf-wai-tool-call::45678",
              type: "function",
              function: { name: "scoreJobFit", arguments: "{}" },
            },
          ],
        },
        {
          role: "tool",
          name: "scoreJobFit",
          tool_call_id: "call_123",
          content: "{\"score\":85}",
        },
      ],
    } as any);

    expect(capturedInputs).toBeDefined();
    expect(capturedInputs.messages[1].tool_calls[0].id).toBe("call_123");
    expect(capturedInputs.messages[2].tool_call_id).toBe("call_123");
  });
});


