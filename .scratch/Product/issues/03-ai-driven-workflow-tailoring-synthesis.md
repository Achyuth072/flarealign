# 03: AI-Driven Workflow Tailoring Synthesis

**What to build:**
Upgrade the Cloudflare Workflow `TailoringWorkflow` to leverage the Cloudflare Workers AI binding (`@cf/meta/llama-3.3-70b-instruct`) in the `generate-tailoring-synthesis` step. Replace hardcoded mock strings with dynamic, LLM-generated resume bullet points and STAR-focused interview tips personalized to the job description and candidate context.

Type: task

**Blocked by:** 01: Fix Scoring Heuristics and Boundary Tests

**Status:** resolved

## Acceptance criteria

- [x] `TailoringWorkflow` accesses `this.env.AI` using the `@cf/meta/llama-3.3-70b-instruct` model (or structured prompt completion) inside the `generate-tailoring-synthesis` step
- [x] Workflow prompt combines candidate skills, target role, normalized job description, and computed sub-dimension scores
- [x] Returns structured `tailoredBullets` (3+ impact-driven bullets emphasizing Cloudflare primitives where relevant) and `interviewTips` (3+ concrete STAR / systems design talking points)
- [x] Graceful fallback handling if AI inference encounters an issue, ensuring workflow execution reliably succeeds
- [x] Workflow passes build verification (`npm run build`) and correctly returns `TailoringWorkflowResult` format

## Comments

Upgraded `TailoringWorkflow` to integrate Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct`) in the `generate-tailoring-synthesis` step. Added structured prompt builder (`buildSynthesisPrompt`), resilient response parser (`parseSynthesisResponse`), and deterministic fallback generator (`getFallbackSynthesis`). Added unit tests in `src/workflows/tailoring-workflow.test.ts` verifying prompt assembly, JSON & codeblock parsing, AI mock execution, and graceful fallback behavior. All 38 tests and full production build (`npm run build`) pass cleanly.
