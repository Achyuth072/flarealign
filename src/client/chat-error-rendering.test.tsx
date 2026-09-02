import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("agents/react", () => ({ useAgent: () => ({}) }));

const chatState: {
  messages: unknown[];
  status: string;
  error: Error | undefined;
} = { messages: [], status: "ready", error: undefined };

vi.mock("@cloudflare/ai-chat/react", () => ({
  useAgentChat: () => ({
    messages: chatState.messages,
    status: chatState.status,
    error: chatState.error,
    sendMessage: () => {},
    clearHistory: () => {},
  }),
}));

const { App } = await import("./App");

const QUOTA_ERROR =
  "4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.";
// The apostrophe in the message is HTML-escaped in the rendered markup.
const QUOTA_ERROR_PREFIX = "4006: you have used up your daily free allocation of 10,000 neurons";

function countErrorBubbles(html: string): number {
  return (html.match(/Evaluation failed/g) ?? []).length;
}

describe("failed-turn chat rendering", () => {
  // A failed turn leaves TWO contentless assistant messages in `messages`: the one
  // opened by the server's `start` frame, and one minted client-side by
  // useAgentChat when the trailing `done` frame arrives after the `error` frame.
  // Captured verbatim from a live turn against `wrangler dev`.
  const failedTurnMessages = [
    {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Evaluate candidate fit for Full-Stack Developer at Monefy." }],
    },
    { id: "assistant_1788359989474_3qvzz1se2", role: "assistant", parts: [] },
    { id: "2rmD6RvykF1leo-HNBgCn", role: "assistant", parts: [] },
  ];

  it("renders the stream error once, not once per contentless assistant message", () => {
    chatState.messages = failedTurnMessages;
    chatState.status = "error";
    chatState.error = new Error(QUOTA_ERROR);

    const html = renderToString(<App />);

    expect(html).toContain(QUOTA_ERROR_PREFIX);
    expect(countErrorBubbles(html)).toBe(1);
  });

  it("still renders the error when the turn leaves a single contentless assistant message", () => {
    chatState.messages = failedTurnMessages.slice(0, 2);
    chatState.status = "error";
    chatState.error = new Error(QUOTA_ERROR);

    const html = renderToString(<App />);

    expect(countErrorBubbles(html)).toBe(1);
  });

  it("shows the streaming placeholder while a turn is still in flight", () => {
    chatState.messages = failedTurnMessages.slice(0, 2);
    chatState.status = "streaming";
    chatState.error = undefined;

    const html = renderToString(<App />);

    expect(html).toContain("Evaluating on Cloudflare Edge");
    expect(countErrorBubbles(html)).toBe(0);
  });
});
