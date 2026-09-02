import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  TechnicalQuestionSchema,
  BehavioralQuestionSchema,
  InterviewPrepSchema,
  parseInterviewPrep,
  InterviewPrep,
} from "./interview";
import { initSqliteSchema, ApplicationRow } from "./schema";

describe("Interview Prep Schemas and Persistence", () => {
  describe("Zod Validation Schemas", () => {
    it("validates TechnicalQuestionSchema structure", () => {
      const validTechQ = {
        question: "How does Durable Objects SQLite handle transaction consistency?",
        focusArea: "Distributed State & SQLite",
        keyTalkingPoints: [
          "Single-threaded execution guarantees serializability per DO instance",
          "Point-in-time point recovery and automatic write-ahead logging (WAL)",
          "Sub-millisecond access from co-located Workers",
        ],
      };

      const parsed = TechnicalQuestionSchema.parse(validTechQ);
      expect(parsed.question).toBe(validTechQ.question);
      expect(parsed.focusArea).toBe(validTechQ.focusArea);
      expect(parsed.keyTalkingPoints.length).toBe(3);
    });

    it("validates BehavioralQuestionSchema with strict STAR format", () => {
      const validSTAR = {
        question: "Describe a time you resolved an edge performance regression under SLA pressure.",
        situationTask:
          "S: P99 latency spiked 45% during global rollout. T: Identify root cause and restore sub-15ms edge latency within 1 hour.",
        actionTaken:
          "A: Analyzed edge trace logs, identified cold start bottleneck in DO connection pooling, and deployed optimized connection reuse via Workers RPC.",
        resultImpact:
          "R: Reduced P99 latency by 68% (down to 11ms) and prevented SLA breach for 2M daily active requests.",
      };

      const parsed = BehavioralQuestionSchema.parse(validSTAR);
      expect(parsed.situationTask).toContain("P99 latency");
      expect(parsed.actionTaken).toContain("Workers RPC");
      expect(parsed.resultImpact).toContain("Reduced P99 latency");
    });

    it("rejects behavioral questions missing required STAR fields", () => {
      const missingAction = {
        question: "Tell me about a conflict in code review.",
        situationTask: "Disagreement over caching strategy.",
        resultImpact: "Team aligned on distributed cache.",
      };

      expect(() => BehavioralQuestionSchema.parse(missingAction)).toThrow();
    });

    it("validates complete InterviewPrepSchema structure", () => {
      const fullPrep: InterviewPrep = {
        jobTitle: "Software Engineer – Edge Platform & DevEx",
        company: "Cloudflare",
        technicalQuestions: [
          {
            question: "How do Cloudflare Workflows provide durable execution?",
            focusArea: "Cloudflare Workflows Engine",
            keyTalkingPoints: ["Step retries with exponential backoff", "Deterministic checkpointing"],
          },
        ],
        behavioralQuestions: [
          {
            question: "How do you navigate ambiguous infrastructure specifications?",
            situationTask: "Designing an edge agent with undefined concurrency limits.",
            actionTaken: "Prototyped DO sharding benchmarks and aligned platform engineers.",
            resultImpact: "Shipped on schedule supporting 10k concurrent sessions.",
          },
        ],
        systemDesignFocus: [
          "Durable Objects SQLite isolation",
          "Workers AI low-latency streaming",
          "Cloudflare Workflows state recovery",
        ],
      };

      const parsed = parseInterviewPrep(fullPrep);
      expect(parsed.jobTitle).toBe("Software Engineer – Edge Platform & DevEx");
      expect(parsed.company).toBe("Cloudflare");
      expect(parsed.technicalQuestions.length).toBe(1);
      expect(parsed.behavioralQuestions.length).toBe(1);
      expect(parsed.systemDesignFocus).toContain("Durable Objects SQLite isolation");
    });
  });

  describe("SQLite Persistence of interview_prep in applications table", () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(":memory:");
      initSqliteSchema((sql) => db.exec(sql));
    });

    it("inserts full interview_prep payload into applications table linked to a job", () => {
      // 1. Insert parent job
      const jobId = "job-cf-prep-1";
      db.prepare(
        "INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(jobId, "SE Platforms", "Cloudflare", "Edge Platform Role", Date.now());

      // 2. Insert interview prep payload
      const prepPayload: InterviewPrep = {
        jobTitle: "SE Platforms",
        company: "Cloudflare",
        technicalQuestions: [
          {
            question: "Explain SQLite WAL concurrency in Durable Objects.",
            focusArea: "Edge Storage",
            keyTalkingPoints: ["Zero network hop local queries", "Single-writer multi-reader WAL"],
          },
        ],
        behavioralQuestions: [
          {
            question: "How do you prioritize platform reliability vs rapid shipping?",
            situationTask: "Tight deadline on developer SDK release.",
            actionTaken: "Implemented canary deployment with automated rollback guards.",
            resultImpact: "100% zero-downtime launch across all regions.",
          },
        ],
        systemDesignFocus: ["Edge event loops", "RPC serialization"],
      };

      const appId = "app-prep-1";
      db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(appId, jobId, JSON.stringify({}), JSON.stringify(prepPayload), Date.now());

      // 3. Query and verify
      const row = db
        .prepare("SELECT * FROM applications WHERE id = ?")
        .get(appId) as unknown as ApplicationRow;

      expect(row).toBeDefined();
      expect(row.job_id).toBe(jobId);

      const parsedFromDb = JSON.parse(row.interview_prep) as InterviewPrep;
      expect(parsedFromDb.jobTitle).toBe("SE Platforms");
      expect(parsedFromDb.company).toBe("Cloudflare");
      expect(parsedFromDb.technicalQuestions[0].question).toBe(
        "Explain SQLite WAL concurrency in Durable Objects."
      );
      expect(parsedFromDb.behavioralQuestions[0].situationTask).toContain("Tight deadline");
      expect(parsedFromDb.systemDesignFocus).toContain("Edge event loops");
    });

    it("updates existing applications record with new interview_prep data", () => {
      const jobId = "job-cf-prep-2";
      db.prepare(
        "INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(jobId, "SE Platforms", "Cloudflare", "Edge Platform Role", Date.now());

      const appId = "app-prep-2";
      db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(appId, jobId, JSON.stringify({ bullets: ["Initial bullet"] }), JSON.stringify({}), Date.now());

      // Update with new interview prep
      const updatedPrep: InterviewPrep = {
        jobTitle: "SE Platforms (Updated)",
        company: "Cloudflare",
        technicalQuestions: [
          {
            question: "How does Cloudflare Workers isolate V8 contexts?",
            focusArea: "V8 Isolates Architecture",
            keyTalkingPoints: ["Process-free lightweight isolates", "Zero cold start memory sharing"],
          },
        ],
        behavioralQuestions: [
          {
            question: "Tell me about leading an edge migration.",
            situationTask: "Migrating legacy monolith auth to Workers.",
            actionTaken: "Architected token validation at edge using Workers KV and DO.",
            resultImpact: "Auth latency dropped from 120ms to 2ms.",
          },
        ],
        systemDesignFocus: ["Isolates security", "Edge key-value replication"],
      };

      db.prepare(
        "UPDATE applications SET interview_prep = ?, created_at = ? WHERE id = ?"
      ).run(JSON.stringify(updatedPrep), Date.now(), appId);

      const row = db
        .prepare("SELECT * FROM applications WHERE id = ?")
        .get(appId) as unknown as ApplicationRow;

      const parsed = JSON.parse(row.interview_prep) as InterviewPrep;
      expect(parsed.jobTitle).toBe("SE Platforms (Updated)");
      expect(parsed.technicalQuestions[0].focusArea).toBe("V8 Isolates Architecture");
      expect(parsed.behavioralQuestions[0].resultImpact).toContain("Auth latency dropped");

      // Verify tailored_resume was preserved
      const parsedResume = JSON.parse(row.tailored_resume);
      expect(parsedResume.bullets).toContain("Initial bullet");
    });

    it("preserves interview_prep when tailored_resume is subsequently upserted", () => {
      const jobId = "job-cf-prep-3";
      db.prepare(
        "INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(jobId, "SE Platforms", "Cloudflare", "Edge Platform Role", Date.now());

      const appId = "app-prep-3";
      const initialPrep: InterviewPrep = {
        jobTitle: "SE Platforms",
        company: "Cloudflare",
        technicalQuestions: [
          {
            question: "What is Durable Object SQLite?",
            focusArea: "DO Persistence",
            keyTalkingPoints: ["Transactional embedded SQLite", "Local storage at edge"],
          },
        ],
        behavioralQuestions: [
          {
            question: "Describe a complex outage debugging session.",
            situationTask: "Routing degradation in edge cluster.",
            actionTaken: "Used Cloudflare trace analytics and real-time logs.",
            resultImpact: "Restored service in 4 minutes.",
          },
        ],
        systemDesignFocus: ["Durable Objects SQLite replication"],
      };

      // 1. Initial interview prep created
      db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(appId, jobId, JSON.stringify({}), JSON.stringify(initialPrep), Date.now());

      // 2. Resume tailoring subsequently runs for the same job and updates tailored_resume
      const tailoredResumePayload = {
        jobTitle: "SE Platforms",
        company: "Cloudflare",
        focusAreas: ["Workers", "DO SQLite"],
        tailoredBullets: ["Built high throughput edge agent using Cloudflare Workers and DO SQLite."],
        executiveSummary: "Experienced systems engineer with deep edge computing expertise.",
      };

      db.prepare(
        "UPDATE applications SET tailored_resume = ?, created_at = ? WHERE id = ?"
      ).run(JSON.stringify(tailoredResumePayload), Date.now(), appId);

      const row = db
        .prepare("SELECT * FROM applications WHERE id = ?")
        .get(appId) as unknown as ApplicationRow;

      // Verify tailored resume is updated
      const parsedResume = JSON.parse(row.tailored_resume);
      expect(parsedResume.tailoredBullets[0]).toContain("Built high throughput edge agent");

      // Verify interview_prep was NOT overwritten
      const parsedPrep = JSON.parse(row.interview_prep) as InterviewPrep;
      expect(parsedPrep.technicalQuestions[0].question).toBe("What is Durable Object SQLite?");
      expect(parsedPrep.behavioralQuestions[0].actionTaken).toContain("Used Cloudflare trace analytics");
    });
  });
});
