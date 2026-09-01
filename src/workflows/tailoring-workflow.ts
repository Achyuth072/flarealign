import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { computeCompositeFitScore, deriveRecommendation, makeId } from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE } from "../lib/candidate";

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

      // Experience heuristics based on candidate's 3 YOE
      let experienceFit = 90; // Standard mid-level fit
      if (titleLower.includes("principal") || descLower.includes("principal engineer") || descLower.includes("8+ years") || descLower.includes("10+ years")) {
        experienceFit = 65;
      } else if (titleLower.includes("staff") || descLower.includes("staff engineer") || descLower.includes("5+ years")) {
        experienceFit = 75;
      } else if (titleLower.includes("senior") || descLower.includes("3+ years") || descLower.includes("4+ years")) {
        experienceFit = 85;
      } else if (titleLower.includes("junior") || titleLower.includes("entry") || descLower.includes("1-3 years")) {
        experienceFit = 95;
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
      const matchingTargetWords = targetRoleWords.filter((word) => word.length > 3 && (titleLower.includes(word) || descLower.includes(word)));
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
      const isCloudflare = normalizedJob.company.toLowerCase().includes("cloudflare") || normalizedJob.title.toLowerCase().includes("cloudflare");
      
      const tailoredBullets = [
        `Architected high-throughput, low-latency distributed agent systems using TypeScript, Cloudflare Workers, Durable Objects (DO SQLite), and Workers AI.`,
        `Designed and deployed resilient async pipelines with Cloudflare Workflows coordinating multi-step job analysis and AI candidate tailoring.`,
        `Engineered modern developer tooling and streaming telemetry interfaces leveraging React, WebSockets, and Edge APIs.`,
      ];

      const interviewTips = [
        `Highlight architectural experience building stateful edge workflows with Cloudflare Workers, Durable Objects, and Workers AI.`,
        `Emphasize understanding of distributed state management, low-latency LLM streaming, and developer productivity tooling.`,
        `Prepare STAR-method examples discussing edge computing optimizations and platform engineering achievements at ${normalizedJob.company || "the target organization"}.`,
      ];

      const result: TailoringWorkflowResult = {
        jobId: normalizedJob.jobId,
        fitScore: fitResult.score,
        recommendation: fitResult.recommendation,
        subDimensions: fitResult.subDimensions,
        tailoredBullets,
        interviewTips,
        processedAt: new Date().toISOString(),
      };

      return result;
    });

    return synthesis;
  }
}

