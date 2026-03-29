import type { QuantumClient } from "./client.js";

// ── Request types ────────────────────────────────────────────────

/** Worker configuration within a mission. */
export interface MissionWorkerConfig {
  /** Model to use for this worker. */
  model: string;
  /** Cost tier: "cheap", "mid", "expensive". */
  tier: string;
  /** Worker description / capabilities. */
  description?: string;
}

/** Request body for creating a mission. */
export interface MissionCreateRequest {
  /** High-level task description. */
  goal: string;
  /** Strategy: "wave" (default), "dag", "mapreduce", "refinement", "branch". */
  strategy?: string;
  /** Conductor model (default: claude-sonnet-4-6). */
  conductorModel?: string;
  /** Worker team configuration (keyed by worker name). */
  workers?: Record<string, MissionWorkerConfig>;
  /** Maximum orchestration steps (default: 25). */
  maxSteps?: number;
  /** Custom system prompt for the conductor. */
  systemPrompt?: string;
  /** Existing session ID for context continuity. */
  sessionId?: string;
}

/** Request body for chatting with a mission's architect. */
export interface MissionChatRequest {
  /** Message to send to the architect. */
  message: string;
  /** Enable streaming (not yet supported). */
  stream?: boolean;
}

/** Request body for updating a mission plan. */
export interface MissionPlanUpdate {
  /** Updated task list. */
  tasks?: Record<string, unknown>[];
  /** Updated worker configuration. */
  workers?: Record<string, MissionWorkerConfig>;
  /** Additional system prompt. */
  systemPrompt?: string;
  /** Updated max steps. */
  maxSteps?: number;
  /** Additional context to inject. */
  context?: string;
}

/** Request body for confirming/rejecting a mission structure. */
export interface MissionConfirmStructure {
  /** Whether the structure is approved. */
  confirmed: boolean;
  /** Rejection reason or modification notes. */
  feedback?: string;
}

/** Request body for approving a completed mission. */
export interface MissionApproveRequest {
  /** Git commit SHA associated with the mission output. */
  commitSha?: string;
  /** Approval comment. */
  comment?: string;
}

/** Request body for importing a plan as a new mission. */
export interface MissionImportRequest {
  /** Mission goal. */
  goal: string;
  /** Strategy. */
  strategy?: string;
  /** Conductor model. */
  conductorModel?: string;
  /** Worker configuration. */
  workers?: Record<string, MissionWorkerConfig>;
  /** Pre-defined tasks. */
  tasks: Record<string, unknown>[];
  /** System prompt. */
  systemPrompt?: string;
  /** Maximum steps. */
  maxSteps?: number;
  /** Auto-execute after import. */
  autoExecute?: boolean;
}

// ── Response types ───────────────────────────────────────────────

/** Response from mission creation. */
export interface MissionCreateResponse {
  /** Mission identifier. */
  missionId: string;
  /** Initial status. */
  status: string;
  /** Session ID for conversation context. */
  sessionId?: string;
  /** Conductor model used. */
  conductorModel?: string;
  /** Strategy used. */
  strategy?: string;
  /** Worker configuration. */
  workers?: Record<string, MissionWorkerConfig>;
  /** Creation timestamp. */
  createdAt?: string;
  /** Request identifier. */
  requestId?: string;
}

/** A task within a mission. */
export interface MissionTask {
  /** Task identifier. */
  id?: string;
  /** Task name. */
  name?: string;
  /** Task description. */
  description?: string;
  /** Assigned worker name. */
  worker?: string;
  /** Model used. */
  model?: string;
  /** Task status. */
  status?: string;
  /** Task result. */
  result?: string;
  /** Error message if failed. */
  error?: string;
  /** Step number. */
  step: number;
  /** Input tokens used. */
  tokensIn: number;
  /** Output tokens used. */
  tokensOut: number;
}

