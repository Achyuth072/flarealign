import { describe, it, expect, vi } from "vitest";
import { IngestJobDescriptionSchema } from "./tool-schemas";
import { normalizeJobPosting } from "./job";

describe("ingestJobDescription Tool Schema Validation", () => {
  it("accepts a complete, valid job ingestion payload", () => {
    const validPayload = {
      title: "Staff Distributed Systems Engineer",
      company: "Cloudflare",
      location: "San Francisco, CA / Remote",
      requiredSkills: ["TypeScript", "Rust", "Distributed Systems", "Cloudflare Workers"],
      preferredSkills: ["Wasm", "Durable Objects"],
      responsibilities: ["Architect edge runtimes", "Lead platform scaling"],
      experienceLevel: "Staff (6+ years)",
      rawDescription: "Full job posting text...",
    };

    const result = IngestJobDescriptionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Staff Distributed Systems Engineer");
      expect(result.data.company).toBe("Cloudflare");
      expect(result.data.requiredSkills).toHaveLength(4);
    }
  });

  it("accepts minimal payload with only required fields (title, company, requiredSkills)", () => {
    const minimalPayload = {
      title: "Backend Engineer",
      company: "Stripe",
      requiredSkills: ["Go", "PostgreSQL"],
    };

    const result = IngestJobDescriptionSchema.safeParse(minimalPayload);
    expect(result.success).toBe(true);
  });

  it("rejects payload missing required title", () => {
    const invalid = {
      company: "Stripe",
      requiredSkills: ["Go"],
    };
    const result = IngestJobDescriptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects payload missing required company", () => {
    const invalid = {
      title: "Backend Engineer",
      requiredSkills: ["Go"],
    };
    const result = IngestJobDescriptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects payload missing requiredSkills array", () => {
    const invalid = {
      title: "Backend Engineer",
      company: "Stripe",
    };
    const result = IngestJobDescriptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("ingestJobDescription Tool Execution Simulation", () => {
  it("normalizes and formats successful response upon saving active job", async () => {
    const mockSaveActiveJob = vi.fn().mockImplementation(async (input) => {
      return normalizeJobPosting(input);
    });

    const executeTool = async (args: any) => {
      try {
        const savedJob = await mockSaveActiveJob({
          title: args.title,
          company: args.company,
          location: args.location || "Remote",
          requiredSkills: args.requiredSkills || [],
          preferredSkills: args.preferredSkills || [],
          responsibilities: args.responsibilities || [],
          experienceLevel: args.experienceLevel || "Mid-Senior Level",
          rawDescription: args.rawDescription || "",
        });

        return {
          success: true,
          message: `Target job '${savedJob.title}' at ${savedJob.company} successfully ingested and activated.`,
          job: savedJob,
        };
      } catch (err) {
        return {
          success: false,
          error: true,
          message: `Failed to ingest job description: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    };

    const args = {
      title: "Systems Engineer",
      company: "Cloudflare",
      location: "Austin, TX",
      requiredSkills: ["Rust", "Linux"],
      preferredSkills: ["eBPF"],
      responsibilities: ["Develop low-level networking software"],
      experienceLevel: "Mid-Senior Level",
      rawDescription: "Systems Engineer role at Cloudflare",
    };

    const response = await executeTool(args);
    expect(response.success).toBe(true);
    expect(response.message).toContain("Systems Engineer");
    expect(response.message).toContain("Cloudflare");
    expect(response.job.id).toMatch(/^job-/);
    expect(response.job.requiredSkills).toEqual(["Rust", "Linux"]);
    expect(mockSaveActiveJob).toHaveBeenCalledTimes(1);
  });

  it("catches and returns structured error object when saveActiveJob throws an exception", async () => {
    const mockSaveActiveJob = vi.fn().mockRejectedValue(new Error("SQLite storage disk full"));

    const executeTool = async (args: any) => {
      try {
        const savedJob = await mockSaveActiveJob(args);
        return { success: true, job: savedJob };
      } catch (err) {
        return {
          success: false,
          error: true,
          message: `Failed to ingest job description: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    };

    const response = await executeTool({ title: "Broken Job", company: "Broken Inc" });
    expect(response.success).toBe(false);
    expect(response.error).toBe(true);
    expect(response.message).toContain("SQLite storage disk full");
  });
});
