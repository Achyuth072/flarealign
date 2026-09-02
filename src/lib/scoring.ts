import { z } from "zod";

export interface FitScoreWeights {
  skills: number;
  experience: number;
  domain: number;
  trajectory: number;
}

export const DEFAULT_FIT_SCORE_WEIGHTS: FitScoreWeights = {
  skills: 0.35,
  experience: 0.30,
  domain: 0.20,
  trajectory: 0.15,
};

export const MIN_WEIGHT = 0.10;
export const MAX_WEIGHT = 0.50;

export function makeId(prefix: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}

export interface FitScoreSubDimensions {
  skillsFit: number;
  experienceFit: number;
  domainFit: number;
  trajectoryFit: number;
}

export const SubDimensionsSchema = z.object({
  skillsFit: z.number().int().min(0).max(100),
  experienceFit: z.number().int().min(0).max(100),
  domainFit: z.number().int().min(0).max(100),
  trajectoryFit: z.number().int().min(0).max(100),
});

export const FitScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["Strong Fit", "Potential Fit", "Low Fit"]),
  subDimensions: SubDimensionsSchema,
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  risks: z.array(z.string()),
  reasoning: z.string(),
});

export type FitScoreResult = z.infer<typeof FitScoreResultSchema>;
export type FitRecommendation = "Strong Fit" | "Potential Fit" | "Low Fit";

export function validateWeights(weights: FitScoreWeights): void {
  const sum = weights.skills + weights.experience + weights.domain + weights.trajectory;
  if (Math.abs(sum - 1.0) > 0.005) {
    throw new Error(`Scoring weights must sum to 1.0 (got ${sum.toFixed(4)})`);
  }

  const entries: [string, number][] = [
    ["skills", weights.skills],
    ["experience", weights.experience],
    ["domain", weights.domain],
    ["trajectory", weights.trajectory],
  ];

  for (const [key, val] of entries) {
    if (val < 0 || val > 1.0) {
      throw new Error(`Weight for ${key} (${val}) must be non-negative and <= 1.0`);
    }
  }
}

export function computeCompositeFitScore(
  subScores: FitScoreSubDimensions,
  weights: FitScoreWeights = DEFAULT_FIT_SCORE_WEIGHTS
): number {
  validateWeights(weights);

  const skillsFit =
    typeof subScores.skillsFit === "number" && !Number.isNaN(subScores.skillsFit)
      ? subScores.skillsFit
      : 0;
  const experienceFit =
    typeof subScores.experienceFit === "number" && !Number.isNaN(subScores.experienceFit)
      ? subScores.experienceFit
      : 0;
  const domainFit =
    typeof subScores.domainFit === "number" && !Number.isNaN(subScores.domainFit)
      ? subScores.domainFit
      : 0;
  const trajectoryFit =
    typeof subScores.trajectoryFit === "number" && !Number.isNaN(subScores.trajectoryFit)
      ? subScores.trajectoryFit
      : 0;

  const rawScore =
    skillsFit * weights.skills +
    experienceFit * weights.experience +
    domainFit * weights.domain +
    trajectoryFit * weights.trajectory;

  if (Number.isNaN(rawScore)) {
    return 0;
  }

  const rounded = Math.round(rawScore);
  return Math.min(100, Math.max(0, rounded));
}

export function deriveRecommendation(score: number): FitRecommendation {
  if (score >= 80) return "Strong Fit";
  if (score >= 60) return "Potential Fit";
  return "Low Fit";
}

