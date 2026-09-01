import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { computeCompositeFitScore, deriveRecommendation } from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE } from "../lib/candidate";

export interface TailoringWorkflowParams {
  jobId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
}

export interface TailoringWorkflowResult {
  jobId: string;
  fitScore: number;
  recommendation: string;
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
        jobId: params.jobId || "job-" + Date.now(),
        title: params.jobTitle.trim(),
        company: params.company.trim(),
        description: params.jobDescription.trim(),
      };
    });

    // Step 2: Compute Dimensional Fit Score
    const fitResult = await step.do("compute-fit-score", async () => {
      const descLower = normalizedJob.description.toLowerCase();

      // Skills analysis
      let skillsMatches = 0;
      for (const skill of DEFAULT_CANDIDATE_PROFILE.skills) {
        if (descLower.includes(skill.toLowerCase())) {
          skillsMatches++;
        }
      }
      const skillsFit = Math.min(100, Math.max(50, Math.round((skillsMatches / 6) * 100)));

      // Experience & domain heuristics
      const experienceFit = descLower.includes("senior") || descLower.includes("staff") ? 75 : 90;
      const domainFit =
        descLower.includes("cloudflare") ||
        descLower.includes("edge") ||
        descLower.includes("distributed") ||
        descLower.includes("platform") ||
        descLower.includes("productivity")
          ? 95
          : 75;
      const trajectoryFit = 85;

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

    // Step 3: Synthesize Tailored Resume & Interview Prep
    const synthesis = await step.do("generate-tailoring-synthesis", async () => {
      return {
        tailoredBullets: [
          `Architected low-latency distributed agent systems using Cloudflare Workers, Durable Objects (DO SQLite), and Workers AI to automate developer workflows.`,
          `Designed resilient edge pipelines with Cloudflare Workflows coordinating multi-step asynchronous job analysis and candidate matching.`,
          `Built high-performance full-stack TypeScript interfaces integrating WebSockets, React, and Tailwind CSS for real-time AI telemetry.`,
        ],
        interviewTips: [
          `Highlight experience building on Cloudflare's serverless edge ecosystem: Workers, Durable Objects, and Workflows.`,
          `Emphasize understanding of distributed consensus, stateful actors, and low-latency LLM inference streaming.`,
          `Be prepared to walk through architectural decisions made in the Pulse Career Module and Cloudflare Agent.`,
        ],
      };
    });

    // Step 4: Finalize
    return await step.do("finalize-result", async () => {
      const result: TailoringWorkflowResult = {
        jobId: normalizedJob.jobId,
        fitScore: fitResult.score,
        recommendation: fitResult.recommendation,
        tailoredBullets: synthesis.tailoredBullets,
        interviewTips: synthesis.interviewTips,
        processedAt: new Date().toISOString(),
      };
      return result;
    });
  }
}

