import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool, ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import { computeCompositeFitScore, deriveRecommendation, makeId } from "../lib/scoring";
import { DEFAULT_CANDIDATE_PROFILE, CandidateProfile } from "../lib/candidate";
import { getSystemPrompt } from "../lib/prompts";

export interface CareerAgentState {
  candidateId: string;
  candidateName: string;
  activeJobId?: string;
  lastScore?: number;
}

function extractTextFromParts(parts: UIMessage["parts"]): string {
  let text = "";
  for (const part of parts) {
    if (part.type === "text") {
      text += part.text;
    }
  }
  return text;
}

function convertUiMessagesToModelMessages(messages: UIMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "user" || msg.role === "assistant") {
      modelMessages.push({
        role: msg.role,
        content: extractTextFromParts(msg.parts),
      });
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
    this.sql`PRAGMA foreign_keys = ON;`;

    this.sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS fit_scores (
        id TEXT PRIMARY KEY NOT NULL,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        recommendation TEXT NOT NULL,
        breakdown TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY NOT NULL,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        tailored_resume TEXT NOT NULL,
        interview_prep TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `;

    // Seed candidate if not existing (idempotent, does not overwrite updated profiles)
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

  async updateCandidate(profile: CandidateProfile): Promise<void> {
    this.initDatabase();
    this.sql`
      INSERT OR REPLACE INTO candidates (id, name, data, updated_at)
      VALUES (${profile.id}, ${profile.name}, ${JSON.stringify(profile)}, ${Date.now()})
    `;
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
          const subDimensions = {
            skillsFit: args.skillsFit,
            experienceFit: args.experienceFit,
            domainFit: args.domainFit,
            trajectoryFit: args.trajectoryFit,
          };
          const compositeScore = computeCompositeFitScore(subDimensions);
          const recommendation = deriveRecommendation(compositeScore);
          const jobId = makeId("job");
          const scoreId = makeId("score");

          this.sql`
            INSERT OR REPLACE INTO jobs (id, title, company, description, created_at)
            VALUES (${jobId}, ${args.jobTitle}, ${args.company}, ${args.jobDescription}, ${Date.now()})
          `;

          const breakdown = JSON.stringify({
            subDimensions,
            strengths: args.strengths,
            gaps: args.gaps,
            reasoning: args.reasoning,
          });

          this.sql`
            INSERT OR REPLACE INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at)
            VALUES (${scoreId}, ${jobId}, ${compositeScore}, ${recommendation}, ${breakdown}, ${Date.now()})
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
              subDimensions,
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
          const appId = makeId("app");
          let activeJobId = this.state?.activeJobId;

          if (!activeJobId) {
            activeJobId = makeId("job");
            this.sql`
              INSERT OR IGNORE INTO jobs (id, title, company, description, created_at)
              VALUES (${activeJobId}, ${args.jobTitle}, ${args.company}, ${""}, ${Date.now()})
            `;
            this.setState({
              ...this.state,
              activeJobId,
            });
          } else {
            // Ensure parent job record exists for foreign key constraint
            this.sql`
              INSERT OR IGNORE INTO jobs (id, title, company, description, created_at)
              VALUES (${activeJobId}, ${args.jobTitle}, ${args.company}, ${""}, ${Date.now()})
            `;
          }

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

      generateInterviewPrep: tool({
        description: "Formulate technical and behavioral interview preparation with structured STAR-method responses and systems design focus points.",
        inputSchema: z.object({
          jobTitle: z.string(),
          company: z.string(),
          technicalQuestions: z.array(
            z.object({
              question: z.string(),
              focusArea: z.string(),
              keyTalkingPoints: z.array(z.string()),
            })
          ).describe("Technical questions and talking points"),
          behavioralQuestions: z.array(
            z.object({
              question: z.string(),
              situationTask: z.string(),
              actionTaken: z.string(),
              resultImpact: z.string(),
            })
          ).describe("Behavioral questions with STAR-format answers"),
          systemDesignFocus: z.array(z.string()).describe("Key distributed architecture & edge design topics"),
        }),
        execute: async (args) => {
          let activeJobId = this.state?.activeJobId;
          const prepId = makeId("prep");

          if (!activeJobId) {
            activeJobId = makeId("job");
            this.sql`
              INSERT OR IGNORE INTO jobs (id, title, company, description, created_at)
              VALUES (${activeJobId}, ${args.jobTitle}, ${args.company}, ${""}, ${Date.now()})
            `;
            this.setState({
              ...this.state,
              activeJobId,
            });
          } else {
            // Ensure parent job record exists for foreign key constraint
            this.sql`
              INSERT OR IGNORE INTO jobs (id, title, company, description, created_at)
              VALUES (${activeJobId}, ${args.jobTitle}, ${args.company}, ${""}, ${Date.now()})
            `;
          }

          // Check if an application already exists for this job, else create one
          const existingApp = this.sql`SELECT id, tailored_resume FROM applications WHERE job_id = ${activeJobId} ORDER BY created_at DESC LIMIT 1`;
          if (existingApp && existingApp.length > 0) {
            const appId = existingApp[0].id as string;
            this.sql`
              UPDATE applications
              SET interview_prep = ${JSON.stringify(args)}, created_at = ${Date.now()}
              WHERE id = ${appId}
            `;
          } else {
            this.sql`
              INSERT OR REPLACE INTO applications (id, job_id, tailored_resume, interview_prep, created_at)
              VALUES (${prepId}, ${activeJobId}, ${JSON.stringify({})}, ${JSON.stringify(args)}, ${Date.now()})
            `;
          }

          return {
            jobTitle: args.jobTitle,
            company: args.company,
            technicalQuestions: args.technicalQuestions,
            behavioralQuestions: args.behavioralQuestions,
            systemDesignFocus: args.systemDesignFocus,
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
          const workflowJobId = makeId("wf-job");
          const instance = await this.env.TAILORING_WORKFLOW.create({
            params: {
              jobId: workflowJobId,
              jobTitle: args.jobTitle,
              company: args.company,
              jobDescription: args.jobDescription,
            },
          });

          return {
            status: "WORKFLOW_TRIGGERED",
            workflowInstanceId: instance.id,
            jobId: workflowJobId,
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
