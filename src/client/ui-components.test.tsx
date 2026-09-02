import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { Header } from "./components/Header";
import { AgentSidebar } from "./components/AgentSidebar";
import { EditJobModal } from "./components/EditJobModal";
import { FitScoreView } from "./components/FitScoreView";
import { InterviewPrepView } from "./components/InterviewPrepView";
import { TailorResumeView } from "./components/TailorResumeView";
import type { CandidateProfile, JobPosting, ScoreJobFitData, InterviewPrep, TailorResumeData } from "./types";
import { extractJobPostingHeuristic } from "../lib/job";

const mockCandidate: CandidateProfile = {
  id: "cand-1",
  name: "John Doe",
  location: "Bengaluru, India",
  targetRole: "Software Engineer",
  yearsOfExperience: 5,
  skills: ["TypeScript", "Cloudflare Workers", "Durable Objects"],
  experiences: [],
  projects: [],
  resumeSummary: "Experienced Edge Systems Engineer",
};

const mockJob: JobPosting = {
  id: "job-1",
  title: "Staff Distributed Systems Engineer",
  company: "Cloudflare",
  location: "San Francisco, CA / Remote",
  requiredSkills: ["TypeScript", "Rust", "Distributed Systems"],
  preferredSkills: ["Wasm", "Kafka"],
  responsibilities: ["Build edge compute runtime", "Maintain low latency APIs"],
  experienceLevel: "Senior Level (5+ years)",
  rawDescription: "Looking for a Staff Distributed Systems Engineer to scale edge compute platforms.",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("UI Components & Target Job Workflows", () => {
  describe("Header Component", () => {
    it("renders active target job title and company when job is present", () => {
      const html = renderToString(
        <Header
          candidate={mockCandidate}
          job={mockJob}
          onEditProfile={() => {}}
          onEditJob={() => {}}
          status="ready"
        />
      );

      expect(html).toContain("Staff Distributed Systems Engineer");
      expect(html).toContain("Cloudflare");
      expect(html).toContain("Edit JD");
      expect(html).toContain("John Doe");
    });

    it("renders 'No Target Job Set' with + Ingest JD prompt when job is null", () => {
      const html = renderToString(
        <Header
          candidate={mockCandidate}
          job={null}
          onEditProfile={() => {}}
          onEditJob={() => {}}
          status="ready"
        />
      );

      expect(html).toContain("No Target Job Set");
      expect(html).toContain("+ Ingest JD");
      expect(html).toContain("John Doe");
    });
  });

  describe("AgentSidebar Component", () => {
    it("renders Target Role active card when job is configured", () => {
      const html = renderToString(
        <AgentSidebar
          candidate={mockCandidate}
          job={mockJob}
          onTriggerWorkflow={() => {}}
          isTriggeringWorkflow={false}
          workflowStatus={null}
          onEditProfile={() => {}}
          onEditJob={() => {}}
        />
      );

      expect(html).toContain("Target Role");
      expect(html).toContain("Staff Distributed Systems Engineer");
      expect(html).toContain("Cloudflare");
      expect(html).toContain("Edit Target Job");
    });

    it("renders Ingest Target Job button when job is null", () => {
      const html = renderToString(
        <AgentSidebar
          candidate={mockCandidate}
          job={null}
          onTriggerWorkflow={() => {}}
          isTriggeringWorkflow={false}
          workflowStatus={null}
          onEditProfile={() => {}}
          onEditJob={() => {}}
        />
      );

      expect(html).toContain("No target role set");
      expect(html).toContain("Ingest Target Job");
    });
  });

  describe("EditJobModal Component", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <EditJobModal
          job={null}
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(html).toBe("");
    });

    it("renders quick paste and manual tabs when isOpen is true", () => {
      const html = renderToString(
        <EditJobModal
          job={null}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(html).toContain("Ingest Target Job Posting");
      expect(html).toContain("1. Quick Paste &amp; Auto-Extract");
      expect(html).toContain("2. Manual Field Editor");
      expect(html).toContain("Auto-Extract Fields");
    });

    it("renders edit mode with existing job data", () => {
      const html = renderToString(
        <EditJobModal
          job={mockJob}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(html).toContain("Edit Target Job Description");
      expect(html).toContain("Staff Distributed Systems Engineer");
      expect(html).toContain("Cloudflare");
    });

    it("correctly auto-extracts unstructured job posting text via extraction heuristic", () => {
      const rawPosting = `
        Role: Principal Platform Architect
        Company: Cloudflare
        Location: Austin, TX / Remote
        Requirements:
        Must have 8+ years of experience with TypeScript, Distributed Systems, Go, Docker, and Kubernetes.
        Responsibilities:
        - Lead architectural design for edge computing infrastructure.
        - Mentor senior engineers across global teams.
      `;

      const extracted = extractJobPostingHeuristic(rawPosting);
      expect(extracted.title).toBe("Principal Platform Architect");
      expect(extracted.company).toBe("Cloudflare");
      expect(extracted.location).toBe("Austin, TX / Remote");
      expect(extracted.experienceLevel).toContain("8+ years");
      expect(extracted.requiredSkills).toContain("TypeScript");
      expect(extracted.requiredSkills).toContain("Distributed Systems");
      expect(extracted.requiredSkills).toContain("Kubernetes");
      expect(extracted.responsibilities.length).toBeGreaterThan(0);
    });
  });

  describe("FitScoreView Component", () => {
    it("renders contextual empty state when data is null/empty", () => {
      const onIngest = vi.fn();
      const html = renderToString(
        <FitScoreView data={null} job={null} onIngestJob={onIngest} />
      );

      expect(html).toContain("Target Job Required for Fit Scoring");
      expect(html).toContain("Ingest Job Posting");
    });

    it("renders full score and 4 sub-dimensions when data is provided", () => {
      const fitData: ScoreJobFitData = {
        compositeScore: 88,
        recommendation: "Strong Fit",
        breakdown: {
          subDimensions: {
            skillsFit: 92,
            experienceFit: 85,
            domainFit: 90,
            trajectoryFit: 82,
          },
          strengths: ["Strong TypeScript & Workers proficiency", "Deep distributed systems knowledge"],
          gaps: ["Could deepen Rust systems exposure"],
          reasoning: "Exceptional candidate fit for Cloudflare edge engineering.",
        },
      };

      const html = renderToString(
        <FitScoreView data={fitData} job={mockJob} onIngestJob={() => {}} />
      );

      expect(html).toContain("88");
      expect(html).toContain("Strong Fit");
      expect(html).toContain("Skills Alignment");
      expect(html).toContain("92");
      expect(html).toContain("Experience Depth");
      expect(html).toContain("85");
      expect(html).toContain("Staff Distributed Systems Engineer @ Cloudflare");
      expect(html).toContain("Strong TypeScript &amp; Workers proficiency");
      expect(html).toContain("Exceptional candidate fit for Cloudflare edge engineering.");
    });
  });

  describe("InterviewPrepView Component", () => {
    it("renders contextual empty state when data has no questions", () => {
      const html = renderToString(
        <InterviewPrepView data={{}} job={null} onIngestJob={() => {}} />
      );

      expect(html).toContain("Target Job Required for Interview Prep");
      expect(html).toContain("Ingest Job Posting");
    });

    it("renders STAR behavioral and technical probing questions when provided", () => {
      const prepData: InterviewPrep = {
        jobTitle: "Staff Distributed Systems Engineer",
        company: "Cloudflare",
        behavioralQuestions: [
          {
            question: "Tell me about a time you handled a massive outage in distributed production.",
            situationTask: "Critical caching tier crashed during peak cyber traffic.",
            actionTaken: "Implemented fallback rate limiting and deployed hotfix via Workers.",
            resultImpact: "Restored full availability within 4 minutes with zero data loss.",
          },
        ],
        technicalQuestions: [
          {
            question: "How do Durable Objects achieve single-threaded consistency at global edge?",
            focusArea: "Edge Distributed State",
            keyTalkingPoints: ["Actor model isolation", "Colocated SQLite persistence", "Global unique routing"],
          },
        ],
        systemDesignFocus: ["Global Consensus", "Edge Key-Value Replication"],
      };

      const html = renderToString(
        <InterviewPrepView data={prepData} job={mockJob} onIngestJob={() => {}} />
      );

      expect(html).toContain("Tell me about a time you handled a massive outage");
      expect(html).toContain("Critical caching tier crashed");
      expect(html).toContain("Restored full availability within 4 minutes");
      expect(html).toContain("How do Durable Objects achieve single-threaded consistency");
      expect(html).toContain("Edge Distributed State");
      expect(html).toContain("Global Consensus");
    });
  });

  describe("TailorResumeView Component", () => {
    it("renders contextual empty state when data has no bullets or summary", () => {
      const html = renderToString(
        <TailorResumeView data={{}} job={null} onIngestJob={() => {}} />
      );

      expect(html).toContain("Target Job Required for Resume Tailoring");
      expect(html).toContain("Ingest Job Posting");
    });

    it("renders executive summary and tailored achievement bullets when provided", () => {
      const resumeData: TailorResumeData = {
        jobTitle: "Staff Distributed Systems Engineer",
        company: "Cloudflare",
        executiveSummary: "Senior Edge Engineer specializing in high-throughput Workers AI pipelines.",
        tailoredBullets: [
          "Engineered multi-region durable object replication handling 10M+ daily events.",
          "Optimized cold start latency from 45ms to 8ms using isolate pre-warming.",
        ],
      };

      const html = renderToString(
        <TailorResumeView data={resumeData} job={mockJob} onIngestJob={() => {}} />
      );

      expect(html).toContain("Senior Edge Engineer specializing in high-throughput");
      expect(html).toContain("Engineered multi-region durable object replication");
      expect(html).toContain("Optimized cold start latency from 45ms to 8ms");
    });
  });
});
