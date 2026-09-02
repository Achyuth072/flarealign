import { CandidateProfile, DEFAULT_CANDIDATE_PROFILE } from "./candidate";

export const SQL_ENABLE_FOREIGN_KEYS = `PRAGMA foreign_keys = ON;`;

export const CREATE_CANDIDATES_TABLE = `
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const CREATE_JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export const CREATE_FIT_SCORES_TABLE = `
CREATE TABLE IF NOT EXISTS fit_scores (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  breakdown TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export const CREATE_APPLICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tailored_resume TEXT NOT NULL,
  interview_prep TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export const ALL_SCHEMA_STATEMENTS = [
  SQL_ENABLE_FOREIGN_KEYS,
  CREATE_CANDIDATES_TABLE,
  CREATE_JOBS_TABLE,
  CREATE_FIT_SCORES_TABLE,
  CREATE_APPLICATIONS_TABLE,
] as const;

export interface CandidateRow {
  id: string;
  name: string;
  data: string;
  updated_at: number;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  description: string;
  created_at: number;
}

export interface FitScoreRow {
  id: string;
  job_id: string;
  score: number;
  recommendation: string;
  breakdown: string;
  created_at: number;
}

export interface ApplicationRow {
  id: string;
  job_id: string;
  tailored_resume: string;
  interview_prep: string;
  created_at: number;
}

/**
 * Executes SQLite schema initialization statements on a given database executor.
 */
export function initSqliteSchema(exec: (sql: string) => void): void {
  for (const statement of ALL_SCHEMA_STATEMENTS) {
    exec(statement);
  }
}

/**
 * Idempotently seeds the default candidate profile into the database if not present.
 * Does not overwrite existing profiles.
 */
export function seedCandidateIfMissing(
  queryExists: (candidateId: string) => boolean,
  insertCandidate: (row: CandidateRow) => void,
  defaultProfile: CandidateProfile = DEFAULT_CANDIDATE_PROFILE
): boolean {
  if (queryExists(defaultProfile.id)) {
    return false;
  }
  insertCandidate({
    id: defaultProfile.id,
    name: defaultProfile.name,
    data: JSON.stringify(defaultProfile),
    updated_at: Date.now(),
  });
  return true;
}
