import { generateId, formatAgentSessionName } from "../lib/session";

const USER_ID_KEY = "flarealign_user_id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "anonymous-user";
  }

  let userId = window.localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateId();
    window.localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function createFreshSessionId(): string {
  return generateId();
}

export function getClientSessionConfig(): { userId: string; sessionId: string; agentSessionName: string } {
  const userId = getOrCreateUserId();
  const sessionId = createFreshSessionId();
  const agentSessionName = formatAgentSessionName(userId, sessionId);
  return { userId, sessionId, agentSessionName };
}