/** Mission detail (from GET /missions/{id}). */
export interface MissionDetail {
  /** Mission identifier. */
  id?: string;
  /** User who created the mission. */
  userId?: string;
  /** Mission goal. */
  goal?: string;
  /** Strategy. */
  strategy?: string;
  /** Conductor model. */
  conductorModel?: string;
  /** Current status. */
  status?: string;
  /** Creation timestamp. */
  createdAt?: string;
  /** Start timestamp. */
  startedAt?: string;
  /** Completion timestamp. */
  completedAt?: string;
  /** Error message if failed. */
  error?: string;
  /** Total cost in ticks. */
  costTicks: number;
  /** Number of steps executed. */
  totalSteps: number;
  /** Session ID. */
  sessionId?: string;
  /** Final result text. */
  result?: string;
  /** Tasks within the mission. */
  tasks: MissionTask[];
  /** Whether the mission was approved. */
  approved: boolean;
  /** Commit SHA (if approved). */
  commitSha?: string;
}

/** Response from listing missions. */
export interface MissionListResponse {
  /** List of missions. */
  missions: MissionDetail[];
}

/** Token usage for a mission chat response. */
export interface MissionChatUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Response from chatting with the architect. */
export interface MissionChatResponse {
  /** Mission identifier. */
  missionId?: string;
  /** Architect's response content. */
  content?: string;
  /** Model used. */
  model?: string;
  /** Cost in ticks. */
  costTicks: number;
  /** Token usage. */
  usage?: MissionChatUsage;
}

/** A git checkpoint within a mission. */
export interface MissionCheckpoint {
  /** Checkpoint identifier. */
  id?: string;
  /** Commit SHA. */
  commitSha?: string;
  /** Checkpoint message. */
  message?: string;
  /** Creation timestamp. */
  createdAt?: string;
}

/** Response from listing checkpoints. */
export interface MissionCheckpointsResponse {
  missionId?: string;
  checkpoints: MissionCheckpoint[];
}

/** Generic status response for mission operations. */
export interface MissionStatusResponse {
  missionId?: string;
  status?: string;
  confirmed?: boolean;
  approved?: boolean;
  deleted?: boolean;
  updated?: boolean;
  commitSha?: string;
}

// ── Wire format helpers ──────────────────────────────────────────

/** @internal */
function createReqToWire(req: MissionCreateRequest): Record<string, unknown> {
  const out: Record<string, unknown> = { goal: req.goal };
  if (req.strategy !== undefined) out.strategy = req.strategy;
  if (req.conductorModel !== undefined) out.conductor_model = req.conductorModel;
  if (req.workers !== undefined) out.workers = req.workers;
  if (req.maxSteps !== undefined) out.max_steps = req.maxSteps;
  if (req.systemPrompt !== undefined) out.system_prompt = req.systemPrompt;
  if (req.sessionId !== undefined) out.session_id = req.sessionId;
  return out;
}

/** @internal */
function chatReqToWire(req: MissionChatRequest): Record<string, unknown> {
  const out: Record<string, unknown> = { message: req.message };
  if (req.stream !== undefined) out.stream = req.stream;
  return out;
}

/** @internal */
function planUpdateToWire(req: MissionPlanUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (req.tasks !== undefined) out.tasks = req.tasks;
  if (req.workers !== undefined) out.workers = req.workers;
  if (req.systemPrompt !== undefined) out.system_prompt = req.systemPrompt;
  if (req.maxSteps !== undefined) out.max_steps = req.maxSteps;
  if (req.context !== undefined) out.context = req.context;
  return out;
}

/** @internal */
function approveReqToWire(req: MissionApproveRequest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (req.commitSha !== undefined) out.commit_sha = req.commitSha;
  if (req.comment !== undefined) out.comment = req.comment;
  return out;
}

/** @internal */
function importReqToWire(req: MissionImportRequest): Record<string, unknown> {
  const out: Record<string, unknown> = { goal: req.goal, tasks: req.tasks };
  if (req.strategy !== undefined) out.strategy = req.strategy;
  if (req.conductorModel !== undefined) out.conductor_model = req.conductorModel;
  if (req.workers !== undefined) out.workers = req.workers;
  if (req.systemPrompt !== undefined) out.system_prompt = req.systemPrompt;
  if (req.maxSteps !== undefined) out.max_steps = req.maxSteps;
  if (req.autoExecute !== undefined) out.auto_execute = req.autoExecute;
  return out;
}

