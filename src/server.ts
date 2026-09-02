import { routeAgentRequest } from "agents";
import { CareerAgent } from "./agent/career-agent";
import { TailoringWorkflow } from "./workflows/tailoring-workflow";
import {
  DEFAULT_CANDIDATE_PROFILE,
  CandidateProfile,
  CandidateUpdateSchema,
  patchCandidateProfile,
} from "./lib/candidate";
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

    // 2. Candidate Profile endpoint (GET and POST/PUT for persistence)
    if (url.pathname === "/api/candidate") {
      if (request.method === "POST" || request.method === "PUT") {
        try {
          const body = await request.json();
          const patch = CandidateUpdateSchema.parse(body);
          let updatedCandidate: CandidateProfile;

          if (env.CareerAgent) {
            const id = env.CareerAgent.idFromName("candidate-session");
            const stub = env.CareerAgent.get(id);
            const current =
              (await (
                stub as unknown as { getCandidate: () => Promise<CandidateProfile> }
              ).getCandidate()) || DEFAULT_CANDIDATE_PROFILE;
            updatedCandidate = patchCandidateProfile(current, patch);
            await (
              stub as unknown as { updateCandidate: (p: CandidateProfile) => Promise<void> }
            ).updateCandidate(updatedCandidate);
          } else {
            updatedCandidate = patchCandidateProfile(DEFAULT_CANDIDATE_PROFILE, patch);
          }

          return Response.json({
            success: true,
            candidate: updatedCandidate,
          });
        } catch (error) {
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 }
          );
        }
      }

      // Default GET: Fetch current profile from Durable Object SQLite or fallback
      try {
        if (env.CareerAgent) {
          const id = env.CareerAgent.idFromName("candidate-session");
          const stub = env.CareerAgent.get(id);
          const candidate = await (
            stub as unknown as { getCandidate: () => Promise<CandidateProfile> }
          ).getCandidate();
          return Response.json({
            success: true,
            candidate: candidate || DEFAULT_CANDIDATE_PROFILE,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch candidate from DO stub, falling back to default:", err);
      }

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
            jobTitle: body.jobTitle || "Software Engineer – Edge Platform & DevEx",
            company: body.company || "Cloudflare",
            jobDescription:
              body.jobDescription ||
              "Looking for a Software Engineer to work on Cloudflare Edge Platform, Workers, and Developer Experience.",
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
