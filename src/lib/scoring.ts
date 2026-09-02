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

export interface CandidateJobFitEvaluation {
  score: number;
  recommendation: FitRecommendation;
  subDimensions: FitScoreSubDimensions;
  strengths: string[];
  gaps: string[];
  risks: string[];
  reasoning: string;
}

export interface CandidateEvaluationInput {
  name: string;
  targetRole: string;
  yearsOfExperience: number;
  skills: string[];
  experiences?: Array<{
    role: string;
    company: string;
    period?: string;
    highlights: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    techStack: string[];
    highlights?: string[];
  }>;
  resumeSummary?: string;
}

export interface JobEvaluationInput {
  title: string;
  company: string;
  location?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  experienceLevel?: string;
  rawDescription?: string;
}

/**
 * Heuristically evaluates a candidate against a target job posting across 4 dimensions:
 * Skills Alignment (35%), Experience Depth (30%), Domain & Systems Match (20%), and Career Trajectory (15%).
 */
export function evaluateCandidateJobFit(
  candidate: CandidateEvaluationInput,
  job: JobEvaluationInput,
  weights: FitScoreWeights = DEFAULT_FIT_SCORE_WEIGHTS
): CandidateJobFitEvaluation {
  const candidateSkills = (candidate.skills || []).map((s) => s.trim());
  const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());

  const jobTitleLower = (job.title || "").toLowerCase();
  const jobCompanyLower = (job.company || "").toLowerCase();
  const jobDescLower = (job.rawDescription || "").toLowerCase();
  const jobExpLower = (job.experienceLevel || "").toLowerCase();

  // 1. Skills Alignment (35%)
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const requiredSkills = job.requiredSkills || [];
  const preferredSkills = job.preferredSkills || [];

  if (requiredSkills.length > 0) {
    for (const req of requiredSkills) {
      const reqLower = req.toLowerCase().trim();
      const hasSkill = candidateSkillsLower.some(
        (cs) => cs === reqLower || cs.includes(reqLower) || reqLower.includes(cs)
      );
      if (hasSkill) {
        matchedRequired.push(req);
      } else {
        missingRequired.push(req);
      }
    }
  } else {
    // If no explicit required skills array, search candidate skills in description/title
    for (const cs of candidateSkills) {
      if (jobDescLower.includes(cs.toLowerCase()) || jobTitleLower.includes(cs.toLowerCase())) {
        matchedRequired.push(cs);
      }
    }
  }

  const matchedPreferred: string[] = [];
  for (const pref of preferredSkills) {
    const prefLower = pref.toLowerCase().trim();
    if (candidateSkillsLower.some((cs) => cs === prefLower || cs.includes(prefLower) || prefLower.includes(cs))) {
      matchedPreferred.push(pref);
    }
  }

  let skillsFit = 75;
  if (requiredSkills.length > 0) {
    const ratio = matchedRequired.length / requiredSkills.length;
    const preferredBonus = preferredSkills.length > 0 ? Math.min(10, Math.round((matchedPreferred.length / preferredSkills.length) * 10)) : 0;
    skillsFit = Math.min(100, Math.max(20, Math.round(ratio * 90) + preferredBonus));
  } else if (candidateSkills.length > 0) {
    skillsFit = Math.min(100, Math.max(25, Math.round((matchedRequired.length / 5) * 100)));
  }

  // 2. Experience Depth (30%)
  const candidateYoe = typeof candidate.yearsOfExperience === "number" ? candidate.yearsOfExperience : 3;
  let targetYoe = 3;

  if (
    jobTitleLower.includes("principal") ||
    jobDescLower.includes("principal engineer") ||
    jobExpLower.includes("8+") ||
    jobDescLower.includes("8+ years") ||
    jobDescLower.includes("10+ years")
  ) {
    targetYoe = 8;
  } else if (
    jobTitleLower.includes("staff") ||
    jobDescLower.includes("staff engineer") ||
    jobExpLower.includes("6+") ||
    jobDescLower.includes("6+ years") ||
    jobDescLower.includes("5+ years")
  ) {
    targetYoe = 6;
  } else if (
    jobTitleLower.includes("senior") ||
    jobExpLower.includes("4+") ||
    jobDescLower.includes("4+ years") ||
    jobDescLower.includes("5 years")
  ) {
    targetYoe = 5;
  } else if (
    jobTitleLower.includes("junior") ||
    jobTitleLower.includes("entry") ||
    jobExpLower.includes("junior") ||
    jobDescLower.includes("1-2 years") ||
    jobDescLower.includes("0-2 years")
  ) {
    targetYoe = 1;
  }

  let experienceFit = 92;
  const diff = targetYoe - candidateYoe;
  if (diff <= 0) {
    experienceFit = 95;
  } else if (diff === 1) {
    experienceFit = 88;
  } else if (diff === 2) {
    experienceFit = 82;
  } else if (diff === 3) {
    experienceFit = 72;
  } else {
    experienceFit = 55;
  }

  // 3. Domain & Systems Match (20%)
  let domainScore = 75;
  const allCandidateHighlights = [
    candidate.resumeSummary || "",
    ...(candidate.experiences || []).flatMap((e) => [e.role, e.company, ...e.highlights]),
    ...(candidate.projects || []).flatMap((p) => [p.name, p.description, ...(p.techStack || []), ...(p.highlights || [])]),
  ]
    .join(" ")
    .toLowerCase();

  // Check company relevance
  if (jobCompanyLower && allCandidateHighlights.includes(jobCompanyLower)) {
    domainScore += 10;
  }

  // Check technical domain alignment (e.g. edge, distributed systems, platform, backend, frontend, ai)
  const domainKeywords = [
    "distributed",
    "systems",
    "edge",
    "platform",
    "cloud",
    "serverless",
    "backend",
    "frontend",
    "fullstack",
    "api",
    "database",
    "microservices",
    "ai",
    "machine learning",
    "infrastructure",
    "security",
  ];

  let domainMatches = 0;
  for (const kw of domainKeywords) {
    const jobHas = jobTitleLower.includes(kw) || jobDescLower.includes(kw);
    const candHas = allCandidateHighlights.includes(kw);
    if (jobHas && candHas) {
      domainMatches++;
    }
  }

  domainScore += Math.min(15, domainMatches * 3);
  const domainFit = Math.min(100, Math.max(30, domainScore));

  // 4. Career Trajectory (15%)
  const targetRoleWords = (candidate.targetRole || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const matchingRoleWords = targetRoleWords.filter(
    (w) => jobTitleLower.includes(w) || jobDescLower.includes(w)
  );
  const trajectoryFit = matchingRoleWords.length >= 2 ? 95 : matchingRoleWords.length === 1 ? 85 : 75;

  const subDimensions: FitScoreSubDimensions = {
    skillsFit,
    experienceFit,
    domainFit,
    trajectoryFit,
  };

  const score = computeCompositeFitScore(subDimensions, weights);
  const recommendation = deriveRecommendation(score);

  // Synthesize strengths and gaps
  const strengths: string[] = [];
  if (matchedRequired.length > 0) {
    strengths.push(`Core skill alignment in ${matchedRequired.slice(0, 3).join(", ")}`);
  }
  if (matchedPreferred.length > 0) {
    strengths.push(`Preferred proficiency in ${matchedPreferred.slice(0, 2).join(", ")}`);
  }
  if (domainFit >= 85) {
    strengths.push(`Strong domain and systems architecture background for ${job.company || "target role"}`);
  }
  if (strengths.length === 0) {
    strengths.push("Solid foundation in modern software engineering practices");
  }

  const gaps: string[] = [];
  if (missingRequired.length > 0) {
    gaps.push(`Unverified required skills: ${missingRequired.slice(0, 3).join(", ")}`);
  }
  if (diff > 0) {
    gaps.push(`Target role requires ${targetYoe}+ years of experience (candidate has ${candidateYoe} YOE)`);
  }
  if (gaps.length === 0) {
    gaps.push("No critical qualification gaps identified");
  }

  const reasoning = `Candidate demonstrates ${recommendation.toLowerCase()} (${score}/100) for ${job.title} at ${job.company}, with ${skillsFit}% skills alignment and ${experienceFit}% experience depth match.`;

  return {
    score,
    recommendation,
    subDimensions,
    strengths,
    gaps,
    risks: [],
    reasoning,
  };
}


