// ─── SPEC-0003: Client Portal MVP — Type Definitions ───────────────────────
// Types tuân thủ theo CrewLab MVP-Scope v3.5, FSM states, and 6-agent pipeline.

// ─── FSM States ─────────────────────────────────────────────────────────────
export type FSMState =
  | 'planned'
  | 'ready_for_generation'
  | 'caption_generating'
  | 'visual_matching'
  | 'evaluating'
  | 'eval_failed'
  | 'pending_content_approval'
  | 'approved_ready_to_post'
  | 'rejected'
  | 'posted';

// ─── Agents ─────────────────────────────────────────────────────────────────
export type AgentCode = 'A01' | 'B02' | 'B03' | 'D01' | 'D02' | 'E01' | 'HUMAN';
export type TeamDesk = 'strategy' | 'creative' | 'qa';
export type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'done';

export interface Agent {
  code: AgentCode;
  name: string;
  desk: TeamDesk;
  icon: string; // emoji
  description: string;
}

// ─── Task Cards (Kanban) ─────────────────────────────────────────────────────
export type TaskAssigneeType = 'agent' | 'human';

export type RejectionReason =
  | 'tone_wrong'
  | 'info_incorrect'
  | 'visual_poor'
  | 'wrong_asset'
  | 'off_brand'
  | 'bad_timing'
  | 'other';

export interface TaskCard {
  id: string;
  title: string;
  assigneeType: TaskAssigneeType;
  assigneeCode: AgentCode;
  desk: TeamDesk;
  column: KanbanColumn;
  linkedContentItemId: string | null;
  retryCount: number;
  hasError: boolean;
  errorMessage?: string;
  errorCode?: string;
  errorProvider?: string;
  providerRequestId?: string;
  errorRetryable?: boolean;
  slaDeadline: Date | null; // null = no SLA
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

// ─── Content Items ───────────────────────────────────────────────────────────
export interface ContentItem {
  id: string;
  title: string;
  platform: 'fb' | 'ig' | 'both';
  caption: string;
  clientEditedCaption?: string;
  imageUrl: string | null;
  publishTime: Date;
  state: FSMState;
  pillarId: string;
  weekNumber: number;
  needsRealPhoto: boolean;
  rejectionReason?: RejectionReason;
  rejectionFeedback?: string;
  imageProvenance?: {
    sourceAssetId?: string | null;
    derivativeAssetId?: string | null;
    generationMode?: string | null;
    selectionRationale?: string | null;
    selectionScore?: number | null;
  };
}

// ─── Pillar & Angle (Gate S2 - B02) ─────────────────────────────────────────
export interface ContentAngle {
  id: string;
  label: string;
}

export interface ContentPillar {
  id: string;
  label: string;
  emoji: string;
  description: string;
  percentage: number; // 0-100, total must = 100
  fbRatio: number; // % of this pillar going to Facebook
  igRatio: number; // % going to Instagram
  angles: ContentAngle[];
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType =
  | 'content_ready_for_approval'
  | 'strategy_ready_for_approval'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  actionUrl: string | null; // route to redirect when clicked
  linkedContentItemId: string | null;
}

// ─── Media Assets ────────────────────────────────────────────────────────────
export type AssetSource = 'ai_generated' | 'real_photo' | 'pending_review';

export interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl: string;
  source: AssetSource;
  tags: string[];
  uploadedAt: Date;
  usedInItems: string[]; // content item IDs
  notes?: string;
  indexingStatus?: 'processing' | 'ready' | 'needs_attention' | 'failed' | 'superseded';
  indexingReason?: string | null;
  readyForD02?: boolean;
}

// ─── Brand Voice (6 Structured Sections) ──────────────────────────────────────
export interface BrandVoiceConfig {
  // 1. Brand Foundation
  brandName: string;
  category: string;
  tagline: string;
  mission: string;
  targetAudience: string;

  // 2. Tone & Personality
  personalityKeywords: string[]; // 3-5 tính từ
  archetype: string;
  formalityScore: number; // 1-10

  // 3. Do's & Don'ts
  goodCaptionExample: string;
  badCaptionExample: string;
  forbiddenWords: string[];
  signatureWords: string[];

  // 4. Language Mechanics
  brandPronoun: string;
  customerPronoun: string;
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  sentenceStyle: string;
  languageMixing: string;

  // 5. Context Variations
  facebookTone: string;
  zaloTone: string;
  websiteTone: string;
  promotionalTone: string;
  customerServiceTone: string;

  // 6. Reference Examples
  benchmarkCaptions: string[];
  referenceLinks: string[];
}


// ─── Model & Budget Config ───────────────────────────────────────────────────
export type ModelTier = 'fast' | 'standard' | 'power';

export interface AgentModelConfig {
  agentCode: AgentCode;
  selectedModel: string;
  tier: ModelTier;
  budgetUSD: number; // per month
  isActive?: boolean;
}

export interface A01ChatMessage {
  id: string;
  user_message: string;
  assistant_message: string;
  action: 'answer' | 'create_content';
  content_item_id: string | null;
  dispatch_status: 'not_needed' | 'queued' | 'pending';
  created_at: string;
}

export interface EligibleModel {
  id: string;
  label: string;
  tier: ModelTier;
  capabilities: string[];
  eligible_agents: string[];
}

export type PortalLoadArea = 'bootstrap' | 'assets' | 'settings';
export type PortalLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PortalLoadError {
  area: PortalLoadArea;
  message: string;
  supportReference: string | null;
  retryable: boolean;
  status: number | null;
  errorCode: string | null;
}

export interface PortalBootstrapPayload {
  viewer: {
    user_id: string;
    email: string | null;
    role: string;
  };
  client: {
    id: string;
    brand_name: string;
  };
  work_board: {
    content_items: any[];
    task_logs: any[];
    pillars: any[];
    schedule: {
      cycle_id: string | null;
      phase: string | null;
    };
  };
}

// ─── Content Plan (Calendar) ─────────────────────────────────────────────────
export interface ContentPlanWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  items: ContentItem[];
  approved: boolean; // Gate S3 approved
}

// ─── Rejection reasons display labels ────────────────────────────────────────
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  tone_wrong: 'Sai tông giọng',
  info_incorrect: 'Thông tin không chính xác',
  visual_poor: 'Ảnh chưa đẹp / chưa phù hợp',
  wrong_asset: 'Dùng sai ảnh',
  off_brand: 'Lệch nhận diện thương hiệu',
  bad_timing: 'Thời điểm đăng không phù hợp',
  other: 'Lý do khác',
};

// ─── FSM state display ───────────────────────────────────────────────────────
export const FSM_STATE_LABELS: Record<FSMState, string> = {
  planned: 'Đã lên kế hoạch',
  ready_for_generation: 'Sẵn sàng tạo nội dung',
  caption_generating: 'Đang viết caption',
  visual_matching: 'Đang xử lý hình ảnh',
  evaluating: 'AI đang thẩm định',
  eval_failed: 'Thẩm định lại',
  pending_content_approval: 'Chờ bạn duyệt',
  approved_ready_to_post: 'Đã duyệt — Chờ đăng',
  rejected: 'Đã từ chối',
  posted: 'Đã đăng',
};
