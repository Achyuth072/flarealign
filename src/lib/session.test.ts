import { describe, it, expect } from "vitest";
import {
  parseUserIdFromAgentName,
  formatAgentSessionName,
  formatUserActorName,
  generateId,
} from "./session";

describe("session utilities", () => {
  it("formats agent session name with URL-safe delimiter", () => {
    const formatted = formatAgentSessionName("user-123", "sess-456");
    expect(formatted).toBe("session__user-123__sess-456");
  });

  it("formats user actor name correctly", () => {
    const formatted = formatUserActorName("user-123");
    expect(formatted).toBe("user__user-123");
  });

  it("parses userId from session agent name with URL-safe separator", () => {
    const userId = parseUserIdFromAgentName("session__user-123__sess-456");
    expect(userId).toBe("user-123");
  });

  it("parses userId when userId is a UUID", () => {
    const rawUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const rawSessionId = "f9e8d7c6-b5a4-3210-fedc-ba0987654321";
    const agentName = formatAgentSessionName(rawUserId, rawSessionId);
    expect(agentName).toBe(`session__${rawUserId}__${rawSessionId}`);

    const extracted = parseUserIdFromAgentName(agentName);
    expect(extracted).toBe(rawUserId);
  });

  it("parses userId from user actor name", () => {
    const userId = parseUserIdFromAgentName("user__u-999");
    expect(userId).toBe("u-999");
  });

  it("handles legacy colon and dash formats gracefully", () => {
    expect(parseUserIdFromAgentName("session:user-123:sess-456")).toBe("user-123");
    expect(parseUserIdFromAgentName("user:u-999")).toBe("u-999");
    expect(parseUserIdFromAgentName("candidate-session")).toBe("candidate-session");
  });

  it("generates a valid non-empty ID", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
