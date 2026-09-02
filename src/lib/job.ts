import { z } from "zod";
import { makeId } from "./scoring";

export const JobPostingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  experienceLevel: z.string(),
  rawDescription: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobPostingInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional().default("Remote"),
  requiredSkills: z.array(z.string()).optional().default([]),
  preferredSkills: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  experienceLevel: z.string().optional().default("Mid-Senior Level"),
  rawDescription: z.string().optional().default(""),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type JobPostingInput = z.input<typeof JobPostingInputSchema>;

export function normalizeJobPosting(input: JobPostingInput): JobPosting {
  const parsed = JobPostingInputSchema.parse(input);
  const now = Date.now();
  return {
    id: parsed.id && parsed.id.trim() !== "" ? parsed.id : makeId("job"),
    title: parsed.title.trim(),
    company: parsed.company.trim(),
    location: parsed.location ?? "Remote",
    requiredSkills: parsed.requiredSkills ?? [],
    preferredSkills: parsed.preferredSkills ?? [],
    responsibilities: parsed.responsibilities ?? [],
    experienceLevel: parsed.experienceLevel ?? "Mid-Senior Level",
    rawDescription: parsed.rawDescription ?? "",
    createdAt: parsed.createdAt || now,
    updatedAt: parsed.updatedAt || now,
  };
}

/**
 * Builds the structured extraction prompt for Workers AI.
 */
export function buildJobExtractionPrompt(
  rawText: string,
  hints?: Partial<JobPostingInput>
): string {
  const hintsBlock = [
    hints?.title ? `- Provided Title: ${hints.title}` : "",
    hints?.company ? `- Provided Company: ${hints.company}` : "",
    hints?.location ? `- Provided Location: ${hints.location}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are an expert technical recruiter and job posting parser.
Analyze the following unstructured job posting text and extract structured job requirements.

${hintsBlock ? `HINTS / USER INPUTS:\n${hintsBlock}\n` : ""}
UNSTRUCTURED JOB POSTING TEXT:
${rawText}

INSTRUCTIONS:
1. Extract the exact job title, hiring company name, and location (or "Remote" if unspecified).
2. Extract required technical skills and qualifications as a list of distinct skill names/technologies.
3. Extract preferred/nice-to-have skills as a list.
4. Extract key responsibilities and duties as a list of clear summary points.
5. Determine the experience level (e.g. "Senior (5+ years)", "Mid-Senior Level", "Staff / Principal", "Junior / Entry Level").
6. Output MUST strictly be valid JSON matching this schema:
{
  "title": "Software Engineer",
  "company": "Cloudflare",
  "location": "San Francisco, CA / Remote",
  "requiredSkills": ["TypeScript", "Distributed Systems", "Cloudflare Workers"],
  "preferredSkills": ["Rust", "Wasm"],
  "responsibilities": ["Design high-throughput edge systems", "Maintain developer runtime platforms"],
  "experienceLevel": "Senior (5+ years)"
}`;
}

/**
 * Parses and validates the structured extraction JSON output from Workers AI.
 */
export function parseJobExtractionResponse(rawContent: unknown): Partial<JobPostingInput> | null {
  if (!rawContent) return null;

  let text: string;
  if (typeof rawContent === "object") {
    const obj = rawContent as Record<string, unknown>;
    if (typeof obj.title === "string" || typeof obj.company === "string") {
      return {
        title: typeof obj.title === "string" ? obj.title.trim() : undefined,
        company: typeof obj.company === "string" ? obj.company.trim() : undefined,
        location: typeof obj.location === "string" ? obj.location.trim() : undefined,
        requiredSkills: Array.isArray(obj.requiredSkills)
          ? obj.requiredSkills
              .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
          : undefined,
        preferredSkills: Array.isArray(obj.preferredSkills)
          ? obj.preferredSkills
              .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
          : undefined,
        responsibilities: Array.isArray(obj.responsibilities)
          ? obj.responsibilities
              .filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0)
              .map((r: string) => r.trim())
          : undefined,
        experienceLevel: typeof obj.experienceLevel === "string" ? obj.experienceLevel.trim() : undefined,
      };
    }
    text = JSON.stringify(rawContent);
  } else if (typeof rawContent === "string") {
    text = rawContent.trim();
  } else {
    return null;
  }

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  } else {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
        company: typeof parsed.company === "string" ? parsed.company.trim() : undefined,
        location: typeof parsed.location === "string" ? parsed.location.trim() : undefined,
        requiredSkills: Array.isArray(parsed.requiredSkills)
          ? parsed.requiredSkills
              .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
          : undefined,
        preferredSkills: Array.isArray(parsed.preferredSkills)
          ? parsed.preferredSkills
              .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
          : undefined,
        responsibilities: Array.isArray(parsed.responsibilities)
          ? parsed.responsibilities
              .filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0)
              .map((r: string) => r.trim())
          : undefined,
        experienceLevel: typeof parsed.experienceLevel === "string" ? parsed.experienceLevel.trim() : undefined,
      };
    }
  } catch (err) {
    console.warn("Failed to parse JSON response from job extraction:", err);
  }

  return null;
}

