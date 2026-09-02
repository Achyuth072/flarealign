# 04: End-to-End Interview Prep Tooling

**What to build:**
A full vertical tracer bullet for interview preparation across prompt definitions, agent tools, Durable Object SQLite persistence, and UI streaming chat interactions. Candidates can ask for STAR interview preparation, triggering the agent's `generateInterviewPrep` tool, saving the structured STAR questions and technical focus areas to the database, and displaying the results cleanly in the client UI.

**Blocked by:** 01: Fix Scoring Heuristics and Boundary Tests, 02: Harden SQLite Schema and Persistence

**Status:** resolved

## Acceptance criteria

- [x] `src/lib/prompts.ts` system prompt defines tool #3 `generateInterviewPrep` with description and expected parameters matching `CareerAgent`
- [x] `CareerAgent` provides `generateInterviewPrep` tool with Zod schema defining `jobTitle`, `company`, `technicalQuestions`, `behavioralQuestions` (with `situationTask`, `actionTaken`, `resultImpact`), and `systemDesignFocus`
- [x] Tool execution updates or inserts the full JSON payload into the `applications.interview_prep` column in SQLite
- [x] Frontend UI provides an instant action / prompt for generating STAR interview prep and renders structured STAR responses cleanly
- [x] `npm test` and `npm run build` pass without type or runtime errors

## Comments

Implemented end-to-end vertical tracer bullet for STAR interview preparation tooling:
1. Created `src/lib/interview.ts` exporting strict Zod schemas (`TechnicalQuestionSchema`, `BehavioralQuestionSchema` with STAR fields, `InterviewPrepSchema`) and type definitions.
2. Updated `src/lib/prompts.ts` system prompt with explicit tool #3 definition and parameter signatures matching `CareerAgent`.
3. Integrated `InterviewPrepSchema` into `CareerAgent.generateInterviewPrep` tool with SQLite upsert persistence into `applications.interview_prep`.
4. Enhanced React frontend (`src/client/App.tsx`) with dedicated `InterviewPrepResultView` component rendering labeled STAR blocks (Situation & Task, Action Taken, Result & Impact), technical questions, and system design topics, alongside empty-state instant action trigger.
5. Added comprehensive test suite in `src/lib/interview.test.ts` (schema validation, strict STAR constraints, SQLite roundtrip persistence) and prompt assertions in `src/lib/candidate.test.ts`. All 44 tests and `npm run build` pass cleanly.


