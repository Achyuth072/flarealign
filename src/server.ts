import { routeAgentRequest } from "agents";
import { CareerAgent } from "./agent/career-agent";
import { TailoringWorkflow } from "./workflows/tailoring-workflow";
import {
  DEFAULT_CANDIDATE_PROFILE,
  CandidateProfile,
  CandidateUpdateSchema,
  patchCandidateProfile,
} from "./lib/candidate";
import {
  JobPosting,
  JobPostingInputSchema,
  normalizeJobPosting,
} from "./lib/job";
import { makeId } from "./lib/scoring";
import { formatAgentSessionName, formatUserActorName } from "./lib/session";

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
      const rawUserId = url.searchParams.get("userId") || request.headers.get("x-user-id");
      const actorName = rawUserId ? formatUserActorName(rawUserId) : "candidate-session";

      if (request.method === "POST" || request.method === "PUT") {
        try {
          const body = await request.json();
          const patch = CandidateUpdateSchema.parse(body);
          let updatedCandidate: CandidateProfile;

          if (env.CareerAgent) {
            const id = env.CareerAgent.idFromName(actorName);
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
          const id = env.CareerAgent.idFromName(actorName);
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

    // 3. Job Posting endpoint (GET and POST/PUT for persistence)
    if (url.pathname === "/api/job") {
      const rawSession =
        url.searchParams.get("session") ||
        url.searchParams.get("agentSessionName");
      const rawUserId = url.searchParams.get("userId") || request.headers.get("x-user-id");
      const rawSessionId = url.searchParams.get("sessionId") || request.headers.get("x-session-id");

      let actorName: string;
      if (rawSession && rawSession.startsWith("session__")) {
        actorName = rawSession;
      } else if (rawUserId && rawSessionId) {
        actorName = formatAgentSessionName(rawUserId, rawSessionId);
      } else if (rawUserId) {
        actorName = formatUserActorName(rawUserId);
      } else {
        actorName = rawSession || "candidate-session";
      }

      if (request.method === "POST" || request.method === "PUT") {
        try {
          const body = (await request.json()) as Record<string, unknown>;
          const input = JobPostingInputSchema.parse(body.job ?? body);
          let savedJob: JobPosting;

          if (env.CareerAgent) {
            const id = env.CareerAgent.idFromName(actorName);
            const stub = env.CareerAgent.get(id);
            savedJob = await (
              stub as unknown as { saveActiveJob: (j: unknown) => Promise<JobPosting> }
            ).saveActiveJob(input);
          } else {
            savedJob = normalizeJobPosting(input);
          }

          return Response.json({
            success: true,
            job: savedJob,
          });
        } catch (error) {
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 }
          );
        }
      }

      // Default GET: Fetch active job from Durable Object SQLite or fallback
      try {
        if (env.CareerAgent) {
          const id = env.CareerAgent.idFromName(actorName);
          const stub = env.CareerAgent.get(id);
          const job = await (
            stub as unknown as { getActiveJob: () => Promise<JobPosting | null> }
          ).getActiveJob();
          return Response.json({
            success: true,
            job: job || null,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch job from DO stub:", err);
      }

      return Response.json({
        success: true,
        job: null,
      });
    }

    // 4. Workflow Trigger endpoint (direct HTTP test)
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

    // 5. Route Agent Requests (WebSockets and HTTP Chat for CareerAgent DO)
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
