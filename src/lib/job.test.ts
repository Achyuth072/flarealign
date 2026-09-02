import { describe, it, expect } from "vitest";
import {
  JobPostingSchema,
  JobPostingInputSchema,
  normalizeJobPosting,
  JobPosting,
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
