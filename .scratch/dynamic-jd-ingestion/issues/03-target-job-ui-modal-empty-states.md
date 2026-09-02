# 03: Target Job Header Widget, Ingestion Modal & Empty States UI

**What to build:** The user interface components for managing target job postings, including a top header widget showing the active role, an "Ingest / Edit Target Job" modal with raw paste and manual field editing, and explicit in-tab empty states when no job is currently ingested.

**Blocked by:** 01: Job Domain Schema, SQLite Persistence & Invalidation Lifecycle, 02: AI Job Extraction & Agent Ingestion Tool

**Status:** ready-for-human

- [x] Top header Target Job badge displaying `[Job Title] @ [Company]` (or "No Target Job Set") with an "Ingest / Edit Target Job" button.
- [x] `EditJobModal` component supporting two input workflows: (1) quick-pasting raw job posting text with an "Auto-Extract" button, and (2) manual field editing for Title, Company, Location, Required Skills, and Description.
- [x] Contextual empty-state placeholders on Fit Score, Interview Prep, and Tailor Resume tabs when no job is set, featuring a direct "Ingest Job Posting" action button.
- [x] Client session state updates to seamlessly fetch, store, and refresh the active job alongside candidate profile data on load and on save.


