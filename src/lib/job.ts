import { z } from "zod";
import { makeId } from "./scoring";

export const JobPostingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  experienceLevel: z.string(),
  rawDescription: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobPostingInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional().default("Remote"),
  requiredSkills: z.array(z.string()).optional().default([]),
  preferredSkills: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  experienceLevel: z.string().optional().default("Mid-Senior Level"),
  rawDescription: z.string().optional().default(""),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type JobPostingInput = z.input<typeof JobPostingInputSchema>;

export function normalizeJobPosting(input: JobPostingInput): JobPosting {
  const parsed = JobPostingInputSchema.parse(input);
  const now = Date.now();
  return {
    id: parsed.id && parsed.id.trim() !== "" ? parsed.id : makeId("job"),
    title: parsed.title.trim(),
    company: parsed.company.trim(),
    location: parsed.location ?? "Remote",
    requiredSkills: parsed.requiredSkills ?? [],
    preferredSkills: parsed.preferredSkills ?? [],
    responsibilities: parsed.responsibilities ?? [],
    experienceLevel: parsed.experienceLevel ?? "Mid-Senior Level",
    rawDescription: parsed.rawDescription ?? "",
    createdAt: parsed.createdAt || now,
    updatedAt: parsed.updatedAt || now,
  };
}
