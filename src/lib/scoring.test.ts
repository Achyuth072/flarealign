import { describe, it, expect } from "vitest";
import {
  computeCompositeFitScore,
  deriveRecommendation,
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

  it("handles edge case: all-zero sub-scores", () => {
    const subScores = {
      skillsFit: 0,
      experienceFit: 0,
      domainFit: 0,
      trajectoryFit: 0,
    };
    const score = computeCompositeFitScore(subScores);
    expect(score).toBe(0);
    expect(deriveRecommendation(score)).toBe("IGNORE");
  });

  it("handles edge case: all-100 sub-scores", () => {
    const subScores = {
      skillsFit: 100,
      experienceFit: 100,
      domainFit: 100,
      trajectoryFit: 100,
    };
    const score = computeCompositeFitScore(subScores);
    expect(score).toBe(100);
    expect(deriveRecommendation(score)).toBe("APPLY");
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
    expect(deriveRecommendation(score)).toBe("REVIEW");
  });

  it("derives correct recommendation based on score thresholds and exact boundaries", () => {
    expect(deriveRecommendation(100)).toBe("APPLY");
    expect(deriveRecommendation(85)).toBe("APPLY");
    expect(deriveRecommendation(80)).toBe("APPLY"); // Exact threshold
    expect(deriveRecommendation(79)).toBe("REVIEW"); // Exact boundary below 80
    expect(deriveRecommendation(60)).toBe("REVIEW"); // Exact threshold
    expect(deriveRecommendation(59)).toBe("IGNORE"); // Exact boundary below 60
    expect(deriveRecommendation(10)).toBe("IGNORE");
    expect(deriveRecommendation(0)).toBe("IGNORE");
  });

  it("validates weights sum and bounds", () => {
    expect(() => validateWeights(DEFAULT_FIT_SCORE_WEIGHTS)).not.toThrow();

    expect(() =>
      validateWeights({
        skills: 0.5,
        experience: 0.5,
        domain: 0.1,
        trajectory: 0.1,
      })
    ).toThrow(/Scoring weights must sum to 1.0/);

    expect(() =>
      validateWeights({
        skills: 0.6,
        experience: 0.2,
        domain: 0.1,
        trajectory: 0.1,
      })
    ).toThrow(/must be within/);

    expect(() =>
      validateWeights({
        skills: 0.05,
        experience: 0.35,
        domain: 0.3,
        trajectory: 0.3,
      })
    ).toThrow(/must be within/);
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
      recommendation: "APPLY" as const,
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
});

