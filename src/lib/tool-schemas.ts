import { z } from "zod";

// Workers AI routes tool calls through a constrained-JSON llama variant that
// echoes JSON Schema `default` values back as stringified literals — arrays
// arrive as "['a', 'b']" and numbers as "85", failing input validation before
// the tool executes. Steer the model with `.describe()` instead of `.default()`.

export const ScoreJobFitSchema = z.object({
  jobTitle: z.string().describe("Target job title, e.g. 'Software Engineer – Edge Platform & DevEx'"),
  company: z.string().describe("Hiring company name, e.g. 'Cloudflare'"),
  jobDescription: z.string().optional().describe("Full job description text"),
  skillsFit: z.coerce.number().min(0).max(100).describe("Estimated skills alignment score (0-100)"),
  experienceFit: z.coerce.number().min(0).max(100).describe("Estimated experience depth score (0-100)"),
  domainFit: z.coerce.number().min(0).max(100).describe("Estimated domain knowledge score (0-100)"),
  trajectoryFit: z.coerce.number().min(0).max(100).describe("Estimated career trajectory score (0-100)"),
  strengths: z.array(z.string()).describe("Key candidate strengths for this role"),
  gaps: z.array(z.string()).describe("Identified gaps or missing keywords"),
  reasoning: z.string().describe("Summary of evaluation reasoning"),
});

export const TailorResumeSchema = z.object({
  jobTitle: z.string().describe("Target job title, e.g. 'Software Engineer – Edge Platform & DevEx'"),
  company: z.string().describe("Hiring company name, e.g. 'Cloudflare'"),
  focusAreas: z.array(z.string()).optional().describe("Key technical focus areas, e.g. Workers, Durable Objects, Workflows, TypeScript"),
  tailoredBullets: z.array(z.string()).describe("Impact-focused resume bullet points with metrics"),
  executiveSummary: z.string().describe("Tailored 2-3 sentence executive summary"),
});

export const TriggerBatchWorkflowSchema = z.object({
  jobTitle: z.string().describe("Target job title, e.g. 'Software Engineer – Edge Platform & DevEx'"),
  company: z.string().describe("Hiring company name, e.g. 'Cloudflare'"),
  jobDescription: z.string().optional().describe("Job description"),
});
