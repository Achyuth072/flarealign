export interface WorkflowStep {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export interface WorkflowEvent<T = unknown> {
  payload: T;
  timestamp?: Date;
  instanceId?: string;
}

export class DurableObject<Env = unknown> {
  ctx: unknown;
  env: Env;
  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class RpcTarget {}

export class WorkerEntrypoint<Env = unknown> {
  ctx: unknown;
  env: Env;
  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class WorkflowEntrypoint<Env = unknown, Params = unknown> {
  ctx: unknown;
  env: Env;
  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class EmailMessage {}
export const exports = {};
