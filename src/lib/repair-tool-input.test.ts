import { describe, it, expect } from "vitest";
import { repairStringifiedContainers } from "./repair-tool-input";
import { ScoreJobFitSchema, IngestJobDescriptionSchema } from "./tool-schemas";

describe("repairStringifiedContainers", () => {
  it("parses JSON arrays that arrived as strings", () => {
    const repaired = repairStringifiedContainers(
      JSON.stringify({ strengths: '["TypeScript", "React"]', reasoning: "Strong fit" })
    );
    expect(repaired && JSON.parse(repaired)).toEqual({
      strengths: ["TypeScript", "React"],
      reasoning: "Strong fit",
    });
  });

  // The exact shape captured from @cf/meta/llama-3.3-70b-instruct-fp8-fast.
  it("parses Python-style single-quoted arrays", () => {
    const repaired = repairStringifiedContainers(
      JSON.stringify({ strengths: "['strong edge platform skills', 'TypeScript expertise']", gaps: "[]" })
    );
    expect(repaired && JSON.parse(repaired)).toEqual({
      strengths: ["strong edge platform skills", "TypeScript expertise"],
      gaps: [],
    });
  });

  it("parses arrays of objects that arrived as strings", () => {
    const repaired = repairStringifiedContainers(
      JSON.stringify({ technicalQuestions: '[{"question": "Q", "keyTalkingPoints": ["a"]}]' })
    );
    expect(repaired && JSON.parse(repaired)).toEqual({
      technicalQuestions: [{ question: "Q", keyTalkingPoints: ["a"] }],
    });
  });

  it("parses stringified arrays nested inside a well-formed array", () => {
    const repaired = repairStringifiedContainers(
      JSON.stringify({
        technicalQuestions: [{ question: "Q", keyTalkingPoints: '["a", "b"]' }],
      })
    );
    expect(repaired && JSON.parse(repaired)).toEqual({
      technicalQuestions: [{ question: "Q", keyTalkingPoints: ["a", "b"] }],
    });
  });

  it("returns null when nothing needs repairing", () => {
    expect(repairStringifiedContainers(JSON.stringify({ strengths: ["TypeScript"], skillsFit: 85 }))).toBeNull();
  });

  it("returns null when the input is not valid JSON", () => {
    expect(repairStringifiedContainers("not json at all")).toBeNull();
  });

  it("leaves prose that merely opens with a bracket alone", () => {
    expect(repairStringifiedContainers(JSON.stringify({ reasoning: "[unscored] needs review" }))).toBeNull();
  });

  it("leaves ordinary strings alone", () => {
    expect(repairStringifiedContainers(JSON.stringify({ company: "Cloudflare" }))).toBeNull();
  });
});

describe("repair feeding tool input validation", () => {
  // Captured verbatim from @cf/meta/llama-3.3-70b-instruct-fp8-fast.
  const degraded = JSON.stringify({
    company: "Cloudflare",
    domainFit: "85",
    experienceFit: "80",
    gaps: "['Kubernetes', 'Docker']",
    jobDescription: "Cloudflare Edge Platform & DevEx software engineering role.",
    jobTitle: "Software Engineer – Edge Platform & DevEx",
    reasoning: "Strong edge platform and TypeScript capabilities.",
    skillsFit: "85",
    strengths: "['TypeScript', 'Cloudflare Workers']",
    trajectoryFit: "80",
  });

  it("rejects the degraded payload without repair", () => {
    expect(ScoreJobFitSchema.safeParse(JSON.parse(degraded)).success).toBe(false);
  });

  it("accepts the degraded payload once repaired", () => {
    const repaired = repairStringifiedContainers(degraded);
    expect(repaired).not.toBeNull();
    const result = ScoreJobFitSchema.safeParse(JSON.parse(repaired!));
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      skillsFit: 85,
      strengths: ["TypeScript", "Cloudflare Workers"],
      gaps: ["Kubernetes", "Docker"],
    });
  });

  it("repairs degraded ingestJobDescription payload with stringified arrays", () => {
    const degradedJob = JSON.stringify({
      title: "Senior Backend Engineer",
      company: "Stripe",
      location: "San Francisco, CA",
      requiredSkills: "['Go', 'PostgreSQL', 'Distributed Systems']",
      preferredSkills: "['Docker', 'Kubernetes']",
      responsibilities: "['Design robust payment APIs', 'Optimize database throughput']",
      experienceLevel: "Senior (5+ years)",
      rawDescription: "Senior Backend Engineer role at Stripe.",
    });

    expect(IngestJobDescriptionSchema.safeParse(JSON.parse(degradedJob)).success).toBe(false);

    const repaired = repairStringifiedContainers(degradedJob);
    expect(repaired).not.toBeNull();
    const result = IngestJobDescriptionSchema.safeParse(JSON.parse(repaired!));
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      title: "Senior Backend Engineer",
      company: "Stripe",
      requiredSkills: ["Go", "PostgreSQL", "Distributed Systems"],
      preferredSkills: ["Docker", "Kubernetes"],
      responsibilities: ["Design robust payment APIs", "Optimize database throughput"],
    });
  });
});

