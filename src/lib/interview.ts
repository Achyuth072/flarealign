import { z } from "zod";

export const TechnicalQuestionSchema = z.object({
  question: z.string().describe("Technical question asked in technical/domain round"),
  focusArea: z.string().describe("Core technology or concept focus area"),
  keyTalkingPoints: z.array(z.string()).describe("Key technical talking points and architectural details"),
});

export const BehavioralQuestionSchema = z.object({
  question: z.string().describe("Behavioral or leadership question"),
  situationTask: z.string().describe("Situation & Task: Context, challenge, and objectives"),
  actionTaken: z.string().describe("Action Taken: Specific engineering actions, decisions, and execution"),
  resultImpact: z.string().describe("Result & Impact: Quantifiable business or systems outcome"),
});

export const InterviewPrepSchema = z.object({
  jobTitle: z.string().describe("Target job title"),
  company: z.string().describe("Hiring company name"),
  technicalQuestions: z
    .array(TechnicalQuestionSchema)
    .describe("Technical questions and talking points"),
  behavioralQuestions: z
    .array(BehavioralQuestionSchema)
    .describe("Behavioral questions with structured STAR-format answers"),
  systemDesignFocus: z
    .array(z.string())
    .describe("Key distributed architecture and edge systems design topics"),
});

export type TechnicalQuestion = z.infer<typeof TechnicalQuestionSchema>;
export type BehavioralQuestion = z.infer<typeof BehavioralQuestionSchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

/**
 * Validates and parses raw interview prep payload.
 */
export function parseInterviewPrep(raw: unknown): InterviewPrep {
  return InterviewPrepSchema.parse(raw);
}
