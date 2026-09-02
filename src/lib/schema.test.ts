import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  initSqliteSchema,
  seedCandidateIfMissing,
  CREATE_CANDIDATES_TABLE,
  CREATE_JOBS_TABLE,
  CREATE_FIT_SCORES_TABLE,
  CREATE_APPLICATIONS_TABLE,
  CandidateRow,
} from "./schema";
import { DEFAULT_CANDIDATE_PROFILE } from "./candidate";

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
    it("successfully inserts valid job record", () => {
      const stmt = db.prepare(
        "INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run("job-1", "SE Platforms", "Cloudflare", "Work on Workers", Date.now());

      const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get("job-1") as any;
      expect(row).toBeDefined();
      expect(row.title).toBe("SE Platforms");
      expect(row.company).toBe("Cloudflare");
    });

    it("enforces NOT NULL constraint on id, title, company, description, and created_at", () => {
      const stmt = db.prepare(
        "INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)"
      );

      expect(() => stmt.run(null, "Title", "Company", "Desc", Date.now())).toThrow();
      expect(() => stmt.run("job-null-title", null, "Company", "Desc", Date.now())).toThrow();
      expect(() => stmt.run("job-null-comp", "Title", null, "Desc", Date.now())).toThrow();
      expect(() => stmt.run("job-null-desc", "Title", "Company", null, Date.now())).toThrow();
      expect(() => stmt.run("job-null-time", "Title", "Company", "Desc", null)).toThrow();
    });
  });

  describe("Fit scores table constraints and foreign key integrity", () => {
    it("successfully inserts fit_scores linked to an existing job", () => {
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-fit-1", "SE Platforms", "Cloudflare", "Desc", Date.now());

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
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-fit-2", "Title", "Company", "Desc", Date.now());

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
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-cascade-1", "Title", "Company", "Desc", Date.now());

      db.prepare("INSERT INTO fit_scores (id, job_id, score, recommendation, breakdown, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run("score-cascade-1", "job-cascade-1", 88, "Strong Fit", "{}", Date.now());

      // Delete parent job
      db.prepare("DELETE FROM jobs WHERE id = ?").run("job-cascade-1");

      const row = db.prepare("SELECT * FROM fit_scores WHERE id = ?").get("score-cascade-1");
      expect(row).toBeUndefined();
    });
  });

  describe("Applications table constraints and foreign key integrity", () => {
    it("successfully inserts application linked to an existing job", () => {
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-app-1", "SE Platforms", "Cloudflare", "Desc", Date.now());

      const stmt = db.prepare(
        "INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run("app-1", "job-app-1", JSON.stringify({ bullets: [] }), JSON.stringify({ questions: [] }), Date.now());

      const row = db.prepare("SELECT * FROM applications WHERE id = ?").get("app-1") as any;
      expect(row).toBeDefined();
      expect(row.job_id).toBe("job-app-1");
    });

    it("enforces NOT NULL constraints on all applications columns", () => {
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-app-2", "Title", "Company", "Desc", Date.now());

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
      db.prepare("INSERT INTO jobs (id, title, company, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("job-cascade-2", "Title", "Company", "Desc", Date.now());

      db.prepare("INSERT INTO applications (id, job_id, tailored_resume, interview_prep, created_at) VALUES (?, ?, ?, ?, ?)")
        .run("app-cascade-1", "job-cascade-2", "{}", "{}", Date.now());

      db.prepare("DELETE FROM jobs WHERE id = ?").run("job-cascade-2");

      const row = db.prepare("SELECT * FROM applications WHERE id = ?").get("app-cascade-1");
      expect(row).toBeUndefined();
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
        name: "Achyuth (Updated Staff Profile)",
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
      expect(candidate.name).toBe("Achyuth (Updated Staff Profile)");
      expect(candidate.updated_at).toBe(customUpdatedAt);
      const parsedData = JSON.parse(candidate.data);
      expect(parsedData.targetRole).toBe("Staff Systems Engineer – Cloudflare Edge");
    });
  });
});