/** @internal */
function taskFromWire(raw: Record<string, unknown>): MissionTask {
  return {
    id: raw.id as string | undefined,
    name: raw.name as string | undefined,
    description: raw.description as string | undefined,
    worker: raw.worker as string | undefined,
    model: raw.model as string | undefined,
    status: raw.status as string | undefined,
    result: raw.result as string | undefined,
    error: raw.error as string | undefined,
    step: (raw.step as number) ?? 0,
    tokensIn: (raw.tokens_in as number) ?? 0,
    tokensOut: (raw.tokens_out as number) ?? 0,
  };
}

/** @internal */
function detailFromWire(raw: Record<string, unknown>): MissionDetail {
  const tasks = (raw.tasks as Record<string, unknown>[] ?? []).map(taskFromWire);
  return {
    id: raw.id as string | undefined,
    userId: raw.user_id as string | undefined,
    goal: raw.goal as string | undefined,
    strategy: raw.strategy as string | undefined,
    conductorModel: raw.conductor_model as string | undefined,
    status: raw.status as string | undefined,
    createdAt: raw.created_at as string | undefined,
    startedAt: raw.started_at as string | undefined,
    completedAt: raw.completed_at as string | undefined,
    error: raw.error as string | undefined,
    costTicks: (raw.cost_ticks as number) ?? 0,
    totalSteps: (raw.total_steps as number) ?? 0,
    sessionId: raw.session_id as string | undefined,
    result: raw.result as string | undefined,
    tasks,
    approved: (raw.approved as boolean) ?? false,
    commitSha: raw.commit_sha as string | undefined,
  };
}

/** @internal */
function createRespFromWire(raw: Record<string, unknown>): MissionCreateResponse {
  return {
    missionId: (raw.mission_id as string) ?? "",
    status: (raw.status as string) ?? "",
    sessionId: raw.session_id as string | undefined,
    conductorModel: raw.conductor_model as string | undefined,
    strategy: raw.strategy as string | undefined,
    workers: raw.workers as Record<string, MissionWorkerConfig> | undefined,
    createdAt: raw.created_at as string | undefined,
    requestId: raw.request_id as string | undefined,
  };
}

/** @internal */
function chatRespFromWire(raw: Record<string, unknown>): MissionChatResponse {
  let usage: MissionChatUsage | undefined;
  if (raw.usage) {
    const u = raw.usage as Record<string, unknown>;
    usage = {
      inputTokens: (u.input_tokens as number) ?? 0,
      outputTokens: (u.output_tokens as number) ?? 0,
    };
  }
  return {
    missionId: raw.mission_id as string | undefined,
    content: raw.content as string | undefined,
    model: raw.model as string | undefined,
    costTicks: (raw.cost_ticks as number) ?? 0,
    usage,
  };
}

/** @internal */
function statusRespFromWire(raw: Record<string, unknown>): MissionStatusResponse {
  return {
    missionId: raw.mission_id as string | undefined,
    status: raw.status as string | undefined,
    confirmed: raw.confirmed as boolean | undefined,
    approved: raw.approved as boolean | undefined,
    deleted: raw.deleted as boolean | undefined,
    updated: raw.updated as boolean | undefined,
    commitSha: raw.commit_sha as string | undefined,
  };
}

/** @internal */
function checkpointFromWire(raw: Record<string, unknown>): MissionCheckpoint {
  return {
    id: raw.id as string | undefined,
    commitSha: raw.commit_sha as string | undefined,
    message: raw.message as string | undefined,
    createdAt: raw.created_at as string | undefined,
  };
}

// ── Client methods ───────────────────────────────────────────────

/**
 * Create and execute a mission asynchronously.
 * @internal
 */
export async function missionCreate(
  client: QuantumClient,
  req: MissionCreateRequest,
): Promise<MissionCreateResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/missions/create",
    createReqToWire(req),
  );
  return createRespFromWire(data);
}

