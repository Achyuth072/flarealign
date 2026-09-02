import { describe, it, expect, vi } from "vitest";
import server from "./server";
import { JobPosting, JobPostingInput } from "./lib/job";

describe("Worker Server Endpoints", () => {
  const dummyCtx: ExecutionContext = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;

  describe("GET /api/health", () => {
    it("returns health status with service metadata", async () => {
      const req = new Request("http://localhost/api/health");
      const env: Env = {} as unknown as Env;

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { status: string; service: string };
      expect(json.status).toBe("ok");
      expect(json.service).toBe("cloudflare-career-agent");
    });
  });

  describe("/api/job endpoints", () => {
    it("GET /api/job returns null job when no DO stub is bound", async () => {
      const req = new Request("http://localhost/api/job?userId=user-123&sessionId=session-abc");
      const env: Env = {} as unknown as Env;

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; job: JobPosting | null };
      expect(json.success).toBe(true);
      expect(json.job).toBeNull();
    });

    it("GET /api/job queries CareerAgent DO stub when bound", async () => {
      const mockJob: JobPosting = {
        id: "job-do-1",
        title: "Staff Edge Systems Engineer",
        company: "Cloudflare",
        location: "San Francisco, CA",
        requiredSkills: ["TypeScript", "Durable Objects"],
        preferredSkills: ["Rust"],
        responsibilities: ["Scale Edge platforms"],
        experienceLevel: "Staff (8+ years)",
        rawDescription: "Cloudflare edge job description",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };

      const mockGetActiveJob = vi.fn().mockResolvedValue(mockJob);
      const mockStub = {
        getActiveJob: mockGetActiveJob,
      };
      const mockCareerAgent = {
        idFromName: vi.fn().mockReturnValue("mock-do-id"),
        get: vi.fn().mockReturnValue(mockStub),
      };

      const env: Env = {
        CareerAgent: mockCareerAgent,
      } as unknown as Env;

      const req = new Request("http://localhost/api/job?userId=user-456&sessionId=session-xyz");
      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; job: JobPosting | null };
      expect(json.success).toBe(true);
      expect(json.job).toEqual(mockJob);
      expect(mockCareerAgent.idFromName).toHaveBeenCalledWith("session__user-456__session-xyz");
      expect(mockGetActiveJob).toHaveBeenCalled();
    });

    it("POST /api/job successfully saves job and returns normalized JobPosting", async () => {
      const payload: JobPostingInput = {
        title: "Frontend Architect",
        company: "Cloudflare",
        location: "Austin, TX",
        requiredSkills: ["React", "TypeScript", "Tailwind CSS"],
      };

      const req = new Request("http://localhost/api/job?userId=user-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const env: Env = {} as unknown as Env;

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; job: JobPosting };
      expect(json.success).toBe(true);
      expect(json.job.title).toBe("Frontend Architect");
      expect(json.job.company).toBe("Cloudflare");
      expect(json.job.location).toBe("Austin, TX");
      expect(json.job.requiredSkills).toEqual(["React", "TypeScript", "Tailwind CSS"]);
      expect(json.job.experienceLevel).toBe("Mid-Senior Level");
      expect(json.job.id).toMatch(/^job-/);
    });

    it("POST /api/job delegates to CareerAgent DO stub when bound", async () => {
      const payload: JobPostingInput = {
        title: "Senior AI Engineer",
        company: "Cloudflare",
        requiredSkills: ["Workers AI", "TypeScript"],
      };

      const savedResult: JobPosting = {
        id: "job-saved-100",
        title: "Senior AI Engineer",
        company: "Cloudflare",
        location: "Remote",
        requiredSkills: ["Workers AI", "TypeScript"],
        preferredSkills: [],
        responsibilities: [],
        experienceLevel: "Mid-Senior Level",
        rawDescription: "",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };

      const mockSaveActiveJob = vi.fn().mockResolvedValue(savedResult);
      const mockStub = {
        saveActiveJob: mockSaveActiveJob,
      };
      const mockCareerAgent = {
        idFromName: vi.fn().mockReturnValue("mock-do-id"),
        get: vi.fn().mockReturnValue(mockStub),
      };

      const env: Env = {
        CareerAgent: mockCareerAgent,
      } as unknown as Env;

      const req = new Request("http://localhost/api/job?agentSessionName=session__u1__s1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: payload }),
      });

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; job: JobPosting };
      expect(json.success).toBe(true);
      expect(json.job).toEqual(savedResult);
      expect(mockCareerAgent.idFromName).toHaveBeenCalledWith("session__u1__s1");
      expect(mockSaveActiveJob).toHaveBeenCalled();
    });

    it("POST /api/job rejects invalid input with 400 status", async () => {
      const invalidPayload = {
        // missing title and company
        location: "Remote",
      };

      const req = new Request("http://localhost/api/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });
      const env: Env = {} as unknown as Env;

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(400);

      const json = (await res.json()) as { success: boolean; error: string };
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });
  });

  describe("/api/candidate endpoints", () => {
    it("GET /api/candidate returns default candidate profile when no DO bound", async () => {
      const req = new Request("http://localhost/api/candidate");
      const env: Env = {} as unknown as Env;

      const res = await server.fetch(req, env, dummyCtx);
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; candidate: { name: string } };
      expect(json.success).toBe(true);
      expect(json.candidate.name).toBe("John Doe");
    });
  });
});
