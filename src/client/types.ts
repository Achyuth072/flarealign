import type { CandidateProfile } from "../lib/candidate";
import type { InterviewPrep, BehavioralQuestion, TechnicalQuestion } from "../lib/interview";
import type { FitScoreSubDimensions } from "../lib/scoring";

export interface ApiResponse<T> {
  success?: boolean;
  candidate?: T;
  workflowInstanceId?: string;
  error?: string;
}

export interface ScoreJobFitData {
  jobId?: string;
  compositeScore?: number;
  score?: number;
  recommendation?: string;
  breakdown?: {
    subDimensions?: FitScoreSubDimensions;
    strengths?: string[];
    gaps?: string[];
    reasoning?: string;
  };
  subDimensions?: FitScoreSubDimensions;
}

export interface TailorResumeData {
  applicationId?: string;
  jobTitle?: string;
  company?: string;
  executiveSummary?: string;
  tailoredBullets?: string[];
}

export interface ToolPartLike {
  type?: string;
  toolName?: string;
  state?: "input-streaming" | "input-available" | "approval-requested" | "approval-responded" | "output-available" | "output-error" | string;
  output?: unknown;
  input?: unknown;
  errorText?: string;
  error?: unknown;
}

export type { CandidateProfile, InterviewPrep, BehavioralQuestion, TechnicalQuestion, FitScoreSubDimensions };

