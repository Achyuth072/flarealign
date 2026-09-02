import { routeAgentRequest } from "agents";
import { CareerAgent } from "./agent/career-agent";
import { TailoringWorkflow } from "./workflows/tailoring-workflow";
import { DEFAULT_CANDIDATE_PROFILE } from "./lib/candidate";
import { makeId } from "./lib/scoring";

export { CareerAgent, TailoringWorkflow };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health & Status Check
    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "cloudflare-career-agent",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        bindings: {
          ai: !!env.AI,
          durableObjects: !!env.CareerAgent,
          workflows: !!env.TAILORING_WORKFLOW,
        },
      });
    }

    // 2. Candidate Profile endpoint
    if (url.pathname === "/api/candidate") {
      return Response.json({
        success: true,
        candidate: DEFAULT_CANDIDATE_PROFILE,
      });
    }

    // 3. Workflow Trigger endpoint (direct HTTP test)
    if (url.pathname === "/api/workflows/trigger" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          jobTitle?: string;
          company?: string;
          jobDescription?: string;
        };
        const instance = await env.TAILORING_WORKFLOW.create({
          params: {
            jobId: makeId("api-job"),
            jobTitle: body.jobTitle || "Software Engineer – Platforms & Productivity",
            company: body.company || "Cloudflare",
            jobDescription:
              body.jobDescription ||
              "Looking for a Software Engineer to work on Cloudflare Platforms, Workers, and Developer Productivity.",
          },
        });

        return Response.json({
          success: true,
          workflowInstanceId: instance.id,
          status: "RUNNING",
        });
      } catch (error) {
        return Response.json(
          { success: false, error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    // 4. Route Agent Requests (WebSockets and HTTP Chat for CareerAgent DO)
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    // Fallback to Static Assets (Frontend)
    if (env.ASSETS) {
      return (env.ASSETS as unknown as { fetch: (req: Request) => Promise<Response> }).fetch(request) as unknown as Response;
    }

    return new Response("Not Found", { status: 404 });
  },
};
