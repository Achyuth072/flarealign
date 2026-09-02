Status: ready-for-agent

# Spec: Dynamic Job Description (JD) Ingestion & Evaluation

## Problem Statement

Currently, the application evaluates candidates exclusively against a single, hardcoded "Cloudflare Software Engineer – Edge Platform & DevEx" role. Candidates wishing to analyze their fit, generate tailored resumes, or prepare STAR interview responses for any other job posting, company, or seniority level cannot do so. Statically tying the agent and backend to one specific Cloudflare role limits usability, prevents multi-company application tailoring, and causes confusion when users want to evaluate custom job postings.

## Solution

Replace all hardcoded Cloudflare role defaults with a dynamic Job Description ingestion and evaluation system:
1. **Dynamic JD Management**: Provide an interactive "Ingest / Edit Target Job" modal in the UI and an `ingestJobDescription` tool for the AI chat agent to extract and save job postings into persistent SQLite storage.
2. **AI Job Parser & Structuring**: Parse unstructured job postings into structured domain models (title, company, location, required skills, preferred skills, key responsibilities, experience requirements) while preserving full raw text.
3. **Session Lifecycle & Invalidation**: Maintain a single active target job per user session in Durable Object SQLite. When a new JD is saved or updated, clear stale fit scores, interview questions, and tailored resumes to ensure all evaluations strictly match the active target job.
4. **Empty State Guidance**: If no target job is ingested, present clear, contextual call-to-action cards across Fit Score, Interview Prep, and Resume Tailoring views guiding the user to ingest a job posting.
5. **Unified Downstream Alignment**: Bind fit scoring, STAR interview prep generators, resume tailoring workflows, agent system prompts, and quick-prompt suggestion chips dynamically to the active target job's title, company, and extracted requirements.

---

## User Stories

1. As a job seeker, I want to paste any raw job posting text into an ingestion modal, so that I can immediately evaluate my fit for that specific position.
2. As a job seeker, I want to manually enter or edit the job title, company name, location, and requirement notes, so that I can correct or customize job details before running evaluations.
3. As a job seeker, I want the AI chat agent to ingest and parse a job description directly when I paste it into the chat sidebar, so that I don't have to switch views or fill out manual forms.
4. As a job seeker, I want the system to automatically extract required skills, preferred skills, and core responsibilities from unstructured job descriptions, so that the fit scoring accurately reflects specific criteria.
5. As a job seeker, I want to see the active target job title and company displayed clearly in the top header, so that I always know which role my current evaluations and prep materials belong to.
6. As a job seeker, I want to view an empty-state prompt when no job description has been ingested yet, so that I understand why evaluations are empty and know the exact next step to take.
7. As a job seeker, I want existing fit scores, interview questions, and tailored resume bullets to reset whenever I ingest a new job description, so that I never see stale recommendations for an unrelated company or role.
8. As a job seeker, I want the fit score breakdown (Skills, Experience, Domain, Trajectory) to dynamically evaluate against the active target job's requirements, so that I get a realistic evaluation of my strengths and gaps for that role.
9. As a job seeker, I want the interview prep module to generate targeted technical and behavioral STAR questions specific to the active job's tech stack and company culture, so that I can prepare effectively for interviews.
10. As a job seeker, I want the resume tailoring module and background workflow to craft executive summaries and impact bullets aligned with the active job posting, so that my application highlights the most relevant qualifications.
11. As a job seeker, I want the AI chat suggestions and prompt pills to adapt dynamically to the active target job's title and company, so that quick-action buttons are relevant to my current application.
12. As a job seeker, I want my ingested job description to persist across page refreshes within my session, so that I do not lose my target job data when reloading the application.

---

## Implementation Decisions

