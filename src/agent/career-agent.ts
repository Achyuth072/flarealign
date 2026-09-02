import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool, isStepCount, convertToModelMessages, NoSuchToolError } from "ai";
import { computeCompositeFitScore, deriveRecommendation, makeId } from "../lib/scoring";
import {
  DEFAULT_CANDIDATE_PROFILE,
  CandidateProfile,
  CandidateUpdateSchema,
  patchCandidateProfile,
} from "../lib/candidate";
import { JobPosting, JobPostingInput, normalizeJobPosting } from "../lib/job";
import { getSystemPrompt } from "../lib/prompts";
import { InterviewPrepSchema } from "../lib/interview";
import { seedCandidateIfMissing, jobPostingToRow, rowToJobPosting, JobRow } from "../lib/schema";
import { repairStringifiedContainers } from "../lib/repair-tool-input";
import { withDedupedToolCallEnvelopes, WorkersAIBinding } from "../lib/workers-ai-binding";
import {
  ScoreJobFitSchema,
  TailorResumeSchema,
  TriggerBatchWorkflowSchema,
  IngestJobDescriptionSchema,
} from "../lib/tool-schemas";
import { formatUserActorName, parseUserIdFromAgentName } from "../lib/session";

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
    try {
      this.sql`PRAGMA foreign_keys = ON;`;
      this.sql`
        CREATE TABLE IF NOT EXISTS candidates (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `;
      this.sql`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT 'Remote',
          required_skills TEXT NOT NULL DEFAULT '[]',
          preferred_skills TEXT NOT NULL DEFAULT '[]',
          responsibilities TEXT NOT NULL DEFAULT '[]',
          experience_level TEXT NOT NULL DEFAULT 'Mid-Senior Level',
          raw_description TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT 0
        )
      `;
      this.sql`
        CREATE TABLE IF NOT EXISTS fit_scores (
          id TEXT PRIMARY KEY NOT NULL,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          score INTEGER NOT NULL,
          recommendation TEXT NOT NULL,
          breakdown TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `;
      this.sql`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY NOT NULL,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          tailored_resume TEXT NOT NULL,
          interview_prep TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `;
    } catch (err) {
      console.warn("Schema initialization notice:", err);
    }

    // Auto-migrate older jobs table if columns are missing
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN location TEXT NOT NULL DEFAULT 'Remote'`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN required_skills TEXT NOT NULL DEFAULT '[]'`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN preferred_skills TEXT NOT NULL DEFAULT '[]'`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN responsibilities TEXT NOT NULL DEFAULT '[]'`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN experience_level TEXT NOT NULL DEFAULT 'Mid-Senior Level'`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN raw_description TEXT NOT NULL DEFAULT ''`;
    } catch {}
    try {
      this.sql`ALTER TABLE jobs ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`;
    } catch {}

    seedCandidateIfMissing(
      (candidateId) => {
        try {
          const rows = this.sql`SELECT id FROM candidates WHERE id = ${candidateId}`;
          return !!rows && rows.length > 0;
        } catch {
          return false;
        }
      },
      (row) => {
        try {
          this.sql`
            INSERT OR REPLACE INTO candidates (id, name, data, updated_at)
            VALUES (${row.id}, ${row.name}, ${row.data}, ${row.updated_at})
          `;
        } catch (err) {
          console.warn("Failed to seed candidate:", err);
        }
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

    const now = Date.now();
    // Ensure parent job record exists for foreign key constraints
    this.sql`
      INSERT OR IGNORE INTO jobs (
        id, title, company, location, required_skills, preferred_skills,
        responsibilities, experience_level, raw_description, created_at, updated_at
      )
      VALUES (
        ${activeJobId}, ${jobTitle}, ${company}, 'Remote', '[]', '[]', '[]', 'Mid-Senior Level', ${description}, ${now}, ${now}
      )
    `;

    return activeJobId;
  }

  async getActiveJob(): Promise<JobPosting | null> {
    this.initDatabase();

    if (this.state?.activeJobId) {
      const rows = this.sql`SELECT * FROM jobs WHERE id = ${this.state.activeJobId}`;
      if (rows && rows.length > 0) {
        return rowToJobPosting(rows[0] as unknown as JobRow);
      }
    }

    const rows = this.sql`SELECT * FROM jobs ORDER BY updated_at DESC, created_at DESC LIMIT 1`;
    if (rows && rows.length > 0) {
      const job = rowToJobPosting(rows[0] as unknown as JobRow);
      if (this.state?.activeJobId !== job.id) {
        this.setState({
          ...this.state,
          activeJobId: job.id,
        });
      }
      return job;
    }

    return null;
  }

  async saveActiveJob(input: JobPostingInput): Promise<JobPosting> {
    this.initDatabase();
    const job = normalizeJobPosting(input);
    const row = jobPostingToRow(job);

    // Invalidate prior jobs and stale evaluations to prevent orphaned jobs and stale recommendations
    try {
      this.sql`DELETE FROM jobs WHERE id != ${row.id}`;
      this.sql`DELETE FROM fit_scores`;
      this.sql`DELETE FROM applications`;
    } catch (err) {
      console.warn("Failed to clear stale records on job update:", err);
    }

    this.sql`
      INSERT OR REPLACE INTO jobs (
        id, title, company, location, required_skills, preferred_skills,
        responsibilities, experience_level, raw_description, created_at, updated_at
      ) VALUES (
        ${row.id}, ${row.title}, ${row.company}, ${row.location},
        ${row.required_skills}, ${row.preferred_skills}, ${row.responsibilities},
        ${row.experience_level}, ${row.raw_description}, ${row.created_at}, ${row.updated_at}
      )
    `;

    this.setState({
      ...this.state,
      activeJobId: job.id,
      lastScore: undefined,
    });

    return job;
  }

  async clearActiveJob(): Promise<void> {
    this.initDatabase();
    try {
      this.sql`DELETE FROM fit_scores`;
      this.sql`DELETE FROM applications`;
      this.sql`DELETE FROM jobs`;
    } catch (err) {
      console.warn("Failed to clear jobs/fit_scores/applications:", err);
    }
    this.setState({
      ...this.state,
      activeJobId: undefined,
      lastScore: undefined,
    });
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

  private getUserId(): string | null {
    return parseUserIdFromAgentName(this.name);
  }

  async getCandidate(): Promise<CandidateProfile> {
    this.initDatabase();

    const userId = this.getUserId();
    if (this.name?.startsWith("session") && userId && this.env?.CareerAgent) {
      try {
        const userActorName = formatUserActorName(userId);
        const userStub = this.env.CareerAgent.get(this.env.CareerAgent.idFromName(userActorName));
        const profile = await (
          userStub as unknown as { getCandidate: () => Promise<CandidateProfile> }
        ).getCandidate();
        if (profile) return profile;
      } catch (err) {
        console.warn("[CareerAgent] Failed to fetch candidate from user DO actor:", err);
      }
    }

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

    const userId = this.getUserId();
    if (this.name?.startsWith("session") && userId && this.env?.CareerAgent) {
      try {
        const userActorName = formatUserActorName(userId);
        const userStub = this.env.CareerAgent.get(this.env.CareerAgent.idFromName(userActorName));
        await (
          userStub as unknown as { updateCandidate: (p: CandidateProfile) => Promise<void> }
        ).updateCandidate(profile);
      } catch (err) {
        console.warn("[CareerAgent] Failed to sync candidate to user DO actor:", err);
      }
    }
  }

  override async onChatMessage(
    ...[onFinish, options]: Parameters<AIChatAgent<Env, CareerAgentState>["onChatMessage"]>
  ) {
    this.initDatabase();
    const candidate = await this.getCandidate();
    const activeJob = await this.getActiveJob();
    console.log("[CareerAgent] onChatMessage turn started. History length:", this.messages.length);
    const workersai = createWorkersAI({
      binding: withDedupedToolCallEnvelopes(this.env.AI as unknown as WorkersAIBinding),
    });

    const tools = {
      ingestJobDescription: tool({
        description:
          "Ingest, parse, and activate a target job description in persistent SQLite storage for candidate fit scoring, tailoring, and interview prep.",
        inputSchema: IngestJobDescriptionSchema,
        execute: async (args) => {
          try {
            const savedJob = await this.saveActiveJob({
              title: args.title,
              company: args.company,
              location: args.location || "Remote",
              requiredSkills: args.requiredSkills || [],
              preferredSkills: args.preferredSkills || [],
              responsibilities: args.responsibilities || [],
              experienceLevel: args.experienceLevel || "Mid-Senior Level",
              rawDescription: args.rawDescription || "",
            });

            return {
              success: true,
              message: `Target job '${savedJob.title}' at ${savedJob.company} successfully ingested and activated.`,
              job: savedJob,
            };
          } catch (err) {
            console.error("[CareerAgent] Error in ingestJobDescription execute:", err);
            return {
              success: false,
              error: true,
              message: `Failed to ingest job description: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      }),

      scoreJobFit: tool({
        description: "Analyze candidate fit for a job posting across skills, experience, domain, and trajectory.",
        inputSchema: ScoreJobFitSchema,
        execute: async (args) => {
          const subDimensions = {
            skillsFit: args.skillsFit,
            experienceFit: args.experienceFit,
            domainFit: args.domainFit,
            trajectoryFit: args.trajectoryFit,
          };
          const compositeScore = computeCompositeFitScore(subDimensions);
          const recommendation = deriveRecommendation(compositeScore);

          try {
            const activeJobId = this.ensureActiveJobId(args.jobTitle, args.company, args.jobDescription || "");
            const scoreId = makeId("score");

            const breakdown = JSON.stringify({
              subDimensions,
              strengths: args.strengths,
              gaps: args.gaps,
              reasoning: args.reasoning,
            });

            this.sql`
              INSERT OR REPLACE INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at)
              VALUES (${scoreId}, ${activeJobId}, ${compositeScore}, ${recommendation}, ${breakdown}, ${Date.now()})
            `;

            this.setState({
              ...this.state,
              activeJobId,
              lastScore: compositeScore,
            });

            return {
              jobId: activeJobId,
              compositeScore,
              recommendation,
              breakdown: {
                subDimensions,
                strengths: args.strengths,
                gaps: args.gaps,
                reasoning: args.reasoning,
              },
            };
          } catch (err) {
            console.error("[CareerAgent] Error in scoreJobFit execute:", err);
            return {
              error: true,
              message: `Score computed but failed to persist: ${err instanceof Error ? err.message : String(err)}`,
              compositeScore,
              recommendation,
              breakdown: {
                subDimensions,
                strengths: args.strengths,
                gaps: args.gaps,
                reasoning: args.reasoning,
              },
            };
          }
        },
      }),

      tailorResume: tool({
        description: "Generate tailored resume bullet points and summary aligned with Cloudflare or target job requirements.",
        inputSchema: TailorResumeSchema,
        execute: async (args) => {
          console.log("[CareerAgent] Executing tailorResume:", { jobTitle: args.jobTitle, company: args.company });
          try {
            const activeJobId = this.ensureActiveJobId(args.jobTitle, args.company);
            const applicationId = this.upsertApplication(activeJobId, { tailored_resume: args });
            console.log("[CareerAgent] Successfully saved tailored resume, applicationId:", applicationId);

            return {
              applicationId,
              jobTitle: args.jobTitle,
              company: args.company,
              executiveSummary: args.executiveSummary,
              tailoredBullets: args.tailoredBullets,
            };
          } catch (err) {
            console.error("[CareerAgent] Error in tailorResume execute:", err);
            return {
              error: true,
              message: `Failed to persist tailored resume: ${err instanceof Error ? err.message : String(err)}`,
              jobTitle: args.jobTitle,
              company: args.company,
              executiveSummary: args.executiveSummary,
              tailoredBullets: args.tailoredBullets,
            };
          }
        },
      }),

      generateInterviewPrep: tool({
        description: "Formulate technical and behavioral interview preparation with structured STAR-method responses and systems design focus points.",
        inputSchema: InterviewPrepSchema,
        execute: async (args) => {
          try {
            const activeJobId = this.ensureActiveJobId(args.jobTitle, args.company);
            const payload = {
              jobTitle: args.jobTitle,
              company: args.company,
              technicalQuestions: args.technicalQuestions || [],
              behavioralQuestions: args.behavioralQuestions || [],
              systemDesignFocus: args.systemDesignFocus || [],
            };
            this.upsertApplication(activeJobId, { interview_prep: payload });

            return payload;
          } catch (err) {
            console.error("[CareerAgent] Error in generateInterviewPrep execute:", err);
            return {
              error: true,
              message: `Failed to persist interview prep: ${err instanceof Error ? err.message : String(err)}`,
              jobTitle: args.jobTitle,
              company: args.company,
              technicalQuestions: args.technicalQuestions,
              behavioralQuestions: args.behavioralQuestions,
              systemDesignFocus: args.systemDesignFocus,
            };
          }
        },
      }),

      triggerBatchWorkflow: tool({
        description: "Trigger an asynchronous Cloudflare Workflow pipeline for batch job ingestion and background tailoring.",
        inputSchema: TriggerBatchWorkflowSchema,
        execute: async (args) => {
          try {
            const workflowJobId = makeId("wf-job");
            const instance = await this.env.TAILORING_WORKFLOW.create({
              params: {
                jobId: workflowJobId,
                jobTitle: args.jobTitle,
                company: args.company,
                jobDescription: args.jobDescription || "",
              },
            });

            return {
              status: "WORKFLOW_TRIGGERED",
              workflowInstanceId: instance.id,
              jobId: workflowJobId,
              message: `Background Cloudflare Workflow triggered successfully (Instance: ${instance.id}).`,
            };
          } catch (err) {
            return {
              status: "WORKFLOW_ERROR",
              error: true,
              message: `Failed to trigger workflow: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      }),

      updateCandidateProfile: tool({
        description:
          "Update candidate profile fields such as name, location, targetRole, yearsOfExperience, skills, or resumeSummary in persistent SQLite storage.",
        inputSchema: CandidateUpdateSchema,
        execute: async (patch) => {
          try {
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
          } catch (err) {
            return {
              success: false,
              error: true,
              message: `Failed to update profile: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      }),
    };

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: getSystemPrompt(candidate, activeJob),
      messages: await convertToModelMessages(this.messages),
      tools,
      stopWhen: isStepCount(5),
      abortSignal: options?.abortSignal,
      repairToolCall: async ({ toolCall, error }) => {
        if (NoSuchToolError.isInstance(error)) {
          return null;
        }
        const input = repairStringifiedContainers(toolCall.input);
        if (input === null) {
          return null;
        }
        console.warn("[CareerAgent] Repaired stringified tool input for", toolCall.toolName);
        return { ...toolCall, input };
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });
  }
}
