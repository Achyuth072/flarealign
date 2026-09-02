import { z } from "zod";

export const CandidateProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  targetRole: z.string(),
  yearsOfExperience: z.number(),
  skills: z.array(z.string()),
  experiences: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      period: z.string(),
      highlights: z.array(z.string()),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()),
      highlights: z.array(z.string()),
    })
  ),
  resumeSummary: z.string(),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

export const CandidateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  targetRole: z.string().min(1).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  skills: z.array(z.string().min(1)).optional(),
  resumeSummary: z.string().min(1).optional(),
  experiences: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        period: z.string(),
        highlights: z.array(z.string()),
      })
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        techStack: z.array(z.string()),
        highlights: z.array(z.string()),
      })
    )
    .optional(),
});

export type CandidateUpdate = z.infer<typeof CandidateUpdateSchema>;

export function patchCandidateProfile(
  current: CandidateProfile,
  patch: CandidateUpdate
): CandidateProfile {
  return {
    ...current,
    name: patch.name !== undefined ? patch.name : current.name,
    location: patch.location !== undefined ? patch.location : current.location,
    targetRole: patch.targetRole !== undefined ? patch.targetRole : current.targetRole,
    yearsOfExperience:
      patch.yearsOfExperience !== undefined ? patch.yearsOfExperience : current.yearsOfExperience,
    skills: patch.skills !== undefined ? patch.skills : current.skills,
    resumeSummary: patch.resumeSummary !== undefined ? patch.resumeSummary : current.resumeSummary,
    experiences: patch.experiences !== undefined ? patch.experiences : current.experiences,
    projects: patch.projects !== undefined ? patch.projects : current.projects,
  };
}

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  id: "candidate-default",
  name: "John Doe",
  location: "San Francisco, CA",
  targetRole: "Software Engineer – Edge Platform & DevEx",
  yearsOfExperience: 3,
  skills: [
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Cloudflare Workers",
    "Durable Objects",
    "Cloudflare Workflows",
    "Workers AI",
    "React",
    "Next.js",
    "Distributed Systems",
    "SQLite / D1",
    "LLM Tool Calling / AI Agents",
    "WebSockets",
    "Tailwind CSS",
  ],
  experiences: [
    {
      role: "Full Stack AI Engineer",
      company: "Independent / AI Systems",
      period: "2023 - Present",
      highlights: [
        "Architected distributed agentic AI workflows with multi-step validation and SQLite state persistence.",
        "Built edge-native career intelligence platforms indexing, scoring, and synthesizing job-candidate fit across thousands of postings.",
        "Engineered real-time streaming interfaces using WebSockets, Server-Sent Events, and edge caching.",
      ],
    },
    {
      role: "Software Development Engineer",
      company: "Cloud & Productivity Systems",
      period: "2021 - 2023",
      highlights: [
        "Developed developer productivity tools and high-throughput CI/CD pipelines reducing deployment friction.",
        "Designed resilient REST and WebSocket APIs serving low-latency interactive workflows.",
      ],
    },
  ],
  projects: [
    {
      name: "Pulse Career Module",
      description: "Edge AI Career CRM with hybrid BM25 + embedding job matching, multi-step tailoring pipeline, and feedback loops.",
      techStack: ["TypeScript", "Next.js", "SQLite", "Prisma", "AI SDK", "Tailwind CSS"],
      highlights: [
        "Implemented composite scoring across skills, experience, domain, and trajectory dimensions.",
        "Built automated resume tailoring and STAR-method interview response generation.",
      ],
    },
    {
      name: "Cloudflare Edge AI Copilot",
      description: "Stateful AI Agent running on Cloudflare Workers, Durable Objects, SQLite, and Workers AI with Workflows.",
      techStack: ["Cloudflare Workers", "@cloudflare/agents", "Durable Objects", "Workers AI", "React"],
      highlights: [
        "Sub-100ms cold-start edge agent coordination with persistent SQLite actor state.",
        "Automated async job-to-resume analysis via Cloudflare Workflows.",
      ],
    },
  ],
  resumeSummary: "Full Stack Software Engineer specializing in distributed edge computing, Cloudflare developer platforms, and AI agent architectures. Experienced with Cloudflare Workers, Durable Objects, Workers AI, TypeScript, and modern reactive web applications.",
};

