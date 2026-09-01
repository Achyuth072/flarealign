import { describe, it, expect } from "vitest";
import {
  computeCompositeFitScore,
  deriveRecommendation,
  validateWeights,
  DEFAULT_FIT_SCORE_WEIGHTS,
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

  it("derives correct recommendation based on score thresholds", () => {
    expect(deriveRecommendation(85)).toBe("APPLY");
    expect(deriveRecommendation(80)).toBe("APPLY");
    expect(deriveRecommendation(79)).toBe("REVIEW");
    expect(deriveRecommendation(60)).toBe("REVIEW");
    expect(deriveRecommendation(59)).toBe("IGNORE");
    expect(deriveRecommendation(10)).toBe("IGNORE");
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
  });
});

