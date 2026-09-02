# 04: Downstream Alignment for Fit Scoring, Interview Prep, Workflow & Prompts

**What to build:** Fully bind all evaluation engines, background workflows, agent system prompts, and UI quick suggestions to the dynamic target job, eliminating every hardcoded Cloudflare role reference.

**Blocked by:** 01: Job Domain Schema, SQLite Persistence & Invalidation Lifecycle, 02: AI Job Extraction & Agent Ingestion Tool, 03: Target Job Header Widget, Ingestion Modal & Empty States UI

**Status:** ready-for-agent

- [x] Update `scoreJobFit` tool and scoring heuristics to evaluate candidate skills, experience, and domain alignment against the active `JobPosting` data.
- [x] Update `generateInterviewPrep` to dynamically generate STAR and technical questions matching the active job's requirements and company context.
- [x] Update `TailoringWorkflow` and `tailorResume` to craft targeted summaries and impact bullets for the dynamic job.
- [x] Parameterize the agent's system prompt and quick-prompt suggestion chips in `App.tsx` and `prompts.ts` with the active target job's metadata.
- [x] Remove all hardcoded Cloudflare role fallback strings across tests, client components, and server endpoints.
- [x] End-to-end unit and integration test verification across scoring, workflow, and agent tool execution.

