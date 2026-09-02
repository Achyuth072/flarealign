import { describe, it, expect, vi } from "vitest";
import {
  TailoringWorkflow,
  buildSynthesisPrompt,
  parseSynthesisResponse,
  getFallbackSynthesis,
  generateTailoringSynthesis,
  TailoringWorkflowParams,
  TailoringWorkflowResult,
} from "./tailoring-workflow";
import { DEFAULT_CANDIDATE_PROFILE } from "../lib/candidate";

describe("TailoringWorkflow AI Synthesis & Helpers", () => {
  const mockJob = {
    title: "Software Engineer – Edge Platform & DevEx",
    company: "Cloudflare",
    description: "Build developer platforms, distributed edge workflows, and systems tooling using TypeScript and Cloudflare Workers.",
  };

  const mockFitResult = {
    score: 88,
    recommendation: "Strong Fit",
    subDimensions: {
      skillsFit: 92,
      experienceFit: 85,
      domainFit: 95,
      trajectoryFit: 80,
    },
  };

  describe("buildSynthesisPrompt", () => {
    it("combines candidate context, target role, job description, and all sub-dimension scores", () => {
      const prompt = buildSynthesisPrompt(DEFAULT_CANDIDATE_PROFILE, mockJob, mockFitResult);

      expect(prompt).toContain(DEFAULT_CANDIDATE_PROFILE.name);
      expect(prompt).toContain(DEFAULT_CANDIDATE_PROFILE.targetRole);
      expect(prompt).toContain(DEFAULT_CANDIDATE_PROFILE.skills[0]);
      expect(prompt).toContain(mockJob.title);
      expect(prompt).toContain(mockJob.company);
      expect(prompt).toContain(mockJob.description);
      expect(prompt).toContain("88/100");
      expect(prompt).toContain("Strong Fit");
      expect(prompt).toContain("Skills Fit: 92");
      expect(prompt).toContain("Experience Fit: 85");
      expect(prompt).toContain("Domain Fit: 95");
      expect(prompt).toContain("Trajectory Fit: 80");
      expect(prompt).toContain("tailoredBullets");
      expect(prompt).toContain("interviewTips");
    });
  });

  describe("parseSynthesisResponse", () => {
    it("parses clean JSON response successfully", () => {
      const jsonStr = JSON.stringify({
        tailoredBullets: [
          "Built high-throughput edge agent using Cloudflare Workers and Durable Objects.",
          "Optimized distributed workflow orchestrations reducing latency by 40%.",
          "Engineered developer productivity telemetry dashboards with TypeScript and React.",
        ],
        interviewTips: [
          "Explain Durable Object SQLite storage and transactional consistency guarantees.",
          "Discuss handling asynchronous multi-step pipelines using Cloudflare Workflows.",
          "Structure STAR example around edge cold-start optimizations and KV caching.",
        ],
      });

      const parsed = parseSynthesisResponse(jsonStr);
      expect(parsed).not.toBeNull();
      expect(parsed?.tailoredBullets).toHaveLength(3);
      expect(parsed?.interviewTips).toHaveLength(3);
      expect(parsed?.tailoredBullets[0]).toContain("Cloudflare Workers");
    });

    it("parses markdown code fenced JSON (```json ... ```)", () => {
      const markdown = `
Here is the personalized synthesis:
\`\`\`json
{
  "tailoredBullets": [
    "Bullet 1 with Cloudflare Workers",
    "Bullet 2 with Durable Objects",
    "Bullet 3 with Cloudflare Workflows"
  ],
  "interviewTips": [
    "Tip 1 for STAR method",
    "Tip 2 for systems design",
    "Tip 3 for edge platforms"
  ]
}
\`\`\`
Hope this helps!
`;
      const parsed = parseSynthesisResponse(markdown);
      expect(parsed).not.toBeNull();
      expect(parsed?.tailoredBullets).toHaveLength(3);
      expect(parsed?.interviewTips).toHaveLength(3);
      expect(parsed?.tailoredBullets[0]).toBe("Bullet 1 with Cloudflare Workers");
    });

    it("handles already parsed JavaScript objects", () => {
      const obj = {
        tailoredBullets: ["Bullet 1", "Bullet 2", "Bullet 3"],
        interviewTips: ["Tip 1", "Tip 2", "Tip 3"],
      };
      const parsed = parseSynthesisResponse(obj);
      expect(parsed).toEqual(obj);
    });

    it("returns null for invalid or incomplete responses", () => {
      expect(parseSynthesisResponse("Not a json string")).toBeNull();
      expect(parseSynthesisResponse(null)).toBeNull();
      expect(parseSynthesisResponse(undefined)).toBeNull();
      expect(parseSynthesisResponse(12345)).toBeNull();
      expect(parseSynthesisResponse(JSON.stringify({ tailoredBullets: ["Only one"] }))).toBeNull();
      expect(parseSynthesisResponse(JSON.stringify({ tailoredBullets: "not an array", interviewTips: [] }))).toBeNull();
    });
  });

  describe("getFallbackSynthesis", () => {
    it("returns at least 3 tailored bullets and at least 3 interview tips customized to job", () => {
      const fallback = getFallbackSynthesis(mockJob, 88);

      expect(fallback.tailoredBullets.length).toBeGreaterThanOrEqual(3);
      expect(fallback.interviewTips.length).toBeGreaterThanOrEqual(3);
      expect(fallback.tailoredBullets.some((b) => b.includes("Cloudflare"))).toBe(true);
      expect(fallback.interviewTips.some((t) => t.includes("Cloudflare"))).toBe(true);
    });

    it("handles missing job company or title gracefully", () => {
      const fallback = getFallbackSynthesis({ title: "", company: "", description: "" });
      expect(fallback.tailoredBullets.length).toBeGreaterThanOrEqual(3);
      expect(fallback.interviewTips.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("generateTailoringSynthesis", () => {
    it("invokes AI binding with llama-3.3-70b-instruct and returns parsed synthesis", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({
          response: JSON.stringify({
            tailoredBullets: [
              "Architected low-latency AI agents with Cloudflare Workers and Durable Objects.",
              "Implemented reliable background pipelines using Cloudflare Workflows.",
              "Constructed streaming telemetry interfaces using TypeScript and React.",
            ],
            interviewTips: [
              "Walk through distributed state management in Durable Objects.",
              "Discuss asynchronous resilience and retries in Cloudflare Workflows.",
              "Highlight developer productivity tooling improvements.",
            ],
          }),
        }),
      };

      const result = await generateTailoringSynthesis(mockAi as any, DEFAULT_CANDIDATE_PROFILE, mockJob, mockFitResult);

      expect(mockAi.run).toHaveBeenCalledTimes(1);
      expect(mockAi.run).toHaveBeenCalledWith(
        "@cf/meta/llama-3.3-70b-instruct",
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user" }),
          ]),
        })
      );
      expect(result.tailoredBullets).toHaveLength(3);
      expect(result.interviewTips).toHaveLength(3);
      expect(result.tailoredBullets[0]).toContain("Cloudflare Workers");
    });

    it("falls back gracefully when AI binding throws an error (e.g. rate limit, network failure)", async () => {
      const mockAi = {
        run: vi.fn().mockRejectedValue(new Error("AI inference service unavailable")),
      };

      const result = await generateTailoringSynthesis(mockAi as any, DEFAULT_CANDIDATE_PROFILE, mockJob, mockFitResult);

      expect(mockAi.run).toHaveBeenCalledTimes(1);
      expect(result.tailoredBullets.length).toBeGreaterThanOrEqual(3);
      expect(result.interviewTips.length).toBeGreaterThanOrEqual(3);
      expect(result.tailoredBullets.some((b) => b.includes("Cloudflare"))).toBe(true);
    });

    it("falls back gracefully when AI returns unparseable output", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({ response: "Internal Model Error: Invalid JSON" }),
      };

      const result = await generateTailoringSynthesis(mockAi as any, DEFAULT_CANDIDATE_PROFILE, mockJob, mockFitResult);

      expect(result.tailoredBullets.length).toBeGreaterThanOrEqual(3);
      expect(result.interviewTips.length).toBeGreaterThanOrEqual(3);
    });

    it("falls back gracefully when AI binding is undefined/null", async () => {
      const result = await generateTailoringSynthesis(undefined, DEFAULT_CANDIDATE_PROFILE, mockJob, mockFitResult);
      expect(result.tailoredBullets.length).toBeGreaterThanOrEqual(3);
      expect(result.interviewTips.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("TailoringWorkflow Execution", () => {
    it("runs complete workflow and returns properly formatted TailoringWorkflowResult", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({
          response: JSON.stringify({
            tailoredBullets: [
              "Engineered distributed agents with Cloudflare Workers.",
              "Implemented multi-step pipelines with Cloudflare Workflows.",
              "Built developer tooling and real-time streaming interfaces.",
            ],
            interviewTips: [
              "Detail edge computing patterns and Durable Objects.",
              "Explain stateful agent coordination and SQLite persistence.",
              "Discuss high-throughput developer platforms.",
            ],
          }),
        }),
      };

      const workflow = new TailoringWorkflow({} as any, { AI: mockAi as any } as any);

      // Create a mock step executor that calls each step's callback
      const mockStep = {
        do: vi.fn().mockImplementation(async (name: string, fn: () => Promise<any>) => {
          return await fn();
        }),
      };

      const event = {
        payload: {
          jobId: "job-test-123",
          jobTitle: "Software Engineer – Edge Platform & DevEx",
          company: "Cloudflare",
          jobDescription: "Looking for a Software Engineer to work on Cloudflare Platforms, Workers, and Developer Productivity.",
        },
      };

      const result: TailoringWorkflowResult = await workflow.run(event as any, mockStep as any);

      expect(mockStep.do).toHaveBeenCalledWith("normalize-job", expect.any(Function));
      expect(mockStep.do).toHaveBeenCalledWith("compute-fit-score", expect.any(Function));
      expect(mockStep.do).toHaveBeenCalledWith("generate-tailoring-synthesis", expect.any(Function));

      expect(result.jobId).toBe("job-test-123");
      expect(result.fitScore).toBeGreaterThanOrEqual(0);
      expect(result.fitScore).toBeLessThanOrEqual(100);
      expect(["Strong Fit", "Potential Fit", "Low Fit"]).toContain(result.recommendation);
      expect(result.subDimensions).toHaveProperty("skillsFit");
      expect(result.subDimensions).toHaveProperty("experienceFit");
      expect(result.subDimensions).toHaveProperty("domainFit");
      expect(result.subDimensions).toHaveProperty("trajectoryFit");
      expect(result.tailoredBullets).toHaveLength(3);
      expect(result.interviewTips).toHaveLength(3);
      expect(result.processedAt).toBeDefined();
    });
  });
});
