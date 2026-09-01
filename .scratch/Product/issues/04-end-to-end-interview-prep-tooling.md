# 04: End-to-End Interview Prep Tooling

**What to build:**
A full vertical tracer bullet for interview preparation across prompt definitions, agent tools, Durable Object SQLite persistence, and UI streaming chat interactions. Candidates can ask for STAR interview preparation, triggering the agent's `generateInterviewPrep` tool, saving the structured STAR questions and technical focus areas to the database, and displaying the results cleanly in the client UI.

**Blocked by:** 01: Fix Scoring Heuristics and Boundary Tests, 02: Harden SQLite Schema and Persistence

**Status:** ready-for-agent

## Acceptance criteria

- [ ] `src/lib/prompts.ts` system prompt defines tool #3 `generateInterviewPrep` with description and expected parameters matching `CareerAgent`
- [ ] `CareerAgent` provides `generateInterviewPrep` tool with Zod schema defining `jobTitle`, `company`, `technicalQuestions`, `behavioralQuestions` (with `situationTask`, `actionTaken`, `resultImpact`), and `systemDesignFocus`
- [ ] Tool execution updates or inserts the full JSON payload into the `applications.interview_prep` column in SQLite
- [ ] Frontend UI provides an instant action / prompt for generating STAR interview prep and renders structured STAR responses cleanly
- [ ] `npm test` and `npm run build` pass without type or runtime errors

