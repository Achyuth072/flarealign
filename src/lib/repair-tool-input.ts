/**
 * Workers AI's constrained-JSON llama variant intermittently emits tool
 * arguments as strings, so arrays arrive as `"[\"a\", \"b\"]"` — or as a Python
 * repr, `"['a', 'b']"` — and fail input validation before the tool runs.
 *
 * Only reachable once validation has already failed, so converting a string
 * that merely looks like a container cannot break an otherwise-valid call.
 */
export function repairStringifiedContainers(rawInput: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  let repairedAny = false;

  // Recursive: a well-formed outer array can still hold stringified inner ones.
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const container = parseContainer(value);
      if (container === undefined) return value;
      repairedAny = true;
      return walk(container);
    }
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, walk(item)])
      );
    }
    return value;
  };

  const repaired = walk(parsed);
  return repairedAny ? JSON.stringify(repaired) : null;
}

function parseContainer(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Best-effort Python repr recovery. Gives up on apostrophes inside items,
    // in which case the original ZodError surfaces to the caller unchanged.
    try {
      return JSON.parse(trimmed.replace(/'/g, '"'));
    } catch {
      return undefined;
    }
  }
}