### Domain & Data Model
- **Job Posting Schema**: Define a validated schema for target job postings comprising:
  - `id`: Unique identifier
  - `title`: Target role title
  - `company`: Target organization name
  - `location`: Office location or Remote status
  - `requiredSkills`: Array of required technical and domain skills
  - `preferredSkills`: Array of nice-to-have skills
  - `responsibilities`: Array of core job duties
  - `experienceLevel`: Expected years of experience / seniority tier
  - `rawDescription`: The complete original job posting text
  - `updatedAt`: Timestamp of last modification
- **Session State**: Store the active job in the Durable Object SQLite database. The database enforces foreign-key relationships to fit scores and applications, ensuring cascading deletes or resets when a job is replaced.

### Ingestion & AI Parsing Seam
- **Parser Engine**: Implement a parser that accepts raw text or partial fields, uses LLM extraction to derive structured requirements (skills, experience, responsibilities), and validates the output against the domain schema before persisting.
- **Agent Chat Ingestion Tool**: Register an agent tool allowing the chat model to recognize job postings pasted in dialogue, trigger extraction, persist the job into session storage, and report the extracted summary back to the user.
- **REST Endpoints**: Expose HTTP endpoints on the Worker router to get the active target job and save/update a target job for the current session.

### UI & UX Integration
- **Header Badge & Modal**: Add a "Target Job" widget to the top header showing the active `[Role] @ [Company]` and an "Ingest / Edit Target Job" trigger button.
- **Job Ingestion Modal**: Provide a modal with tabbed or unified input (Paste Raw Posting with one-click parse + manual field overrides for Title, Company, Location, Skills, and Description).
- **In-Tab Empty States**: On Fit Score, Interview Prep, and Resume Tailoring tabs, show empty state placeholders with an "Ingest Job Posting" action when no active job is found in state.
- **Dynamic Quick Prompts**: Replace hardcoded Cloudflare prompts with dynamic template strings referencing active target job metadata (or generic prompts when no job is set).

### Downstream Alignment
- **Fit Scoring**: Remove hardcoded Cloudflare evaluation criteria and compute skill matches, domain alignment, experience level, and trajectory directly against the active job's requirements.
- **Interview Prep**: Parameterize question generation by the active job title, company name, and required technical proficiencies.
- **Tailoring Workflow**: Update the async workflow entrypoint to load the active job description and candidate profile dynamically.
- **Agent System Prompt**: Parameterize the agent's system prompt to assist the candidate with evaluating their active target job rather than defaulting to Cloudflare.

---

## Testing Decisions

### Seam Strategy
- **Highest Seam**: Test behavior at the domain module boundaries and API / Tool integration seams rather than mocking internal helper functions.
- **Parser & Schema Tests**: Verify that structured job payloads and unstructured text parse reliably into valid job posting models, handling missing fields, empty strings, and malformed inputs with graceful fallbacks.
- **SQLite Repository & Cascading Reset Tests**: Verify that saving a new target job replaces the active job in SQLite and cleanly resets prior fit scores and applications.
- **Agent Tool Schema & Execution Tests**: Verify that the `ingestJobDescription` tool schema passes validation and handles LLM output repairs gracefully.
- **Proportional Scoring & Workflow Tests**: Verify that fit scoring and tailoring workflows compute accurate composite scores and bullets against arbitrary role descriptions without regression.

### Prior Art
- Existing test suites in the codebase establish patterns for schema validation, scoring calculations, tool repair, and Durable Object SQLite mocking.

---

## Out of Scope

- Multi-job simultaneous tracking or Kanban board comparison across dozens of jobs in a single session (scoped to single active target job per session).
- Direct browser extension scraping from external job board URLs (focus is on text paste / manual ingestion).
- External ATS export integrations (e.g. Greenhouse/Workday automated submitting).

---

## Further Notes

- The seeded candidate profile remains available as the default candidate, but the target job becomes fully dynamic and user-configurable.
- If a user wishes to evaluate the Cloudflare Software Engineer role, they can paste that job posting into the ingestion modal or chat.