const COMMON_TECH_KEYWORDS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Golang",
  "Rust",
  "Java",
  "C++",
  "C#",
  ".NET",
  "React",
  "Next.js",
  "Vue",
  "Svelte",
  "Node.js",
  "Cloudflare Workers",
  "Durable Objects",
  "Workflows",
  "Cloudflare",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "Redis",
  "Kafka",
  "RabbitMQ",
  "GraphQL",
  "REST",
  "gRPC",
  "Distributed Systems",
  "CI/CD",
  "Linux",
  "Git",
  "Terraform",
  "Microservices",
  "WebAssembly",
  "Wasm",
  "Tailwind",
  "HTML",
  "CSS",
  "SQL",
];

/**
 * Heuristic parser to extract structured fields from raw text without AI inference.
 */
export function extractJobPostingHeuristic(
  rawText: string,
  overrides?: Partial<JobPostingInput>
): JobPosting {
  const text = (rawText || "").trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Title Heuristics
  let extractedTitle = overrides?.title;
  if (!extractedTitle) {
    for (const line of lines.slice(0, 8)) {
      const match = line.match(/^(?:job\s*title|title|role|position)\s*[:\-]\s*(.+)$/i);
      if (match && match[1].trim()) {
        extractedTitle = match[1].trim();
        break;
      }
    }
  }
  const rolePattern = /\b((?:Senior|Staff|Principal|Lead|Junior|Associate)?\s*(?:Software|Frontend|Backend|Full[- ]?Stack|Systems|Infrastructure|Platform|Cloud|DevOps|Site Reliability|Security|Data|ML|AI|Product)?\s*(?:Engineer|Developer|Architect|Specialist|Manager))\b/i;
  if (!extractedTitle) {
    for (const line of lines.slice(0, 5)) {
      const roleMatch = line.match(rolePattern);
      if (roleMatch && roleMatch[1] && line.length < 120) {
        extractedTitle = roleMatch[1].trim();
        break;
      }
    }
  }
  if (!extractedTitle) {
    const inlineRoleMatch = text.match(rolePattern);
    if (inlineRoleMatch && inlineRoleMatch[1]) {
      extractedTitle = inlineRoleMatch[1].trim();
    }
  }
  if (!extractedTitle && lines.length > 0 && lines[0].length < 60 && !lines[0].includes("http")) {
    extractedTitle = lines[0];
  }
  const title = extractedTitle?.trim() || "Software Engineer";

  // 2. Company Heuristics
  let extractedCompany = overrides?.company;
  if (!extractedCompany) {
    for (const line of lines.slice(0, 10)) {
      const match = line.match(/^(?:company|organization|employer)\s*[:\-]\s*(.+)$/i);
      if (match && match[1].trim()) {
        extractedCompany = match[1].trim();
        break;
      }
    }
  }
  if (!extractedCompany) {
    const joinMatch = text.match(/(?:join|at|@|about)\s+([A-Z][A-Za-z0-9\s&.,'-]{1,30}?)(?:\s+to|\s+as|\s+team|\s+is|\.|\n|$)/i);
    if (joinMatch && joinMatch[1].trim()) {
      extractedCompany = joinMatch[1].trim();
    }
  }
  const company = extractedCompany?.trim() || "Target Company";

  // 3. Location Heuristics
  let extractedLocation = overrides?.location;
  if (!extractedLocation) {
    for (const line of lines) {
      const match = line.match(/^(?:location|place|office)\s*[:\-]\s*(.+)$/i);
      if (match && match[1].trim()) {
        extractedLocation = match[1].trim();
        break;
      }
    }
  }
  if (!extractedLocation) {
    if (/\bremote\b/i.test(text)) {
      extractedLocation = "Remote";
    } else if (/\bhybrid\b/i.test(text)) {
      extractedLocation = "Hybrid";
    } else if (/\bon[- ]?site\b/i.test(text)) {
      extractedLocation = "On-site";
    }
  }
  const location = extractedLocation?.trim() || "Remote";

  // 4. Experience Level Heuristics
  let extractedExp = overrides?.experienceLevel;
  if (!extractedExp) {
    const expMatch = text.match(/(\d+\+?\s*(?:-\s*\d+\+?)?\s*years(?:\s+of\s+experience)?)/i);
    if (expMatch) {
      extractedExp = expMatch[1];
    } else if (/\bprincipal\b/i.test(title) || /\bprincipal\b/i.test(text)) {
      extractedExp = "Principal Level (8+ years)";
    } else if (/\bstaff\b/i.test(title) || /\bstaff\b/i.test(text)) {
      extractedExp = "Staff Level (6+ years)";
    } else if (/\bsenior\b/i.test(title) || /\bsenior\b/i.test(text)) {
      extractedExp = "Senior Level (4+ years)";
    } else if (/\bjunior\b/i.test(title) || /\bentry\b/i.test(title)) {
      extractedExp = "Entry / Junior Level";
    }
  }
  const experienceLevel = extractedExp?.trim() || "Mid-Senior Level";

  // 5. Skills Heuristics
  let requiredSkills = overrides?.requiredSkills && overrides.requiredSkills.length > 0
    ? [...overrides.requiredSkills]
    : [];

  let preferredSkills = overrides?.preferredSkills && overrides.preferredSkills.length > 0
    ? [...overrides.preferredSkills]
    : [];

  if (requiredSkills.length === 0) {
    // Scan text for known tech keywords
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    for (const kw of COMMON_TECH_KEYWORDS) {
      // Word boundary match
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(text) || (kw === "C++" && text.includes("C++")) || (kw === "C#" && text.includes("C#"))) {
        foundKeywords.push(kw);
      }
    }
    requiredSkills = foundKeywords.slice(0, 10);
  }

  // 6. Responsibilities Heuristics
  let responsibilities = overrides?.responsibilities && overrides.responsibilities.length > 0
    ? [...overrides.responsibilities]
    : [];

  if (responsibilities.length === 0) {
    // Extract bullet points from text
    const bulletLines = lines
      .filter((l) => /^[-*•\d+.]\s+/.test(l))
      .map((l) => l.replace(/^[-*•\d+.]\s+/, "").trim())
      .filter((l) => l.length > 15 && l.length < 200);

    if (bulletLines.length > 0) {
      responsibilities = bulletLines.slice(0, 5);
    }
  }

  return normalizeJobPosting({
    ...overrides,
    title,
    company,
    location,
    requiredSkills,
    preferredSkills,
    responsibilities,
    experienceLevel,
    rawDescription: text,
  });
}

/**
 * Extracts structured JobPosting using Workers AI with automatic fallback to heuristic extraction.
 */
export async function extractJobPosting(
  aiBinding: { run: (model: string, input: unknown) => Promise<unknown> } | undefined | null,
  rawText: string,
  overrides?: Partial<JobPostingInput>
): Promise<JobPosting> {
  const trimmed = (rawText || "").trim();

  if (aiBinding && typeof aiBinding.run === "function" && trimmed.length > 0) {
    try {
      const prompt = buildJobExtractionPrompt(trimmed, overrides);
      const response = await aiBinding.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical recruiter and job posting parser. Extract structured details from the unstructured job posting text. Always return strictly valid JSON matching the schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const rawContent =
        typeof response === "string"
          ? response
          : (response as { response?: unknown; result?: { response?: unknown } })?.response ||
            (response as { result?: { response?: unknown } })?.result?.response ||
            response;

      const parsed = parseJobExtractionResponse(rawContent);
      if (parsed && (parsed.title || parsed.company || (parsed.requiredSkills && parsed.requiredSkills.length > 0))) {
        return normalizeJobPosting({
          ...parsed,
          ...overrides,
          title: overrides?.title || parsed.title || "Software Engineer",
          company: overrides?.company || parsed.company || "Target Company",
          rawDescription: trimmed,
        });
      }
    } catch (err) {
      console.warn("AI job extraction failed, falling back to heuristic extraction:", err);
    }
  }

  return extractJobPostingHeuristic(trimmed, overrides);
}

