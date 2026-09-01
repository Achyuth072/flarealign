# 03: AI-Driven Workflow Tailoring Synthesis

**What to build:**
Upgrade the Cloudflare Workflow `TailoringWorkflow` to leverage the Cloudflare Workers AI binding (`@cf/meta/llama-3.3-70b-instruct`) in the `generate-tailoring-synthesis` step. Replace hardcoded mock strings with dynamic, LLM-generated resume bullet points and STAR-focused interview tips personalized to the job description and candidate context.

**Blocked by:** 01: Fix Scoring Heuristics and Boundary Tests

**Status:** ready-for-agent

## Acceptance criteria

- [ ] `TailoringWorkflow` accesses `this.env.AI` using the `@cf/meta/llama-3.3-70b-instruct` model (or structured prompt completion) inside the `generate-tailoring-synthesis` step
- [ ] Workflow prompt combines candidate skills, target role, normalized job description, and computed sub-dimension scores
- [ ] Returns structured `tailoredBullets` (3+ impact-driven bullets emphasizing Cloudflare primitives where relevant) and `interviewTips` (3+ concrete STAR / systems design talking points)
- [ ] Graceful fallback handling if AI inference encounters an issue, ensuring workflow execution reliably succeeds
- [ ] Workflow passes build verification (`npm run build`) and correctly returns `TailoringWorkflowResult` format

