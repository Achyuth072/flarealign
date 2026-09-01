import { describe, it, expect } from "vitest";
import { DEFAULT_CANDIDATE_PROFILE, CandidateProfileSchema } from "./candidate";
import { getSystemPrompt } from "./prompts";

describe("Candidate Profile and Prompts", () => {
  it("conforms to CandidateProfileSchema", () => {
    const parsed = CandidateProfileSchema.parse(DEFAULT_CANDIDATE_PROFILE);
    expect(parsed.name).toBe("Achyuth");
    expect(parsed.skills).toContain("Cloudflare Workers");
    expect(parsed.skills).toContain("Durable Objects");
    expect(parsed.skills).toContain("Workers AI");
    expect(parsed.projects.length).toBeGreaterThan(0);
  });

  it("generates structured system prompt with candidate context", () => {
    const prompt = getSystemPrompt(DEFAULT_CANDIDATE_PROFILE);
    expect(prompt).toContain("Achyuth");
    expect(prompt).toContain("scoreJobFit");
    expect(prompt).toContain("tailorResume");
    expect(prompt).toContain("Cloudflare");
  });
});

