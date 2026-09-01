import type { Ai, DurableObjectNamespace, Workflow, Fetcher } from "@cloudflare/workers-types";
import type { CareerAgent } from "./agent/career-agent";
import type { TailoringWorkflowParams } from "./workflows/tailoring-workflow";

declare global {
  interface Env {
    AI: Ai;
    CareerAgent: DurableObjectNamespace<CareerAgent>;
    TAILORING_WORKFLOW: Workflow<TailoringWorkflowParams>;
    ASSETS?: Fetcher;
  }
}

export {};

