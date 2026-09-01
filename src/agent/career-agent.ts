import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool, ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import { computeCompositeFitScore, deriveRecommendation } from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE, CandidateProfile } from "../lib/candidate";
import { getSystemPrompt } from "../lib/prompts";

export interface CareerAgentState {
  candidateId: string;
  candidateName: string;
  activeJobId?: string;
  lastScore?: number;
}

function convertUiMessagesToModelMessages(messages: UIMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      let text = "";
      for (const part of msg.parts) {
        if (part.type === "text") text += part.text;
      }
      modelMessages.push({ role: "user", content: text });
    } else if (msg.role === "assistant") {
      let text = "";
      for (const part of msg.parts) {
        if (part.type === "text") text += part.text;
      }
      modelMessages.push({ role: "assistant", content: text });
    }
  }
  return modelMessages;
}

export class CareerAgent extends AIChatAgent<Env, CareerAgentState> {
  initialState: CareerAgentState = {
    candidateId: DEFAULT_CANDIDATE_PROFILE.id,
    candidateName: DEFAULT_CANDIDATE_PROFILE.name,
  };

  private initDatabase(): void {
    this.sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        name TEXT,
        data TEXT,
        updated_at INTEGER
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT,
        company TEXT,
        description TEXT,
        created_at INTEGER
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS fit_scores (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        score INTEGER,
        recommendation TEXT,
        breakdown TEXT,
        created_at INTEGER
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        tailored_resume TEXT,
        interview_prep TEXT,
        created_at INTEGER
      );
    `;

    // Seed candidate if not existing
    const existing = this.sql`SELECT id FROM candidates WHERE id = ${DEFAULT_CANDIDATE_PROFILE.id}`;
    if (!existing || existing.length === 0) {
      this.sql`
        INSERT INTO candidates (id, name, data, updated_at)
        VALUES (${DEFAULT_CANDIDATE_PROFILE.id}, ${DEFAULT_CANDIDATE_PROFILE.name}, ${JSON.stringify(DEFAULT_CANDIDATE_PROFILE)}, ${Date.now()})
      `;
    }
  }

  override onStart() {
    this.initDatabase();
  }

  async getCandidate(): Promise<CandidateProfile> {
    this.initDatabase();
    const rows = this.sql`SELECT data FROM candidates WHERE id = ${DEFAULT_CANDIDATE_PROFILE.id}`;
    if (rows && rows.length > 0) {
      try {
        return JSON.parse(rows[0].data as string);
      } catch {}
    }
    return DEFAULT_CANDIDATE_PROFILE;
  }

  override async onChatMessage(onFinish?: any, options?: any) {
    this.initDatabase();
    const candidate = await this.getCandidate();
    const workersai = createWorkersAI({ binding: this.env.AI as any });

    const tools = {
      scoreJobFit: tool({
        description: "Analyze candidate fit for a job posting across skills, experience, domain, and trajectory.",
        inputSchema: z.object({
          jobTitle: z.string().describe("Target job title"),
          company: z.string().describe("Hiring company name"),
          jobDescription: z.string().describe("Full job description text"),
          skillsFit: z.number().min(0).max(100).describe("Estimated skills alignment score (0-100)"),
          experienceFit: z.number().min(0).max(100).describe("Estimated experience depth score (0-100)"),
          domainFit: z.number().min(0).max(100).describe("Estimated domain knowledge score (0-100)"),
          trajectoryFit: z.number().min(0).max(100).describe("Estimated career trajectory score (0-100)"),
          strengths: z.array(z.string()).describe("Key candidate strengths for this role"),
          gaps: z.array(z.string()).describe("Identified gaps or missing keywords"),
          reasoning: z.string().describe("Summary of evaluation reasoning"),
        }),
        execute: async (args) => {
          const compositeScore = computeCompositeFitScore({
            skillsFit: args.skillsFit,
            experienceFit: args.experienceFit,
            domainFit: args.domainFit,
            trajectoryFit: args.trajectoryFit,
          });
          const recommendation = deriveRecommendation(compositeScore);
          const jobId = "job-" + Date.now();

          this.sql`
            INSERT OR REPLACE INTO jobs (id, title, company, description, created_at)
            VALUES (${jobId}, ${args.jobTitle}, ${args.company}, ${args.jobDescription}, ${Date.now()})
          `;

          const breakdown = JSON.stringify({
            subDimensions: {
              skillsFit: args.skillsFit,
              experienceFit: args.experienceFit,
              domainFit: args.domainFit,
              trajectoryFit: args.trajectoryFit,
            },
            strengths: args.strengths,
            gaps: args.gaps,
            reasoning: args.reasoning,
          });

          this.sql`
            INSERT OR REPLACE INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at)
            VALUES (${"score-" + Date.now()}, ${jobId}, ${compositeScore}, ${recommendation}, ${breakdown}, ${Date.now()})
          `;

          this.setState({
            ...this.state,
            activeJobId: jobId,
            lastScore: compositeScore,
          });

          return {
            jobId,
            compositeScore,
            recommendation,
            breakdown: {
              subDimensions: {
                skillsFit: args.skillsFit,
                experienceFit: args.experienceFit,
                domainFit: args.domainFit,
                trajectoryFit: args.trajectoryFit,
              },
              strengths: args.strengths,
              gaps: args.gaps,
              reasoning: args.reasoning,
            },
          };
        },
      }),

      tailorResume: tool({
        description: "Generate tailored resume bullet points and summary aligned with Cloudflare or target job requirements.",
        inputSchema: z.object({
          jobTitle: z.string(),
          company: z.string(),
          focusAreas: z.array(z.string()).describe("Key technical focus areas (e.g. Workers, Durable Objects, Workflows)"),
          tailoredBullets: z.array(z.string()).describe("Impact-focused resume bullet points with metrics"),
          executiveSummary: z.string().describe("Tailored 2-3 sentence executive summary"),
        }),
        execute: async (args) => {
          const appId = "app-" + Date.now();
          const activeJobId = this.state?.activeJobId || "job-default";

          this.sql`
            INSERT OR REPLACE INTO applications (id, job_id, tailored_resume, interview_prep, created_at)
            VALUES (${appId}, ${activeJobId}, ${JSON.stringify(args)}, ${JSON.stringify([])}, ${Date.now()})
          `;

          return {
            applicationId: appId,
            jobTitle: args.jobTitle,
            company: args.company,
            executiveSummary: args.executiveSummary,
            tailoredBullets: args.tailoredBullets,
          };
        },
      }),

      triggerBatchWorkflow: tool({
        description: "Trigger an asynchronous Cloudflare Workflow pipeline for batch job ingestion and background tailoring.",
        inputSchema: z.object({
          jobTitle: z.string(),
          company: z.string(),
          jobDescription: z.string(),
        }),
        execute: async (args) => {
          const instance = await this.env.TAILORING_WORKFLOW.create({
            params: {
              jobId: "wf-job-" + Date.now(),
              jobTitle: args.jobTitle,
              company: args.company,
              jobDescription: args.jobDescription,
            },
          });

          return {
            status: "WORKFLOW_TRIGGERED",
            workflowInstanceId: instance.id,
            message: `Background Cloudflare Workflow triggered successfully (Instance: ${instance.id}).`,
          };
        },
      }),

      getCandidateProfile: tool({
        description: "Retrieve candidate background, current skills, projects, and target role preferences.",
        inputSchema: z.object({}),
        execute: async () => {
          return candidate;
        },
      }),
    };

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct"),
      system: getSystemPrompt(candidate),
      messages: convertUiMessagesToModelMessages(this.messages),
      tools,
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }
}