/**
 * List missions for the authenticated user.
 * @internal
 */
export async function missionList(
  client: QuantumClient,
  status?: string,
): Promise<MissionListResponse> {
  const path = status
    ? `/qai/v1/missions/list?status=${encodeURIComponent(status)}`
    : "/qai/v1/missions/list";
  const { data } = await client._doJSON<Record<string, unknown>>(
    "GET",
    path,
    undefined,
  );
  const missions = (data.missions as Record<string, unknown>[] ?? []).map(detailFromWire);
  return { missions };
}

/**
 * Get mission details including tasks.
 * @internal
 */
export async function missionGet(
  client: QuantumClient,
  missionId: string,
): Promise<MissionDetail> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "GET",
    `/qai/v1/missions/${encodeURIComponent(missionId)}`,
    undefined,
  );
  return detailFromWire(data);
}

/**
 * Delete a mission.
 * @internal
 */
export async function missionDelete(
  client: QuantumClient,
  missionId: string,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "DELETE",
    `/qai/v1/missions/${encodeURIComponent(missionId)}`,
    undefined,
  );
  return statusRespFromWire(data);
}

/**
 * Cancel a running mission.
 * @internal
 */
export async function missionCancel(
  client: QuantumClient,
  missionId: string,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/cancel`,
    undefined,
  );
  return statusRespFromWire(data);
}

/**
 * Pause a running mission.
 * @internal
 */
export async function missionPause(
  client: QuantumClient,
  missionId: string,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/pause`,
    undefined,
  );
  return statusRespFromWire(data);
}

/**
 * Resume a paused mission.
 * @internal
 */
export async function missionResume(
  client: QuantumClient,
  missionId: string,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/resume`,
    undefined,
  );
  return statusRespFromWire(data);
}

/**
 * Chat with the mission's architect.
 * @internal
 */
export async function missionChat(
  client: QuantumClient,
  missionId: string,
  req: MissionChatRequest,
): Promise<MissionChatResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/chat`,
    chatReqToWire(req),
  );
  return chatRespFromWire(data);
}

/**
 * Retry a failed task.
 * @internal
 */
export async function missionRetryTask(
  client: QuantumClient,
  missionId: string,
  taskId: string,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/retry/${encodeURIComponent(taskId)}`,
    undefined,
  );
  return statusRespFromWire(data);
}

/**
 * Approve a completed mission.
 * @internal
 */
export async function missionApprove(
  client: QuantumClient,
  missionId: string,
  req: MissionApproveRequest,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/approve`,
    approveReqToWire(req),
  );
  return statusRespFromWire(data);
}

/**
 * Update the mission plan.
 * @internal
 */
export async function missionUpdatePlan(
  client: QuantumClient,
  missionId: string,
  req: MissionPlanUpdate,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "PUT",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/plan`,
    planUpdateToWire(req),
  );
  return statusRespFromWire(data);
}

/**
 * Confirm or reject the proposed execution structure.
 * @internal
 */
export async function missionConfirmStructure(
  client: QuantumClient,
  missionId: string,
  req: MissionConfirmStructure,
): Promise<MissionStatusResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/confirm-structure`,
    req,
  );
  return statusRespFromWire(data);
}

/**
 * List git checkpoints for a mission.
 * @internal
 */
export async function missionCheckpoints(
  client: QuantumClient,
  missionId: string,
): Promise<MissionCheckpointsResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "GET",
    `/qai/v1/missions/${encodeURIComponent(missionId)}/checkpoints`,
    undefined,
  );
  const checkpoints = (data.checkpoints as Record<string, unknown>[] ?? []).map(checkpointFromWire);
  return {
    missionId: data.mission_id as string | undefined,
    checkpoints,
  };
}

/**
 * Import an existing plan as a new mission.
 * @internal
 */
export async function missionImport(
  client: QuantumClient,
  req: MissionImportRequest,
): Promise<MissionCreateResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/missions/import",
    importReqToWire(req),
  );
  return createRespFromWire(data);
}
