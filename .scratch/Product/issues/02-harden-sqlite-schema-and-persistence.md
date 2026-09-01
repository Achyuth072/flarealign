# 02: Harden SQLite Schema and Persistence

**What to build:**
Strict schema constraints and relational integrity in the `CareerAgent` Durable Object SQLite database. Ensure tables have `NOT NULL` constraints on required fields, foreign key relationships linking child records (`fit_scores`, `applications`) to parent `jobs`, and safe initialization/seeding behavior.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance criteria

- [ ] `candidates` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `name`, `data`, and `updated_at`
- [ ] `jobs` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `title`, `company`, `description`, and `created_at`
- [ ] `fit_scores` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `job_id`, `score`, `recommendation`, `breakdown`, `created_at`
- [ ] `applications` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `job_id`, `tailored_resume`, `interview_prep`, `created_at`
- [ ] Foreign keys or relational references link `fit_scores.job_id` and `applications.job_id` to `jobs.id`
- [ ] Seeding `candidates` table is idempotent and does not overwrite updated candidate profiles on subsequent agent starts
- [ ] TypeScript build and types pass cleanly with no SQLite schema regressions

