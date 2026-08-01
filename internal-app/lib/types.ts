// ─── Internal App TypeScript Types ───────────────────────────────────────────
// Types for Agency Admin operations — aligned with MVP Scope §2j

// ─── FSM States (from MVP-Scope §3) ─────────────────────────────────────────
export type ContentState =
  | 'planned'
  | 'ready_for_generation'
  | 'caption_generating'
  | 'visual_matching'
  | 'waiting_asset'
  | 'asset_blocked'
  | 'visual_generating'
  | 'evaluating'
  | 'eval_failed'
  | 'pending_content_approval'
  | 'approved_ready_to_post'
  | 'posted'
  | 'rejected'
  | 'archived';

export type AgentCode = 'A01' | 'B02' | 'B03' | 'D01' | 'D02' | 'E01';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';
export type ClientStatus = 'active' | 'paused' | 'offboarded';
export type Platform = 'fb' | 'ig' | 'both';

// ─── Agent ───────────────────────────────────────────────────────────────────
export interface AgentInfo {
  code: AgentCode;
  name: string;
  role: string;
  status: AgentStatus;
  lastRun: string;
  icon: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  vertical: string;
  status: ClientStatus;
  onboardedAt: Date;
  contentItemCount: number;
  activeTaskCount: number;
  hasError: boolean;
  hasPendingApproval: boolean;
  platforms: Platform[];
  budgetTotal: number;
  budgetUsed: number;
}

// ─── Content Item (Admin view — includes eval_score) ─────────────────────────
export interface ContentItemAdmin {
  id: string;
  clientId: string;
  title: string;
  platform: Platform;
  state: ContentState;
  caption: string | null;
  imageUrl: string | null;
  publishTime: Date | null;
  pillarLabel: string;
  weekNumber: number;
  retryCount: number;
  evalScoreCaption: number | null;
  evalScoreVisual: number | null;
  evalFeedback: string | null;
  failedCriteria: string[];
  currentAgent: AgentCode | null;
  needsRealPhoto: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Task Log Entry (§1d Observability) ──────────────────────────────────────
export interface TaskLogEntry {
  id: string;
  clientId: string;
  clientName: string;
  agentCode: AgentCode;
  taskType: string;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status: 'success' | 'failed' | 'running';
  evalScore: number | null;
  wakeReason: 'scheduled' | 'task_assigned' | 'manual' | 'retry';
  contentItemId: string | null;
  contentItemTitle: string | null;
  createdAt: Date;
}

// ─── Debug View — Retry History ──────────────────────────────────────────────
export interface RetryHistoryEntry {
  attempt: number;
  agentCode: AgentCode;
  action: string;
  evalScore: number | null;
  result: 'pass' | 'fail' | 'pending';
  failedCriteria: string[];
  timestamp: Date;
}

// ─── Debug View — LLM Usage ─────────────────────────────────────────────────
export interface LLMUsageEntry {
  agentCode: AgentCode;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  timestamp: Date;
}

// ─── Eval Criteria Breakdown ─────────────────────────────────────────────────
export interface EvalCriterion {
  name: string;
  label: string;
  score: number;
  maxScore: number;
  passed: boolean;
}

// ─── Client Health Badge ─────────────────────────────────────────────────────
export type ClientHealthBadge = 'ok' | 'pending' | 'error';

export function getClientHealthBadge(client: Client): ClientHealthBadge {
  if (client.hasError) return 'error';
  if (client.hasPendingApproval) return 'pending';
  return 'ok';
}

// ─── State display helpers ───────────────────────────────────────────────────
export const STATE_LABELS: Record<ContentState, string> = {
  planned: 'Đã lên kế hoạch',
  ready_for_generation: 'Sẵn sàng tạo',
  caption_generating: 'Đang viết caption',
  visual_matching: 'Đang ghép ảnh',
  waiting_asset: 'Chờ ảnh thật',
  asset_blocked: 'Ảnh bị chặn',
  visual_generating: 'Đang tạo ảnh',
  evaluating: 'Đang thẩm định',
  eval_failed: 'Thẩm định thất bại',
  pending_content_approval: 'Chờ duyệt nội dung',
  approved_ready_to_post: 'Đã duyệt — chờ đăng',
  posted: 'Đã đăng',
  rejected: 'Từ chối',
  archived: 'Lưu trữ',
};

export const STATE_COLORS: Record<ContentState, { bg: string; text: string; border: string }> = {
  planned: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  ready_for_generation: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  caption_generating: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  visual_matching: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  waiting_asset: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  asset_blocked: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  visual_generating: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  evaluating: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  eval_failed: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  pending_content_approval: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  approved_ready_to_post: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  posted: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-600/30' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-600', border: 'border-zinc-700/30' },
};
