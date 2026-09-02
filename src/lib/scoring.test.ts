import { describe, it, expect } from "vitest";
import {
  computeCompositeFitScore,
  deriveRecommendation,
  evaluateCandidateJobFit,
  validateWeights,
  makeId,
  DEFAULT_FIT_SCORE_WEIGHTS,
  SubDimensionsSchema,
  FitScoreResultSchema,
} from "./scoring";

describe("Scoring Domain Logic", () => {
  it("computes composite fit score accurately with default weights", () => {
    const subScores = {
      skillsFit: 90,
      experienceFit: 80,
      domainFit: 85,
      trajectoryFit: 75,
    };
    // 90 * 0.35 = 31.5
    // 80 * 0.30 = 24.0
    // 85 * 0.20 = 17.0
    // 75 * 0.15 = 11.25
    // Total = 83.75 -> 84
    const score = computeCompositeFitScore(subScores);
    expect(score).toBe(84);
  });

  it("handles edge case: all-zero sub-scores without NaN or overflow", () => {
    const subScores = {
      skillsFit: 0,
      experienceFit: 0,
      domainFit: 0,
      trajectoryFit: 0,
    };
    const score = computeCompositeFitScore(subScores);
    expect(score).toBe(0);
    expect(Number.isNaN(score)).toBe(false);
    expect(deriveRecommendation(score)).toBe("Low Fit");
  });

  it("handles edge case: all-100 sub-scores without NaN or overflow", () => {
    const subScores = {
      skillsFit: 100,
      experienceFit: 100,
      domainFit: 100,
      trajectoryFit: 100,
    };
    const score = computeCompositeFitScore(subScores);
    expect(score).toBe(100);
    expect(Number.isNaN(score)).toBe(false);
    expect(deriveRecommendation(score)).toBe("Strong Fit");
  });

  it("computes scores with custom valid weights", () => {
    const customWeights = {
      skills: 0.4,
      experience: 0.3,
      domain: 0.15,
      trajectory: 0.15,
    };
    const subScores = {
      skillsFit: 100,
      experienceFit: 50,
      domainFit: 80,
      trajectoryFit: 60,
    };
    // 100*0.4 + 50*0.3 + 80*0.15 + 60*0.15 = 40 + 15 + 12 + 9 = 76
    const score = computeCompositeFitScore(subScores, customWeights);
    expect(score).toBe(76);
    expect(deriveRecommendation(score)).toBe("Potential Fit");
  });

  it("derives correct recommendation based on score thresholds and exact boundaries", () => {
    expect(deriveRecommendation(100)).toBe("Strong Fit");
    expect(deriveRecommendation(85)).toBe("Strong Fit");
    expect(deriveRecommendation(80)).toBe("Strong Fit"); // Exact boundary: >= 80
    expect(deriveRecommendation(79)).toBe("Potential Fit"); // Exact boundary: 60..79
    expect(deriveRecommendation(60)).toBe("Potential Fit"); // Exact boundary: >= 60
    expect(deriveRecommendation(59)).toBe("Low Fit"); // Exact boundary: < 60
    expect(deriveRecommendation(10)).toBe("Low Fit");
    expect(deriveRecommendation(0)).toBe("Low Fit");
  });

  it("validates weights sum and non-negative bounds", () => {
    expect(() => validateWeights(DEFAULT_FIT_SCORE_WEIGHTS)).not.toThrow();

    // Sum != 1.0
    expect(() =>
      validateWeights({
        skills: 0.5,
        experience: 0.5,
        domain: 0.1,
        trajectory: 0.1,
      })
    ).toThrow(/Scoring weights must sum to 1.0/);

    // Negative weight bound
    expect(() =>
      validateWeights({
        skills: -0.1,
        experience: 0.5,
        domain: 0.3,
        trajectory: 0.3,
      })
    ).toThrow(/must be non-negative and <= 1.0/);

    // Exceeds 1.0
    expect(() =>
      validateWeights({
        skills: 1.2,
        experience: -0.1,
        domain: 0.0,
        trajectory: -0.1,
      })
    ).toThrow(/must be non-negative and <= 1.0/);

    // Valid skewed weights summing to 1.0
    expect(() =>
      validateWeights({
        skills: 0.7,
        experience: 0.1,
        domain: 0.1,
        trajectory: 0.1,
      })
    ).not.toThrow();
  });

  it("validates SubDimensionsSchema and FitScoreResultSchema", () => {
    const validSub = {
      skillsFit: 85,
      experienceFit: 90,
      domainFit: 75,
      trajectoryFit: 80,
    };
    expect(SubDimensionsSchema.parse(validSub)).toEqual(validSub);

    expect(() =>
      SubDimensionsSchema.parse({
        skillsFit: 150,
        experienceFit: 90,
        domainFit: 75,
        trajectoryFit: 80,
      })
    ).toThrow();

    const validResult = {
      score: 85,
      recommendation: "Strong Fit" as const,
      subDimensions: validSub,
      strengths: ["Strong TypeScript", "Cloudflare Workers experience"],
      gaps: ["No Go experience required"],
      risks: [],
      reasoning: "Candidate is a great match for edge platforms.",
    };
    expect(FitScoreResultSchema.parse(validResult)).toEqual(validResult);

    expect(() =>
      FitScoreResultSchema.parse({
        score: 105,
        recommendation: "INVALID",
        subDimensions: validSub,
        strengths: [],
        gaps: [],
        risks: [],
        reasoning: "",
      })
    ).toThrow();
  });

  it("generates unique, prefixed IDs using makeId", () => {
    const id1 = makeId("job");
    const id2 = makeId("job");
    const scoreId = makeId("score");

    expect(id1).toMatch(/^job-\d+-[a-z0-9]+$/);
    expect(id2).toMatch(/^job-\d+-[a-z0-9]+$/);
    expect(scoreId).toMatch(/^score-\d+-[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it("handles NaN and non-number sub-dimension values gracefully without crashing", () => {
    const invalidSubScores = {
      skillsFit: NaN,
      experienceFit: 80,
      domainFit: (undefined as unknown) as number,
      trajectoryFit: 60,
    };
    const score = computeCompositeFitScore(invalidSubScores);
    expect(Number.isNaN(score)).toBe(false);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("evaluateCandidateJobFit Dynamic Heuristic Engine", () => {
  const mockCandidate = {
    name: "Alex Smith",
    targetRole: "Senior Systems Engineer",
    yearsOfExperience: 5,
    skills: ["TypeScript", "Go", "PostgreSQL", "Docker", "Distributed Systems", "REST"],
    experiences: [
      {
        role: "Systems Engineer",
        company: "CloudTech",
        period: "2021 - Present",
        highlights: ["Architected distributed messaging queue using Go and PostgreSQL."],
      },
    ],
    projects: [
      {
        name: "Edge Cache Engine",
        description: "High performance key-value cache built in Go with distributed replication.",
        techStack: ["Go", "Distributed Systems", "Docker"],
      },
    ],
    resumeSummary: "Backend and systems engineer specializing in Go, distributed platforms, and high-throughput databases.",
  };

  it("evaluates a well-matched dynamic job posting (e.g. Stripe Backend Engineer)", () => {
    const stripeJob = {
      title: "Senior Backend Engineer",
      company: "Stripe",
      location: "San Francisco, CA / Remote",
      requiredSkills: ["Go", "PostgreSQL", "Distributed Systems"],
      preferredSkills: ["Docker"],
      responsibilities: ["Scale core ledger and payment transaction pipelines"],
      experienceLevel: "Senior (5+ years)",
      rawDescription: "Join Stripe to scale distributed transaction systems and backend databases.",
    };

    const evaluation = evaluateCandidateJobFit(mockCandidate, stripeJob);

    expect(evaluation.score).toBeGreaterThanOrEqual(80);
    expect(evaluation.recommendation).toBe("Strong Fit");
    expect(evaluation.subDimensions.skillsFit).toBeGreaterThanOrEqual(90);
    expect(evaluation.subDimensions.experienceFit).toBeGreaterThanOrEqual(90);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
    expect(evaluation.strengths.some((s) => s.includes("Go"))).toBe(true);
    expect(evaluation.reasoning).toContain("Senior Backend Engineer at Stripe");
  });

  it("identifies skill gaps when candidate lacks required skills for a role", () => {
    const aiJob = {
      title: "Senior Machine Learning Engineer",
      company: "OpenAI",
      requiredSkills: ["PyTorch", "CUDA", "C++", "Transformer Architectures"],
      preferredSkills: ["Triton"],
      experienceLevel: "Senior (5+ years)",
      rawDescription: "Build large language model training infrastructure.",
    };

    const evaluation = evaluateCandidateJobFit(mockCandidate, aiJob);

    expect(evaluation.subDimensions.skillsFit).toBeLessThanOrEqual(50);
    expect(evaluation.gaps.length).toBeGreaterThan(0);
    expect(evaluation.gaps.some((g) => g.includes("PyTorch") || g.includes("CUDA"))).toBe(true);
    expect(["Potential Fit", "Low Fit"]).toContain(evaluation.recommendation);
  });

  it("calibrates experience depth score for Principal (8+ YOE) roles when candidate has 5 YOE", () => {
    const principalJob = {
      title: "Principal Infrastructure Architect",
      company: "Datadog",
      requiredSkills: ["Go", "Distributed Systems"],
      experienceLevel: "Principal (8+ years)",
      rawDescription: "Lead global platform architecture across multi-region clusters.",
    };

    const evaluation = evaluateCandidateJobFit(mockCandidate, principalJob);

    // 5 YOE applying for 8 YOE Principal
    expect(evaluation.subDimensions.experienceFit).toBeLessThanOrEqual(75);
    expect(evaluation.gaps.some((g) => g.includes("years of experience"))).toBe(true);
  });

  it("evaluates raw description text gracefully when requiredSkills array is empty", () => {
    const unstructuredJob = {
      title: "Distributed Systems Developer",
      company: "Acme Corp",
      rawDescription: "Looking for an engineer with strong Go, Docker, and PostgreSQL skills to build distributed backends.",
    };

    const evaluation = evaluateCandidateJobFit(mockCandidate, unstructuredJob);

    expect(evaluation.score).toBeGreaterThan(0);
    expect(evaluation.subDimensions.skillsFit).toBeGreaterThanOrEqual(60);
    expect(evaluation.reasoning).toContain("Acme Corp");
  });
});

