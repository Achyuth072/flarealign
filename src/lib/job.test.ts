import { describe, it, expect, vi } from "vitest";
import {
  JobPostingSchema,
  JobPostingInputSchema,
  normalizeJobPosting,
  JobPosting,
  buildJobExtractionPrompt,
  parseJobExtractionResponse,
  extractJobPostingHeuristic,
  extractJobPosting,
} from "./job";

describe("JobPosting Schema and Normalization", () => {
  const validJobPosting: JobPosting = {
    id: "job-123",
    title: "Software Engineer – Edge Platform",
    company: "Cloudflare",
    location: "San Francisco, CA / Remote",
    requiredSkills: ["TypeScript", "Distributed Systems", "Cloudflare Workers"],
    preferredSkills: ["Rust", "Wasm", "Durable Objects"],
    responsibilities: [
      "Architect and scale edge developer runtime platforms.",
      "Design zero-downtime distributed storage systems.",
    ],
    experienceLevel: "Senior (5+ years)",
    rawDescription: "Join Cloudflare to build the future of the edge runtime.",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it("validates a full, valid JobPosting against JobPostingSchema", () => {
    const parsed = JobPostingSchema.parse(validJobPosting);
    expect(parsed.id).toBe("job-123");
    expect(parsed.title).toBe("Software Engineer – Edge Platform");
    expect(parsed.company).toBe("Cloudflare");
    expect(parsed.location).toBe("San Francisco, CA / Remote");
    expect(parsed.requiredSkills).toHaveLength(3);
    expect(parsed.preferredSkills).toHaveLength(3);
    expect(parsed.responsibilities).toHaveLength(2);
    expect(parsed.experienceLevel).toBe("Senior (5+ years)");
    expect(parsed.rawDescription).toContain("Join Cloudflare");
    expect(parsed.createdAt).toBe(1700000000000);
    expect(parsed.updatedAt).toBe(1700000000000);
  });

  it("rejects JobPostingSchema when required fields are missing or invalid", () => {
    // Missing title
    expect(() =>
      JobPostingSchema.parse({ ...validJobPosting, title: "" })
    ).toThrow();

    // Missing company
    expect(() =>
      JobPostingSchema.parse({ ...validJobPosting, company: "" })
    ).toThrow();

    // Missing ID
    expect(() =>
      JobPostingSchema.parse({ ...validJobPosting, id: "" })
    ).toThrow();

    // Invalid non-array skills
    expect(() =>
      JobPostingSchema.parse({ ...validJobPosting, requiredSkills: "TypeScript" as unknown as string[] })
    ).toThrow();
  });

  it("validates JobPostingInputSchema and applies default values", () => {
    const minimalInput = {
      title: "Backend Engineer",
      company: "Acme Corp",
    };

    const parsed = JobPostingInputSchema.parse(minimalInput);
    expect(parsed.title).toBe("Backend Engineer");
    expect(parsed.company).toBe("Acme Corp");
    expect(parsed.location).toBe("Remote");
    expect(parsed.requiredSkills).toEqual([]);
    expect(parsed.preferredSkills).toEqual([]);
    expect(parsed.responsibilities).toEqual([]);
    expect(parsed.experienceLevel).toBe("Mid-Senior Level");
    expect(parsed.rawDescription).toBe("");
  });

  it("normalizes job posting with generated ID and timestamps when omitted", () => {
    const normalized = normalizeJobPosting({
      title: "  Staff Distributed Systems Engineer  ",
      company: "  Cloudflare  ",
      requiredSkills: ["Rust", "Distributed Systems"],
    });

    expect(normalized.id).toMatch(/^job-/);
    expect(normalized.title).toBe("Staff Distributed Systems Engineer");
    expect(normalized.company).toBe("Cloudflare");
    expect(normalized.location).toBe("Remote");
    expect(normalized.requiredSkills).toEqual(["Rust", "Distributed Systems"]);
    expect(normalized.preferredSkills).toEqual([]);
    expect(normalized.responsibilities).toEqual([]);
    expect(normalized.experienceLevel).toBe("Mid-Senior Level");
    expect(normalized.rawDescription).toBe("");
    expect(typeof normalized.createdAt).toBe("number");
    expect(typeof normalized.updatedAt).toBe("number");
  });

  it("preserves explicit ID and timestamps during normalization", () => {
    const explicitTime = 1690000000000;
    const normalized = normalizeJobPosting({
      id: "job-custom-99",
      title: "Solutions Engineer",
      company: "Cloudflare",
      location: "Austin, TX",
      createdAt: explicitTime,
      updatedAt: explicitTime + 1000,
    });

    expect(normalized.id).toBe("job-custom-99");
    expect(normalized.location).toBe("Austin, TX");
    expect(normalized.createdAt).toBe(explicitTime);
    expect(normalized.updatedAt).toBe(explicitTime + 1000);
  });
});

describe("buildJobExtractionPrompt", () => {
  it("includes raw text in the prompt", () => {
    const prompt = buildJobExtractionPrompt("Senior Systems Engineer at Cloudflare. Rust, distributed systems.");
    expect(prompt).toContain("Senior Systems Engineer at Cloudflare. Rust, distributed systems.");
    expect(prompt).toContain("INSTRUCTIONS:");
  });

  it("includes hint overrides when provided", () => {
    const prompt = buildJobExtractionPrompt("Some text", {
      title: "Staff SRE",
      company: "Cloudflare",
      location: "Austin, TX",
    });
    expect(prompt).toContain("Provided Title: Staff SRE");
    expect(prompt).toContain("Provided Company: Cloudflare");
    expect(prompt).toContain("Provided Location: Austin, TX");
  });
});

describe("parseJobExtractionResponse", () => {
  it("parses clean JSON response object", () => {
    const parsed = parseJobExtractionResponse({
      title: "Senior Backend Engineer",
      company: "Stripe",
      location: "San Francisco, CA",
      requiredSkills: ["Go", "PostgreSQL"],
      preferredSkills: ["Kubernetes"],
      responsibilities: ["Build payment APIs"],
      experienceLevel: "Senior (5+ years)",
    });

    expect(parsed).toEqual({
      title: "Senior Backend Engineer",
      company: "Stripe",
      location: "San Francisco, CA",
      requiredSkills: ["Go", "PostgreSQL"],
      preferredSkills: ["Kubernetes"],
      responsibilities: ["Build payment APIs"],
      experienceLevel: "Senior (5+ years)",
    });
  });

  it("parses code-fenced JSON string", () => {
    const raw = "```json\n{\n  \"title\": \"Cloud Architect\",\n  \"company\": \"AWS\",\n  \"location\": \"Seattle, WA\",\n  \"requiredSkills\": [\"AWS\", \"Terraform\"]\n}\n```";
    const parsed = parseJobExtractionResponse(raw);
    expect(parsed?.title).toBe("Cloud Architect");
    expect(parsed?.company).toBe("AWS");
    expect(parsed?.location).toBe("Seattle, WA");
    expect(parsed?.requiredSkills).toEqual(["AWS", "Terraform"]);
  });

  it("parses JSON embedded with leading/trailing commentary", () => {
    const raw = "Here is the extracted job posting:\n{\"title\": \"Full Stack Engineer\", \"company\": \"Vercel\", \"requiredSkills\": [\"Next.js\", \"TypeScript\"]}\nHope this helps!";
    const parsed = parseJobExtractionResponse(raw);
    expect(parsed?.title).toBe("Full Stack Engineer");
    expect(parsed?.company).toBe("Vercel");
    expect(parsed?.requiredSkills).toEqual(["Next.js", "TypeScript"]);
  });

  it("returns null for malformed or non-JSON input", () => {
    expect(parseJobExtractionResponse(null)).toBeNull();
    expect(parseJobExtractionResponse("")).toBeNull();
    expect(parseJobExtractionResponse("Not JSON at all")).toBeNull();
  });
});

describe("extractJobPostingHeuristic", () => {
  it("parses structured job posting with key-value lines", () => {
    const rawText = `
Job Title: Principal Edge Systems Architect
Company: Cloudflare
Location: Austin, TX / Remote
Experience: 8+ years of experience

Requirements:
- TypeScript, Cloudflare Workers, Durable Objects
- Distributed Systems, Rust, WebAssembly

Responsibilities:
- Architect next-generation edge execution runtimes.
- Drive technical strategy across platform engineering.
    `.trim();

    const job = extractJobPostingHeuristic(rawText);
    expect(job.title).toBe("Principal Edge Systems Architect");
    expect(job.company).toBe("Cloudflare");
    expect(job.location).toBe("Austin, TX / Remote");
    expect(job.experienceLevel).toContain("8+ years");
    expect(job.requiredSkills).toContain("TypeScript");
    expect(job.requiredSkills).toContain("Cloudflare Workers");
    expect(job.requiredSkills).toContain("Durable Objects");
    expect(job.requiredSkills).toContain("Rust");
    expect(job.responsibilities.length).toBeGreaterThanOrEqual(1);
    expect(job.rawDescription).toBe(rawText);
  });

  it("extracts from unstructured natural language text", () => {
    const rawText = "Join Stripe as a Senior Backend Engineer in San Francisco, CA. We are looking for engineers with 5+ years of experience in Go, PostgreSQL, Docker, and Kubernetes.";
    const job = extractJobPostingHeuristic(rawText);

    expect(job.title).toContain("Senior Backend Engineer");
    expect(job.company).toBe("Stripe");
    expect(job.experienceLevel).toContain("5+ years");
    expect(job.requiredSkills).toContain("Go");
    expect(job.requiredSkills).toContain("PostgreSQL");
    expect(job.requiredSkills).toContain("Docker");
    expect(job.requiredSkills).toContain("Kubernetes");
  });

  it("applies user-supplied overrides over heuristic extraction", () => {
    const rawText = "Random text without explicit header";
    const job = extractJobPostingHeuristic(rawText, {
      title: "Staff Security Engineer",
      company: "Cloudflare",
      location: "London, UK",
      requiredSkills: ["Cryptography", "Rust"],
    });

    expect(job.title).toBe("Staff Security Engineer");
    expect(job.company).toBe("Cloudflare");
    expect(job.location).toBe("London, UK");
    expect(job.requiredSkills).toEqual(["Cryptography", "Rust"]);
  });

  it("handles empty string gracefully with sensible defaults", () => {
    const job = extractJobPostingHeuristic("");
    expect(job.title).toBe("Software Engineer");
    expect(job.company).toBe("Target Company");
    expect(job.location).toBe("Remote");
    expect(job.experienceLevel).toBe("Mid-Senior Level");
    expect(job.requiredSkills).toEqual([]);
    expect(job.responsibilities).toEqual([]);
    expect(job.rawDescription).toBe("");
  });
});

describe("extractJobPosting (with AI and fallback)", () => {
  it("uses AI binding when it returns valid JSON", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          title: "Senior AI Infrastructure Engineer",
          company: "OpenAI",
          location: "San Francisco, CA",
          requiredSkills: ["Python", "PyTorch", "Kubernetes", "CUDA"],
          preferredSkills: ["Rust", "Triton"],
          responsibilities: ["Scale GPU training clusters", "Optimize LLM inference latency"],
          experienceLevel: "Senior (5+ years)",
        }),
      }),
    };

    const job = await extractJobPosting(mockAi, "Senior AI Infra role at OpenAI in SF. Needs Python, PyTorch, K8s, CUDA.");
    expect(mockAi.run).toHaveBeenCalledTimes(1);
    expect(job.title).toBe("Senior AI Infrastructure Engineer");
    expect(job.company).toBe("OpenAI");
    expect(job.location).toBe("San Francisco, CA");
    expect(job.requiredSkills).toEqual(["Python", "PyTorch", "Kubernetes", "CUDA"]);
    expect(job.preferredSkills).toEqual(["Rust", "Triton"]);
    expect(job.responsibilities).toHaveLength(2);
  });

  it("falls back to heuristic extraction when AI binding throws an error", async () => {
    const mockAi = {
      run: vi.fn().mockRejectedValue(new Error("AI rate limit exceeded")),
    };

    const rawText = "Job Title: Staff Infrastructure Engineer\nCompany: Cloudflare\nLocation: Remote\nRequirements: Go, Kubernetes, Terraform";
    const job = await extractJobPosting(mockAi, rawText);

    expect(mockAi.run).toHaveBeenCalledTimes(1);
    expect(job.title).toBe("Staff Infrastructure Engineer");
    expect(job.company).toBe("Cloudflare");
    expect(job.requiredSkills).toContain("Go");
    expect(job.requiredSkills).toContain("Kubernetes");
  });

  it("falls back to heuristic extraction when AI binding is null", async () => {
    const rawText = "Software Engineer at Datadog. Requirements: Python, Go, Distributed Systems.";
    const job = await extractJobPosting(null, rawText);

    expect(job.company).toBe("Datadog");
    expect(job.requiredSkills).toContain("Python");
    expect(job.requiredSkills).toContain("Go");
    expect(job.requiredSkills).toContain("Distributed Systems");
  });
});

