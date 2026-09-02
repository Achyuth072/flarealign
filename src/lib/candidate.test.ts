import { describe, it, expect } from "vitest";
import {
  DEFAULT_CANDIDATE_PROFILE,
  CandidateProfileSchema,
  CandidateUpdateSchema,
  patchCandidateProfile,
} from "./candidate";
import { getSystemPrompt } from "./prompts";

describe("Candidate Profile and Prompts", () => {
  it("conforms to CandidateProfileSchema", () => {
    const parsed = CandidateProfileSchema.parse(DEFAULT_CANDIDATE_PROFILE);
    expect(parsed.name).toBe("John Doe");
    expect(parsed.skills).toContain("Cloudflare Workers");
    expect(parsed.skills).toContain("Durable Objects");
    expect(parsed.skills).toContain("Workers AI");
    expect(parsed.projects.length).toBeGreaterThan(0);
  });

  it("validates CandidateUpdateSchema and safely patches candidate profile", () => {
    const patch = {
      name: "Jane Doe",
      yearsOfExperience: 4,
      skills: ["TypeScript", "Cloudflare Workers", "Rust"],
    };
    const validatedPatch = CandidateUpdateSchema.parse(patch);
    const patched = patchCandidateProfile(DEFAULT_CANDIDATE_PROFILE, validatedPatch);

    expect(patched.name).toBe("Jane Doe");
    expect(patched.yearsOfExperience).toBe(4);
    expect(patched.skills).toEqual(["TypeScript", "Cloudflare Workers", "Rust"]);
    // Preserves unpatched fields
    expect(patched.id).toBe(DEFAULT_CANDIDATE_PROFILE.id);
    expect(patched.location).toBe(DEFAULT_CANDIDATE_PROFILE.location);
    expect(patched.targetRole).toBe(DEFAULT_CANDIDATE_PROFILE.targetRole);
    expect(patched.experiences).toEqual(DEFAULT_CANDIDATE_PROFILE.experiences);
    expect(patched.projects).toEqual(DEFAULT_CANDIDATE_PROFILE.projects);
  });

  it("generates structured system prompt with candidate context and all available tools", () => {
    const prompt = getSystemPrompt(DEFAULT_CANDIDATE_PROFILE);
    expect(prompt).toContain("John Doe");
    expect(prompt).toContain("scoreJobFit");
    expect(prompt).toContain("tailorResume");
    expect(prompt).toContain("generateInterviewPrep");
    expect(prompt).toContain("technicalQuestions");
    expect(prompt).toContain("behavioralQuestions");
    expect(prompt).toContain("situationTask");
    expect(prompt).toContain("actionTaken");
    expect(prompt).toContain("resultImpact");
    expect(prompt).toContain("systemDesignFocus");
    expect(prompt).toContain("triggerBatchWorkflow");
    expect(prompt).toContain("updateCandidateProfile");
    expect(prompt).toContain("ingestJobDescription");
    expect(prompt).toContain("No active target job currently set");
  });

  it("parameterizes system prompt with active target job metadata when job is present", () => {
    const activeJob = {
      id: "job-stripe-1",
      title: "Staff Distributed Systems Engineer",
      company: "Stripe",
      location: "San Francisco, CA / Remote",
      requiredSkills: ["Go", "Distributed Systems", "Raft"],
      preferredSkills: ["Kubernetes", "gRPC"],
      responsibilities: ["Architect core transaction engine", "Lead technical reviews"],
      experienceLevel: "Staff (6+ years)",
      rawDescription: "Join Stripe to scale mission-critical payment infrastructure.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const prompt = getSystemPrompt(DEFAULT_CANDIDATE_PROFILE, activeJob);
    expect(prompt).toContain("Staff Distributed Systems Engineer at Stripe");
    expect(prompt).toContain("Hiring Company: Stripe");
    expect(prompt).toContain("San Francisco, CA / Remote");
    expect(prompt).toContain("Go, Distributed Systems, Raft");
    expect(prompt).toContain("Kubernetes, gRPC");
    expect(prompt).toContain("Architect core transaction engine");
  });

  it("rejects invalid values in CandidateUpdateSchema", () => {
    // Negative years of experience
    expect(() => CandidateUpdateSchema.parse({ yearsOfExperience: -1 })).toThrow();
    // Exceeding max years of experience
    expect(() => CandidateUpdateSchema.parse({ yearsOfExperience: 100 })).toThrow();
    // Empty strings where minimum 1 character is required
    expect(() => CandidateUpdateSchema.parse({ name: "" })).toThrow();
    expect(() => CandidateUpdateSchema.parse({ skills: [""] })).toThrow();
  });
});

