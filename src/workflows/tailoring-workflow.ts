import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Ai } from "@cloudflare/workers-types";
import {
  computeCompositeFitScore,
  deriveRecommendation,
  evaluateCandidateJobFit,
  makeId,
} from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE, CandidateProfile } from "../lib/candidate";

export interface TailoringWorkflowParams {
  jobId?: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  candidate?: CandidateProfile;
}

export interface TailoringWorkflowResult {
  jobId: string;
  fitScore: number;
  recommendation: string;
  subDimensions: {
    skillsFit: number;
    experienceFit: number;
    domainFit: number;
    trajectoryFit: number;
  };
  tailoredBullets: string[];
  interviewTips: string[];
  processedAt: string;
}

export interface SynthesisOutput {
  tailoredBullets: string[];
  interviewTips: string[];
}

export interface NormalizedJob {
  jobId: string;
  title: string;
  company: string;
  description: string;
}

export interface FitResult {
  score: number;
  recommendation: string;
  subDimensions: {
    skillsFit: number;
    experienceFit: number;
    domainFit: number;
    trajectoryFit: number;
  };
}

export interface JobContext {
  title: string;
  company: string;
  description?: string;
}

/**
 * Builds the structured LLM prompt combining candidate profile, target job, and computed fit breakdown.
 */
export function buildSynthesisPrompt(
  candidate: CandidateProfile,
  job: JobContext,
  fitResult: FitResult
): string {
  const companyName = job.company ? job.company.trim() : "Target Company";
  const roleTitle = job.title ? job.title.trim() : "Software Engineer";

  return `You are an expert technical career advisor and principal systems engineer.

Synthesize customized resume bullet points and STAR interview talking points tailored to the target job description and candidate fit profile.

CANDIDATE CONTEXT:
- Name: ${candidate.name}
- Target Role: ${candidate.targetRole}
- Years of Experience: ${candidate.yearsOfExperience}
- Core Skills: ${candidate.skills.join(", ")}
- Resume Summary: ${candidate.resumeSummary}

TARGET ROLE CONTEXT:
- Title: ${roleTitle}
- Company: ${companyName}
- Job Description:
${job.description || "N/A"}

FIT EVALUATION BREAKDOWN:
- Overall Fit Score: ${fitResult.score}/100 (${fitResult.recommendation})
- Skills Fit: ${fitResult.subDimensions.skillsFit}/100
- Experience Fit: ${fitResult.subDimensions.experienceFit}/100
- Domain Fit: ${fitResult.subDimensions.domainFit}/100
- Trajectory Fit: ${fitResult.subDimensions.trajectoryFit}/100

INSTRUCTIONS:
1. Generate at least 3 high-impact, quantified resume bullet points highlighting candidate strengths, domain expertise, and relevant technologies aligned with ${companyName} and this ${roleTitle} position.
2. Generate at least 3 concrete STAR-method interview talking points or system design focus tips specifically customized for ${companyName} and this position.
3. Return output strictly in JSON format matching this schema:
{
  "tailoredBullets": [
    "Impact-driven bullet 1...",
    "Impact-driven bullet 2...",
    "Impact-driven bullet 3..."
  ],
  "interviewTips": [
    "STAR or system design tip 1...",
    "STAR or system design tip 2...",
    "STAR or system design tip 3..."
  ]
}`;
}

/**
 * Safely parses and validates the synthesis JSON output from Workers AI.
 */
export function parseSynthesisResponse(rawContent: unknown): SynthesisOutput | null {
  if (!rawContent) {
    return null;
  }

  let text: string;
  if (typeof rawContent === "object") {
    // If already an object with the expected shape
    const obj = rawContent as Record<string, unknown>;
    if (
      Array.isArray(obj.tailoredBullets) &&
      Array.isArray(obj.interviewTips) &&
      obj.tailoredBullets.length >= 3 &&
      obj.interviewTips.length >= 3 &&
      obj.tailoredBullets.every((b) => typeof b === "string" && (b as string).trim().length > 0) &&
      obj.interviewTips.every((t) => typeof t === "string" && (t as string).trim().length > 0)
    ) {
      return {
        tailoredBullets: obj.tailoredBullets.map((b) => (b as string).trim()),
        interviewTips: obj.interviewTips.map((t) => (t as string).trim()),
      };
    }
    // Otherwise try stringifying
    text = JSON.stringify(rawContent);
  } else if (typeof rawContent === "string") {
    text = rawContent.trim();
  } else {
    return null;
  }

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  } else {
    // Extract substring between first '{' and last '}' if extra text wraps the JSON
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray(parsed.tailoredBullets) &&
      Array.isArray(parsed.interviewTips)
    ) {
      const tailoredBullets = parsed.tailoredBullets
        .filter((b: unknown) => typeof b === "string" && (b as string).trim().length > 0)
        .map((b: string) => b.trim());
      const interviewTips = parsed.interviewTips
        .filter((t: unknown) => typeof t === "string" && (t as string).trim().length > 0)
        .map((t: string) => t.trim());

      if (tailoredBullets.length >= 3 && interviewTips.length >= 3) {
        return { tailoredBullets, interviewTips };
      }
    }
  } catch (err) {
    console.warn("Failed to parse JSON response from AI synthesis:", err);
  }

  return null;
}

