import { describe, it, expect } from "vitest";
import { asSchema } from "ai";
import type { z } from "zod";
import {
  ScoreJobFitSchema,
  TailorResumeSchema,
  TriggerBatchWorkflowSchema,
  IngestJobDescriptionSchema,
} from "./tool-schemas";
import { InterviewPrepSchema } from "./interview";
import { CandidateUpdateSchema } from "./candidate";

const TOOL_INPUT_SCHEMAS: [string, z.ZodType][] = [
  ["scoreJobFit", ScoreJobFitSchema],
  ["tailorResume", TailorResumeSchema],
  ["generateInterviewPrep", InterviewPrepSchema],
  ["triggerBatchWorkflow", TriggerBatchWorkflowSchema],
  ["updateCandidateProfile", CandidateUpdateSchema],
  ["ingestJobDescription", IngestJobDescriptionSchema],
];

function collectDefaultPaths(node: unknown, path: string[] = []): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((child, i) => collectDefaultPaths(child, [...path, String(i)]));
  }
  if (typeof node !== "object" || node === null) {
    return [];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    key === "default" ? [path.join(".")] : collectDefaultPaths(value, [...path, key])
  );
}

describe("Tool input schemas", () => {
  // Schema defaults make the stringification described in ./tool-schemas.ts
  // near-certain rather than intermittent, so tool inputs must declare none.
  it.each(TOOL_INPUT_SCHEMAS)("emits no JSON Schema defaults for %s", (_name, schema) => {
    const { jsonSchema } = asSchema(schema);
    expect(collectDefaultPaths(jsonSchema)).toEqual([]);
  });

  it("accepts the scoreJobFit payload Workers AI emits", () => {
    const result = ScoreJobFitSchema.safeParse({
      jobTitle: "Software Engineer - Edge Platform & DevEx",
      company: "Cloudflare",
      jobDescription: "Software Engineer - Edge Platform & DevEx job description",
      skillsFit: 85,
      experienceFit: 70,
      domainFit: 80,
      trajectoryFit: 75,
      strengths: ["TypeScript expertise"],
      gaps: ["management experience"],
      reasoning: "Candidate has a strong background in edge platforms.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the generateInterviewPrep payload Workers AI emits", () => {
    const result = InterviewPrepSchema.safeParse({
      jobTitle: "Edge Platform & DevEx",
      company: "Cloudflare",
      technicalQuestions: [
        {
          question: "How do you handle errors in a distributed system?",
          focusArea: "Distributed Systems",
          keyTalkingPoints: ["Error handling mechanisms", "Fault tolerance strategies"],
        },
      ],
      behavioralQuestions: [
        {
          question: "Tell me about a time when you had to troubleshoot a complex technical issue.",
          situationTask: "Identified a critical bug in a production system",
          actionTaken: "Led a team to debug and resolve the issue",
          resultImpact: "Resolved the issue within 24 hours, resulting in 99.99% uptime",
        },
      ],
      systemDesignFocus: ["Distributed Systems", "Edge Computing"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts the ingestJobDescription payload Workers AI emits", () => {
    const result = IngestJobDescriptionSchema.safeParse({
      title: "Senior Backend Engineer",
      company: "Stripe",
      location: "San Francisco, CA / Remote",
      requiredSkills: ["Go", "Distributed Systems", "PostgreSQL"],
      preferredSkills: ["Kubernetes", "AWS"],
      responsibilities: ["Scale payment processing infrastructure", "Design high-availability APIs"],
      experienceLevel: "Senior (5+ years)",
      rawDescription: "Join Stripe as a Senior Backend Engineer on Payments Infrastructure.",
    });
    expect(result.success).toBe(true);
  });
});

