# 02: AI Job Extraction & Agent Ingestion Tool

**What to build:** An AI-powered extraction module and an agent chat tool that takes unstructured job posting text (pasted directly in chat or provided via API) and extracts key requirements (skills, seniority, responsibilities, company, and title) into the structured domain model, saving it into SQLite.

**Blocked by:** 01: Job Domain Schema, SQLite Persistence & Invalidation Lifecycle

**Status:** ready-for-agent

- [ ] Lightweight AI extraction function to parse raw text into structured attributes (`title`, `company`, `location`, `requiredSkills`, `preferredSkills`, `responsibilities`, `experienceLevel`) with resilient fallback defaults when fields cannot be extracted.
- [ ] `ingestJobDescription` tool registered on `CareerAgent` allowing the AI chat assistant to accept job descriptions directly in conversation and persist them to SQLite.
- [ ] Output repair and validation for the `ingestJobDescription` tool schema to prevent agent crash on malformed LLM responses.
- [ ] Unit tests for parsing edge cases, tool schema validation, and tool execution error handling.

