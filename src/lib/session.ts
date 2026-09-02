export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function formatAgentSessionName(userId: string, sessionId: string): string {
  return `session__${userId}__${sessionId}`;
}

export function formatUserActorName(userId: string): string {
  return `user__${userId}`;
}

export function parseUserIdFromAgentName(name: string): string | null {
  if (!name) return null;

  // Pattern: session__userId__sessionId
  if (name.startsWith("session__")) {
    const parts = name.split("__");
    if (parts.length >= 3) {
      return parts.slice(1, -1).join("__");
    }
  }

  // Pattern: user__userId
  if (name.startsWith("user__")) {
    return name.slice(6);
  }

  // Pattern: session:userId:sessionId (legacy compatibility)
  if (name.startsWith("session:")) {
    const parts = name.split(":");
    if (parts.length >= 3) {
      return parts.slice(1, -1).join(":");
    }
  }

  // Pattern: user:userId (legacy compatibility)
  if (name.startsWith("user:")) {
    return name.slice(5);
  }

  // Backward compatibility with dash separators if any: session-USERID-SESSIONID
  if (name.startsWith("session-")) {
    const match = name.match(/^session-(.+)-([^-]+)$/);
    if (match) {
      return match[1];
    }
  }

  if (name.startsWith("user-")) {
    return name.slice(5);
  }

  return name;
}