/**
 * Returns deterministic, high-quality fallback synthesis if AI inference is unavailable or fails.
 */
export function getFallbackSynthesis(
  job: JobContext,
  fitScore?: number
): SynthesisOutput {
  const companyName = job.company && job.company.trim() ? job.company.trim() : "Target Company";
  const roleName = job.title && job.title.trim() ? job.title.trim() : "Software Engineer";

  const tailoredBullets = [
    `Architected high-throughput, low-latency distributed systems and services aligning with ${companyName} requirements and technical standards.`,
    `Designed and deployed resilient async pipelines and workflows coordinating multi-step processing and data integration for ${companyName}.`,
    `Engineered modern developer tooling and streaming telemetry interfaces delivering measurable performance gains for ${roleName} duties.`,
  ];

  const interviewTips = [
    `Highlight architectural experience building robust, scalable systems and services relevant to ${roleName} roles at ${companyName}.`,
    `Emphasize understanding of distributed state management, asynchronous pipeline execution, and high-reliability platform design.`,
    `Prepare STAR-method examples detailing engineering achievements, problem-solving, and cross-functional collaboration at ${companyName}.`,
  ];

  return { tailoredBullets, interviewTips };
}

/**
 * Executes Cloudflare Workers AI synthesis using @cf/meta/llama-3.3-70b-instruct-fp8-fast with resilient fallback.
 */
export async function generateTailoringSynthesis(
  aiBinding: Ai | undefined | null,
  candidate: CandidateProfile,
  job: JobContext,
  fitResult: FitResult
): Promise<SynthesisOutput> {
  if (aiBinding && typeof (aiBinding as { run?: unknown }).run === "function") {
    try {
      const prompt = buildSynthesisPrompt(candidate, job, fitResult);
      const response = await (aiBinding as { run: (model: string, input: unknown) => Promise<unknown> }).run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical career advisor and principal systems engineer. Always respond strictly in valid JSON with keys 'tailoredBullets' (array of 3+ strings) and 'interviewTips' (array of 3+ strings).",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }
      );

      const rawContent =
        typeof response === "string"
          ? response
          : (response as { response?: unknown; result?: { response?: unknown } })?.response ||
            (response as { result?: { response?: unknown } })?.result?.response ||
            response;

      const parsed = parseSynthesisResponse(rawContent);
      if (parsed) {
        return parsed;
      }
    } catch (err) {
      console.warn("AI synthesis encountered error, falling back to deterministic synthesis:", err);
    }
  }

  return getFallbackSynthesis(job, fitResult.score);
}

export class TailoringWorkflow extends WorkflowEntrypoint<Env, TailoringWorkflowParams> {
  async run(event: WorkflowEvent<TailoringWorkflowParams>, step: WorkflowStep) {
    const params = event.payload;
    const candidate = params.candidate || DEFAULT_CANDIDATE_PROFILE;

    // Normalize and sanitize incoming job parameters
    const normalizedJob = await step.do("normalize-job", async () => {
      return {
        jobId: params.jobId || makeId("job"),
        title: params.jobTitle.trim(),
        company: params.company.trim(),
        description: params.jobDescription.trim(),
      };
    });

    // Compute multi-dimensional fit scores across skills, experience, domain, and trajectory
    const fitResult = await step.do("compute-fit-score", async () => {
      const evaluation = evaluateCandidateJobFit(candidate, {
        title: normalizedJob.title,
        company: normalizedJob.company,
        rawDescription: normalizedJob.description,
      });

      return {
        score: evaluation.score,
        recommendation: evaluation.recommendation,
        subDimensions: evaluation.subDimensions,
      };
    });

    // Synthesize tailored resume bullets and interview prep using Workers AI with fallback
    const synthesis = await step.do("generate-tailoring-synthesis", async () => {
      const synthesisOutput = await generateTailoringSynthesis(
        this.env?.AI,
        candidate,
        normalizedJob,
        fitResult
      );

      const result: TailoringWorkflowResult = {
        jobId: normalizedJob.jobId,
        fitScore: fitResult.score,
        recommendation: fitResult.recommendation,
        subDimensions: fitResult.subDimensions,
        tailoredBullets: synthesisOutput.tailoredBullets,
        interviewTips: synthesisOutput.interviewTips,
        processedAt: new Date().toISOString(),
      };

      return result;
    });

    return synthesis;
  }
}
