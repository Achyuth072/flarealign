import type { createWorkersAI } from "workers-ai-provider";

export type WorkersAIBinding = Extract<
  Parameters<typeof createWorkersAI>[0],
  { binding: unknown }
>["binding"];

/**
 * Workers AI repeats streamed content twice on the same SSE event: once
 * under a native top-level field (`tool_calls`, `response`) and again under
 * the OpenAI-compatible equivalent (`choices[0].delta.tool_calls`,
 * `choices[0].delta.content`). workers-ai-provider@4.0.0 reads each pair in
 * independent `if` branches, so it appends both — tool-call arguments arrive
 * interleaved and fail JSON.parse (`{"jobTitle": "{"jobTitle": "`), and plain
 * assistant text arrives with every token doubled ("This This function
 * function call call...").
 *
 * Drop the native envelope on events that carry both, leaving exactly one for
 * the provider. Events using only the native shape pass through untouched.
 */
export function withDedupedToolCallEnvelopes(binding: WorkersAIBinding): WorkersAIBinding {
  return new Proxy(binding, {
    get(target, prop, receiver) {
      if (prop !== "run") {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (...args: unknown[]) => {
        const result = await (target.run as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        return result instanceof ReadableStream ? result.pipeThrough(dedupeStream()) : result;
      };
    },
  });
}

function dedupeStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const emitLine = (rawLine: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }
    const deduped = dedupeLine(trimmed);
    controller.enqueue(encoder.encode(`${deduped}\n\n`));
  };

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        emitLine(line, controller);
      }
    },
    flush(controller) {
      buffer += decoder.decode();
      if (buffer.trim().length > 0) {
        emitLine(buffer, controller);
      }
    },
  });
}

function dedupeLine(line: string): string {
  if (line === "data: [DONE]" || line === "data:[DONE]") {
    return "data: [DONE]";
  }
  if (!line.startsWith("data:") && !line.startsWith("data: ")) {
    return line;
  }

  const payload = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
  let chunk: Record<string, unknown>;
  try {
    chunk = JSON.parse(payload);
  } catch {
    return line;
  }

  const choices = chunk.choices as
    | { delta?: { tool_calls?: unknown; content?: unknown } }[]
    | undefined;
  const delta = choices?.[0]?.delta;
  let deduped = false;

  const deltaToolCalls = delta?.tool_calls;
  if (
    Array.isArray(deltaToolCalls) &&
    deltaToolCalls.length > 0 &&
    Array.isArray(chunk.tool_calls) &&
    chunk.tool_calls.length > 0
  ) {
    delete chunk.tool_calls;
    deduped = true;
  }

  // Mirror workers-ai-provider's own presence check for `response`
  // (`nativeResponse != null && nativeResponse !== ""` in streaming.ts) rather
  // than assuming it's always a string — Workers AI sends purely-numeric
  // tokens (e.g. a score like `90`) as a bare JSON number, which the provider
  // coerces with `String(nativeResponse)` but a `typeof === "string"` guard
  // here would miss, letting that chunk double ("90" -> "9090").
  const deltaContent = delta?.content;
  if (typeof deltaContent === "string" && deltaContent.length > 0 && chunk.response != null && chunk.response !== "") {
    delete chunk.response;
    deduped = true;
  }

  return deduped ? `data: ${JSON.stringify(chunk)}` : `data: ${payload}`;
}
