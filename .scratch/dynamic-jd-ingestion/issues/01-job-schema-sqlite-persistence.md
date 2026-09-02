# 01: Job Domain Schema, SQLite Persistence & Invalidation Lifecycle

**What to build:** Store and retrieve active target job descriptions in Durable Object SQLite with validation and lifecycle management. When a user updates or replaces their target job posting, the backend automatically clears any previously generated fit scores, interview prep responses, and tailored resumes associated with the prior job to prevent stale recommendations.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Validated domain schema and types for `JobPosting` with title, company, location, requiredSkills, preferredSkills, responsibilities, experienceLevel, rawDescription, and timestamps.
- [ ] SQLite `jobs` table migration/updates to store structured job postings with `NOT NULL` constraints.
- [ ] `GET /api/job` and `POST /api/job` endpoints on the Worker router to fetch and update the session's active target job.
- [ ] Saving a new target job cascades or explicitly resets stale records in `fit_scores` and `applications`.
- [ ] Unit tests for schema validation, SQLite mutations, and cascading reset behavior.

