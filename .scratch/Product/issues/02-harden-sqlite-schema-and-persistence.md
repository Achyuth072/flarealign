# 02: Harden SQLite Schema and Persistence

**What to build:**
Strict schema constraints and relational integrity in the `CareerAgent` Durable Object SQLite database. Ensure tables have `NOT NULL` constraints on required fields, foreign key relationships linking child records (`fit_scores`, `applications`) to parent `jobs`, and safe initialization/seeding behavior.

Type: task

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance criteria

- [x] `candidates` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `name`, `data`, and `updated_at`
- [x] `jobs` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `title`, `company`, `description`, and `created_at`
- [x] `fit_scores` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `job_id`, `score`, `recommendation`, `breakdown`, `created_at`
- [x] `applications` table enforces `PRIMARY KEY NOT NULL` on `id`, `NOT NULL` on `job_id`, `tailored_resume`, `interview_prep`, `created_at`
- [x] Foreign keys or relational references link `fit_scores.job_id` and `applications.job_id` to `jobs.id`
- [x] Seeding `candidates` table is idempotent and does not overwrite updated candidate profiles on subsequent agent starts
- [x] TypeScript build and types pass cleanly with no SQLite schema regressions

## Comments

Implemented hardened SQLite DDL statements, enforced foreign key integrity (`fit_scores` and `applications` referencing `jobs` with cascading deletes), safe idempotent candidate profile seeding, parent job resolution in tools, and added 15 new unit tests in `src/lib/schema.test.ts`. All 26 tests and TypeScript typechecks pass cleanly.

