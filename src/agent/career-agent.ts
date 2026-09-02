import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool, isStepCount, convertToModelMessages } from "ai";
import { z } from "zod";
import { computeCompositeFitScore, deriveRecommendation, makeId } from "../lib/scoring";
import {
  DEFAULT_CANDIDATE_PROFILE,
  CandidateProfile,
  CandidateUpdateSchema,
  patchCandidateProfile,
} from "../lib/candidate";
import { getSystemPrompt } from "../lib/prompts";
import { InterviewPrepSchema } from "../lib/interview";
import { initSqliteSchema, seedCandidateIfMissing } from "../lib/schema";

export interface CareerAgentState {
  candidateId: string;
  candidateName: string;
  activeJobId?: string;
  lastScore?: number;
}

export class CareerAgent extends AIChatAgent<Env, CareerAgentState> {
  initialState: CareerAgentState = {
    candidateId: DEFAULT_CANDIDATE_PROFILE.id,
    candidateName: DEFAULT_CANDIDATE_PROFILE.name,
  };

  private initDatabase(): void {
    initSqliteSchema((statement) => {
      this.sql([statement] as unknown as TemplateStringsArray);
    });

    seedCandidateIfMissing(
      (candidateId) => {
        const rows = this.sql`SELECT id FROM candidates WHERE id = ${candidateId}`;
        return !!rows && rows.length > 0;
      },
      (row) => {
        this.sql`
          INSERT INTO candidates (id, name, data, updated_at)
          VALUES (${row.id}, ${row.name}, ${row.data}, ${row.updated_at})
        `;
      },
      DEFAULT_CANDIDATE_PROFILE
    );
  }

  private ensureActiveJobId(jobTitle: string, company: string, description: string = ""): string {
    let activeJobId = this.state?.activeJobId;

    if (!activeJobId) {
      activeJobId = makeId("job");
      this.setState({
        ...this.state,
        activeJobId,
      });
    }

    // Ensure parent job record exists for foreign key constraints
    this.sql`
      INSERT OR IGNORE INTO jobs (id, title, company, description, created_at)
      VALUES (${activeJobId}, ${jobTitle}, ${company}, ${description}, ${Date.now()})
    `;

    return activeJobId;
  }

  private upsertApplication(
    activeJobId: string,
    updates: { tailored_resume?: unknown; interview_prep?: unknown }
  ): string {
    const existingApp = this.sql`SELECT id, tailored_resume, interview_prep FROM applications WHERE job_id = ${activeJobId} ORDER BY created_at DESC LIMIT 1`;
    if (existingApp && existingApp.length > 0) {
      const existingId = existingApp[0].id as string;
      if (updates.tailored_resume !== undefined) {
        this.sql`
          UPDATE applications
          SET tailored_resume = ${JSON.stringify(updates.tailored_resume)}, created_at = ${Date.now()}
          WHERE id = ${existingId}
        `;
      }
      if (updates.interview_prep !== undefined) {
        this.sql`
          UPDATE applications
          SET interview_prep = ${JSON.stringify(updates.interview_prep)}, created_at = ${Date.now()}
          WHERE id = ${existingId}
        `;
      }
      return existingId;
    }

    const newId = makeId("app");
    this.sql`
      INSERT OR REPLACE INTO applications (id, job_id, tailored_resume, interview_prep, created_at)
      VALUES (
        ${newId},
        ${activeJobId},
        ${JSON.stringify(updates.tailored_resume ?? {})},
        ${JSON.stringify(updates.interview_prep ?? [])},
        ${Date.now()}
      )
    `;
    return newId;
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
      } catch (err) {
        console.warn("Failed to parse candidate profile JSON from SQLite:", err);
      }
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

  override async onChatMessage(
    ...[onFinish, options]: Parameters<AIChatAgent<Env, CareerAgentState>["onChatMessage"]>
  ) {
    this.initDatabase();
    const candidate = await this.getCandidate();
    const workersai = createWorkersAI({
      binding: this.env.AI as unknown as Extract<Parameters<typeof createWorkersAI>[0], { binding: unknown }>["binding"],
    });

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
          const activeJobId = this.ensureActiveJobId(args.jobTitle, args.company);
          const applicationId = this.upsertApplication(activeJobId, { tailored_resume: args });

          return {
            applicationId,
            jobTitle: args.jobTitle,
            company: args.company,
            executiveSummary: args.executiveSummary,
            tailoredBullets: args.tailoredBullets,
          };
        },
      }),

      generateInterviewPrep: tool({
        description: "Formulate technical and behavioral interview preparation with structured STAR-method responses and systems design focus points.",
        inputSchema: InterviewPrepSchema,
        execute: async (args) => {
          const activeJobId = this.ensureActiveJobId(args.jobTitle, args.company);
          this.upsertApplication(activeJobId, { interview_prep: args });

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

      updateCandidateProfile: tool({
        description:
          "Update candidate profile fields such as name, location, targetRole, yearsOfExperience, skills, or resumeSummary in persistent SQLite storage.",
        inputSchema: CandidateUpdateSchema,
        execute: async (patch) => {
          const current = await this.getCandidate();
          const updated = patchCandidateProfile(current, patch);
          await this.updateCandidate(updated);
          this.setState({
            ...this.state,
            candidateName: updated.name,
          });
          return {
            success: true,
            message: `Candidate profile for ${updated.name} updated successfully.`,
            candidate: updated,
          };
        },
      }),
    };

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: getSystemPrompt(candidate),
      messages: await convertToModelMessages(this.messages),
      tools,
      stopWhen: isStepCount(5),
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }
}
