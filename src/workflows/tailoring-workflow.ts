import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Ai } from "@cloudflare/workers-types";
import { computeCompositeFitScore, deriveRecommendation, makeId } from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE, CandidateProfile } from "../lib/candidate";

export interface TailoringWorkflowParams {
  jobId?: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
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

/**
 * Builds the structured LLM prompt combining candidate profile, target job, and computed fit breakdown.
 */
export function buildSynthesisPrompt(
  candidate: CandidateProfile,
  job: { title: string; company: string; description: string },
  fitResult: FitResult
): string {
  return `You are an expert technical career advisor and principal systems engineer specializing in cloud platforms, distributed systems, and the Cloudflare ecosystem.

Synthesize customized resume bullet points and STAR interview talking points tailored to the target job description and candidate fit profile.

CANDIDATE CONTEXT:
- Name: ${candidate.name}
- Target Role: ${candidate.targetRole}
- Years of Experience: ${candidate.yearsOfExperience}
- Core Skills: ${candidate.skills.join(", ")}
- Resume Summary: ${candidate.resumeSummary}

TARGET ROLE CONTEXT:
- Title: ${job.title || "Software Engineer"}
- Company: ${job.company || "Target Company"}
- Job Description:
${job.description || "N/A"}

FIT EVALUATION BREAKDOWN:
- Overall Fit Score: ${fitResult.score}/100 (${fitResult.recommendation})
- Skills Fit: ${fitResult.subDimensions.skillsFit}/100
- Experience Fit: ${fitResult.subDimensions.experienceFit}/100
- Domain Fit: ${fitResult.subDimensions.domainFit}/100
- Trajectory Fit: ${fitResult.subDimensions.trajectoryFit}/100

INSTRUCTIONS:
1. Generate at least 3 high-impact, quantified resume bullet points highlighting candidate strengths, distributed systems / edge computing expertise, and Cloudflare primitives (Workers, Durable Objects, Workflows, Pages, TypeScript, DO SQLite, Workers AI) relevant to ${job.company || "the company"} and this ${job.title} role.
2. Generate at least 3 concrete STAR-method interview talking points or system design focus tips specifically customized for ${job.company || "the target company"} and this position.
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
  } catch {}

  return null;
}

/**
 * Returns deterministic, high-quality fallback synthesis if AI inference is unavailable or fails.
 */
export function getFallbackSynthesis(
  job: { title: string; company: string; description?: string },
  fitScore?: number
): SynthesisOutput {
  const companyName = job.company ? job.company.trim() : "Cloudflare";
  const roleName = job.title ? job.title.trim() : "Software Engineer";

  const tailoredBullets = [
    `Architected high-throughput, low-latency distributed agent systems using TypeScript, Cloudflare Workers, Durable Objects (DO SQLite), and Workers AI.`,
    `Designed and deployed resilient async pipelines with Cloudflare Workflows coordinating multi-step job analysis and AI candidate tailoring for ${companyName}.`,
    `Engineered modern developer tooling and streaming telemetry interfaces leveraging React, WebSockets, and Edge APIs.`,
  ];

  const interviewTips = [
    `Highlight architectural experience building stateful edge workflows with Cloudflare Workers, Durable Objects, and Workers AI for ${roleName} roles.`,
    `Emphasize understanding of distributed state management, low-latency LLM streaming, and developer productivity tooling.`,
    `Prepare STAR-method examples discussing edge computing optimizations and platform engineering achievements at ${companyName}.`,
  ];

  return { tailoredBullets, interviewTips };
}

/**
 * Executes Cloudflare Workers AI synthesis using @cf/meta/llama-3.3-70b-instruct with resilient fallback.
 */
export async function generateTailoringSynthesis(
  aiBinding: Ai | undefined | null,
  candidate: CandidateProfile,
  job: { title: string; company: string; description: string },
  fitResult: FitResult
): Promise<SynthesisOutput> {
  if (aiBinding && typeof (aiBinding as any).run === "function") {
    try {
      const prompt = buildSynthesisPrompt(candidate, job, fitResult);
      const response: any = await (aiBinding as any).run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical career advisor and principal systems engineer specializing in cloud platforms, edge computing, and Cloudflare ecosystem engineering. Always respond strictly in valid JSON with keys 'tailoredBullets' (array of 3+ strings) and 'interviewTips' (array of 3+ strings).",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const rawContent =
        typeof response === "string"
          ? response
          : response?.response || (response?.result ? response.result.response : response);

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

    // Step 1: Ingest and Validate
    const normalizedJob = await step.do("normalize-job", async () => {
      return {
        jobId: params.jobId || makeId("job"),
        title: params.jobTitle.trim(),
        company: params.company.trim(),
        description: params.jobDescription.trim(),
      };
    });

    // Step 2: Compute Dimensional Fit Score
    const fitResult = await step.do("compute-fit-score", async () => {
      const descLower = normalizedJob.description.toLowerCase();
      const titleLower = normalizedJob.title.toLowerCase();

      // Skills analysis: count matching candidate skills in description
      let skillsMatches = 0;
      for (const skill of DEFAULT_CANDIDATE_PROFILE.skills) {
        if (descLower.includes(skill.toLowerCase())) {
          skillsMatches++;
        }
      }
      // Proportional score: 0 to 100 based on relevant skill coverage (4+ matches gives 90+)
      const skillsFit = Math.min(100, Math.max(20, Math.round((skillsMatches / 5) * 100)));

      // Experience heuristics calibrated for candidate's 3 YOE
      let experienceFit = 95; // Default mid-level fit (ideal match for 3 YOE)
      if (
        titleLower.includes("principal") ||
        descLower.includes("principal engineer") ||
        descLower.includes("8+ years") ||
        descLower.includes("10+ years")
      ) {
        experienceFit = 55;
      } else if (
        titleLower.includes("staff") ||
        descLower.includes("staff engineer") ||
        descLower.includes("6+ years") ||
        descLower.includes("5+ years")
      ) {
        experienceFit = 70;
      } else if (
        titleLower.includes("senior") ||
        descLower.includes("4+ years") ||
        descLower.includes("5 years")
      ) {
        experienceFit = 85;
      } else if (
        titleLower.includes("junior") ||
        titleLower.includes("entry") ||
        descLower.includes("1-2 years") ||
        descLower.includes("0-2 years")
      ) {
        experienceFit = 90;
      }

      // Domain heuristics
      const hasCloudflare = descLower.includes("cloudflare") || titleLower.includes("cloudflare");
      const hasEdgeDistributed =
        descLower.includes("edge") ||
        descLower.includes("distributed") ||
        descLower.includes("serverless") ||
        descLower.includes("worker") ||
        descLower.includes("durable object");
      const hasPlatformProductivity =
        descLower.includes("platform") ||
        descLower.includes("productivity") ||
        descLower.includes("developer experience") ||
        descLower.includes("tooling");

      let domainFit = 70;
      if (hasCloudflare && (hasEdgeDistributed || hasPlatformProductivity)) {
        domainFit = 98;
      } else if (hasEdgeDistributed && hasPlatformProductivity) {
        domainFit = 92;
      } else if (hasEdgeDistributed || hasPlatformProductivity || hasCloudflare) {
        domainFit = 85;
      }

      // Trajectory alignment with Target Role
      const targetRoleWords = DEFAULT_CANDIDATE_PROFILE.targetRole.toLowerCase().split(/\s+/);
      const matchingTargetWords = targetRoleWords.filter(
        (word) => word.length > 3 && (titleLower.includes(word) || descLower.includes(word))
      );
      const trajectoryFit = matchingTargetWords.length >= 2 ? 95 : 80;

      const score = computeCompositeFitScore({
        skillsFit,
        experienceFit,
        domainFit,
        trajectoryFit,
      });

      return {
        score,
        recommendation: deriveRecommendation(score),
        subDimensions: { skillsFit, experienceFit, domainFit, trajectoryFit },
      };
    });

    // Step 3: Synthesize Tailored Resume & Interview Prep and Finalize
    const synthesis = await step.do("generate-tailoring-synthesis", async () => {
      const synthesisOutput = await generateTailoringSynthesis(
        this.env?.AI,
        DEFAULT_CANDIDATE_PROFILE,
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
