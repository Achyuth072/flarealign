import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  initSqliteSchema,
  seedCandidateIfMissing,
  jobPostingToRow,
  rowToJobPosting,
  JobRow,
  CandidateRow,
} from "./schema";
import { DEFAULT_CANDIDATE_PROFILE } from "./candidate";
import { JobPosting } from "./job";

describe("SQLite Schema & Relational Integrity", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    initSqliteSchema((sql) => db.exec(sql));
  });

  describe("Candidates table schema constraints", () => {
    it("successfully inserts valid candidate record", () => {
      const stmt = db.prepare(
        "INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run("cand-1", "Test Candidate", JSON.stringify({ test: true }), Date.now());

      const row = db.prepare("SELECT * FROM candidates WHERE id = ?").get("cand-1") as unknown as CandidateRow;
      expect(row).toBeDefined();
      expect(row.name).toBe("Test Candidate");
    });

    it("enforces NOT NULL constraint on id, name, data, and updated_at", () => {
      const stmt = db.prepare(
        "INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)"
      );

      // Missing ID
      expect(() => stmt.run(null, "Name", "{}", Date.now())).toThrow();
      // Missing Name
      expect(() => stmt.run("cand-null-name", null, "{}", Date.now())).toThrow();
      // Missing Data
      expect(() => stmt.run("cand-null-data", "Name", null, Date.now())).toThrow();
      // Missing Updated_at
      expect(() => stmt.run("cand-null-time", "Name", "{}", null)).toThrow();
    });

    it("enforces PRIMARY KEY uniqueness on id", () => {
      const stmt = db.prepare(
        "INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run("cand-unique", "Candidate 1", "{}", Date.now());
      expect(() => stmt.run("cand-unique", "Candidate 2", "{}", Date.now())).toThrow();
    });
  });

  describe("Jobs table schema constraints", () => {
    it("successfully inserts valid structured job record", () => {
      const stmt = db.prepare(
        `INSERT INTO jobs (
          id, title, company, location, required_skills, preferred_skills,
          responsibilities, experience_level, raw_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run(
        "job-1",
        "Staff Edge Systems Engineer",
        "Cloudflare",
        "San Francisco, CA",
        JSON.stringify(["TypeScript", "Cloudflare Workers", "Durable Objects"]),
        JSON.stringify(["Rust", "Wasm"]),
        JSON.stringify(["Design distributed runtime", "Optimize P99 latency"]),
        "Staff (8+ years)",
        "Raw JD Text here...",
        Date.now(),
        Date.now()
      );

      const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get("job-1") as unknown as JobRow;
      expect(row).toBeDefined();
      expect(row.title).toBe("Staff Edge Systems Engineer");
      expect(row.company).toBe("Cloudflare");
      expect(row.location).toBe("San Francisco, CA");
      expect(JSON.parse(row.required_skills)).toHaveLength(3);
      expect(JSON.parse(row.preferred_skills)).toHaveLength(2);
      expect(JSON.parse(row.responsibilities)).toHaveLength(2);
      expect(row.experience_level).toBe("Staff (8+ years)");
      expect(row.raw_description).toBe("Raw JD Text here...");
    });

    it("enforces NOT NULL constraint on all structured columns in jobs table", () => {
      const stmt = db.prepare(
        `INSERT INTO jobs (
          id, title, company, location, required_skills, preferred_skills,
          responsibilities, experience_level, raw_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const now = Date.now();
      expect(() => stmt.run(null, "Title", "Company", "Loc", "[]", "[]", "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-title", null, "Company", "Loc", "[]", "[]", "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-comp", "Title", null, "Loc", "[]", "[]", "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-loc", "Title", "Company", null, "[]", "[]", "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-req", "Title", "Company", "Loc", null, "[]", "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-pref", "Title", "Company", "Loc", "[]", null, "[]", "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-resp", "Title", "Company", "Loc", "[]", "[]", null, "Level", "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-exp", "Title", "Company", "Loc", "[]", "[]", "[]", null, "Desc", now, now)).toThrow();
      expect(() => stmt.run("j-null-desc", "Title", "Company", "Loc", "[]", "[]", "[]", "Level", null, now, now)).toThrow();
      expect(() => stmt.run("j-null-created", "Title", "Company", "Loc", "[]", "[]", "[]", "Level", "Desc", null, now)).toThrow();
      expect(() => stmt.run("j-null-updated", "Title", "Company", "Loc", "[]", "[]", "[]", "Level", "Desc", now, null)).toThrow();
    });

    it("enforces PRIMARY KEY uniqueness on job id", () => {
      const stmt = db.prepare(
        `INSERT INTO jobs (
          id, title, company, location, required_skills, preferred_skills,
          responsibilities, experience_level, raw_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const now = Date.now();
      stmt.run("job-dup", "Title 1", "Company 1", "Remote", "[]", "[]", "[]", "Mid", "D1", now, now);
      expect(() =>
        stmt.run("job-dup", "Title 2", "Company 2", "Remote", "[]", "[]", "[]", "Mid", "D2", now, now)
      ).toThrow();
    });
  });

  describe("JobPosting row conversion helpers", () => {
    it("converts JobPosting to JobRow and back with high fidelity", () => {
      const originalJob: JobPosting = {
        id: "job-conv-1",
        title: "Developer Advocate – AI & Workers",
        company: "Cloudflare",
        location: "London, UK / Hybrid",
        requiredSkills: ["TypeScript", "LLM APIs", "Public Speaking"],
        preferredSkills: ["Workers AI", "Vectorize"],
        responsibilities: ["Create high-impact tutorials", "Speak at developer summits"],
        experienceLevel: "Senior",
        rawDescription: "Join the Cloudflare DevEx team to empower global developers.",
        createdAt: 1700000000000,
        updatedAt: 1700000050000,
      };

      const row = jobPostingToRow(originalJob);
      expect(row.id).toBe("job-conv-1");
      expect(row.required_skills).toBe(JSON.stringify(originalJob.requiredSkills));
      expect(row.preferred_skills).toBe(JSON.stringify(originalJob.preferredSkills));
      expect(row.responsibilities).toBe(JSON.stringify(originalJob.responsibilities));

      const convertedBack = rowToJobPosting(row);
      expect(convertedBack).toEqual(originalJob);
    });

    it("handles legacy/partial row formats gracefully in rowToJobPosting", () => {
      const partialRow = {
        id: "job-legacy-1",
        title: "Legacy Role",
        company: "Old Corp",
        description: "Legacy plain description text",
        created_at: 1680000000000,
      };

      const parsed = rowToJobPosting(partialRow);
      expect(parsed.id).toBe("job-legacy-1");
      expect(parsed.title).toBe("Legacy Role");
      expect(parsed.company).toBe("Old Corp");
      expect(parsed.rawDescription).toBe("Legacy plain description text");
      expect(parsed.location).toBe("Remote");
      expect(parsed.requiredSkills).toEqual([]);
      expect(parsed.preferredSkills).toEqual([]);
      expect(parsed.responsibilities).toEqual([]);
      expect(parsed.experienceLevel).toBe("Mid-Senior Level");
    });
  });

  describe("Fit scores table constraints and foreign key integrity", () => {
    const insertJob = (id: string) => {
      const now = Date.now();
      db.prepare(
        `INSERT INTO jobs (
          id, title, company, location, required_skills, preferred_skills,
          responsibilities, experience_level, raw_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, "SE Platforms", "Cloudflare", "Remote", "[]", "[]", "[]", "Senior", "Desc", now, now);
    };

    it("successfully inserts fit_scores linked to an existing job", () => {
      insertJob("job-fit-1");

      const stmt = db.prepare(
        "INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      stmt.run("score-1", "job-fit-1", 95, "Strong Fit", "{}", Date.now());

      const row = db.prepare("SELECT * FROM fit_scores WHERE id = ?").get("score-1") as any;
      expect(row).toBeDefined();
      expect(row.score).toBe(95);
      expect(row.job_id).toBe("job-fit-1");
    });

    it("enforces NOT NULL constraints on all fit_scores columns", () => {
      insertJob("job-fit-2");

      const stmt = db.prepare(
        "INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );

      expect(() => stmt.run(null, "job-fit-2", 90, "Strong Fit", "{}", Date.now())).toThrow();
      expect(() => stmt.run("score-null-job", null, 90, "Strong Fit", "{}", Date.now())).toThrow();
      expect(() => stmt.run("score-null-score", "job-fit-2", null, "Strong Fit", "{}", Date.now())).toThrow();
      expect(() => stmt.run("score-null-rec", "job-fit-2", 90, null, "{}", Date.now())).toThrow();
      expect(() => stmt.run("score-null-bd", "job-fit-2", 90, "Strong Fit", null, Date.now())).toThrow();
      expect(() => stmt.run("score-null-time", "job-fit-2", 90, "Strong Fit", "{}", null)).toThrow();
    });

    it("enforces FOREIGN KEY constraint: inserting fit_score for nonexistent job_id fails", () => {
      const stmt = db.prepare(
        "INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      expect(() => stmt.run("score-orphan", "job-nonexistent", 80, "Potential Fit", "{}", Date.now())).toThrow(/FOREIGN KEY constraint failed/i);
    });

    it("cascades deletion when parent job is deleted", () => {
      insertJob("job-cascade-1");

      db.prepare("INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run("score-cascade-1", "job-cascade-1", 88, "Strong Fit", "{}", Date.now());

      // Delete parent job
      db.prepare("DELETE FROM jobs WHERE id = ?").run("job-cascade-1");

      const row = db.prepare("SELECT * FROM fit_scores WHERE id = ?").get("score-cascade-1");
      expect(row).toBeUndefined();
    });
  });

  describe("Applications table constraints and foreign key integrity", () => {
    const insertJob = (id: string) => {
      const now = Date.now();
      db.prepare(
        `INSERT INTO jobs (
          id, title, company, location, required_skills, preferred_skills,
          responsibilities, experience_level, raw_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, "SE Platforms", "Cloudflare", "Remote", "[]", "[]", "[]", "Senior", "Desc", now, now);
    };

    it("successfully inserts application linked to an existing job", () => {
      insertJob("job-app-1");

      const stmt = db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run("app-1", "job-app-1", JSON.stringify({ bullets: [] }), JSON.stringify({ questions: [] }), Date.now());

      const row = db.prepare("SELECT * FROM applications WHERE id = ?").get("app-1") as any;
      expect(row).toBeDefined();
      expect(row.job_id).toBe("job-app-1");
    });

    it("enforces NOT NULL constraints on all applications columns", () => {
      insertJob("job-app-2");

      const stmt = db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      );

      expect(() => stmt.run(null, "job-app-2", "{}", "{}", Date.now())).toThrow();
      expect(() => stmt.run("app-null-job", null, "{}", "{}", Date.now())).toThrow();
      expect(() => stmt.run("app-null-res", "job-app-2", null, "{}", Date.now())).toThrow();
      expect(() => stmt.run("app-null-prep", "job-app-2", "{}", null, Date.now())).toThrow();
      expect(() => stmt.run("app-null-time", "job-app-2", "{}", "{}", null)).toThrow();
    });

    it("enforces FOREIGN KEY constraint: inserting application for nonexistent job_id fails", () => {
      const stmt = db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      );
      expect(() => stmt.run("app-orphan", "job-nonexistent", "{}", "{}", Date.now())).toThrow(/FOREIGN KEY constraint failed/i);
    });

    it("cascades deletion when parent job is deleted", () => {
      insertJob("job-cascade-2");

      db.prepare("INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("app-cascade-1", "job-cascade-2", "{}", "{}", Date.now());

      db.prepare("DELETE FROM jobs WHERE id = ?").run("job-cascade-2");

      const row = db.prepare("SELECT * FROM applications WHERE id = ?").get("app-cascade-1");
      expect(row).toBeUndefined();
    });

    it("resets stale fit_scores and applications when replacing or updating a target job", () => {
      // 1. User had an initial job with evaluation records
      insertJob("job-old");
      db.prepare(
        "INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run("score-old", "job-old", 75, "Moderate Fit", "{}", Date.now());
      db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run("app-old", "job-old", JSON.stringify({ bullets: ["Old bullet"] }), JSON.stringify({ questions: ["Old Q"] }), Date.now());

      expect(db.prepare("SELECT count(*) as count FROM fit_scores").get()).toEqual({ count: 1 });
      expect(db.prepare("SELECT count(*) as count FROM applications").get()).toEqual({ count: 1 });

      // 2. Clear stale records as part of job replacement lifecycle
      db.prepare("DELETE FROM fit_scores").run();
      db.prepare("DELETE FROM applications").run();
      insertJob("job-new");

      // Verify old evaluations were wiped
      expect(db.prepare("SELECT count(*) as count FROM fit_scores").get()).toEqual({ count: 0 });
      expect(db.prepare("SELECT count(*) as count FROM applications").get()).toEqual({ count: 0 });

      // 3. New evaluations can now be recorded cleanly for new job
      db.prepare(
        "INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run("score-new", "job-new", 95, "Strong Fit", "{}", Date.now());

      const fitRow = db.prepare("SELECT * FROM fit_scores WHERE job_id = ?").get("job-new") as any;
      expect(fitRow).toBeDefined();
      expect(fitRow.score).toBe(95);
    });
  });

  describe("Candidate seeding idempotency", () => {
    it("seeds default candidate on initial start", () => {
      const seeded = seedCandidateIfMissing(
        (id) => {
          const row = db.prepare("SELECT id FROM candidates WHERE id = ?").get(id);
          return !!row;
        },
        (row) => {
          db.prepare("INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)").run(
            row.id,
            row.name,
            row.data,
            row.updated_at
          );
        }
      );

      expect(seeded).toBe(true);

      const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(DEFAULT_CANDIDATE_PROFILE.id) as unknown as CandidateRow;
      expect(candidate).toBeDefined();
      expect(candidate.name).toBe(DEFAULT_CANDIDATE_PROFILE.name);
    });

    it("does not overwrite modified candidate profile on subsequent agent starts", () => {
      // 1. Initial seed
      seedCandidateIfMissing(
        (id) => !!db.prepare("SELECT id FROM candidates WHERE id = ?").get(id),
        (row) => {
          db.prepare("INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)").run(
            row.id,
            row.name,
            row.data,
            row.updated_at
          );
        }
      );

      // 2. User updates profile
      const updatedProfile = {
        ...DEFAULT_CANDIDATE_PROFILE,
        name: "John Doe (Updated Staff Profile)",
        targetRole: "Staff Systems Engineer – Cloudflare Edge",
      };
      const customUpdatedAt = 999999999;
      db.prepare("UPDATE candidates SET name = ?, data = ?, updated_at = ? WHERE id = ?").run(
        updatedProfile.name,
        JSON.stringify(updatedProfile),
        customUpdatedAt,
        DEFAULT_CANDIDATE_PROFILE.id
      );

      // 3. Subsequent agent start runs seedCandidateIfMissing again
      const secondSeedResult = seedCandidateIfMissing(
        (id) => !!db.prepare("SELECT id FROM candidates WHERE id = ?").get(id),
        (row) => {
          db.prepare("INSERT INTO candidates (id, name, data, updated_at) VALUES (?, ?, ?, ?)").run(
            row.id,
            row.name,
            row.data,
            row.updated_at
          );
        }
      );

      expect(secondSeedResult).toBe(false);

      // Verify custom values are preserved
      const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(DEFAULT_CANDIDATE_PROFILE.id) as unknown as CandidateRow;
      expect(candidate).toBeDefined();
      expect(candidate.name).toBe("John Doe (Updated Staff Profile)");
      expect(candidate.updated_at).toBe(customUpdatedAt);
      const parsedData = JSON.parse(candidate.data);
      expect(parsedData.targetRole).toBe("Staff Systems Engineer – Cloudflare Edge");
    });
  });
});
