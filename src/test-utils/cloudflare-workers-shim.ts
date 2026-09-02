export interface WorkflowStep {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export interface WorkflowEvent<T = unknown> {
  payload: T;
  timestamp?: Date;
  instanceId?: string;
}

export class WorkflowEntrypoint<Env = unknown, Params = unknown> {
  ctx: unknown;
  env: Env;
  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

