// ─── SPEC-0003: Client Portal MVP — Type Definitions ───────────────────────
// Types tuân thủ theo CrewLab MVP-Scope v3.5, FSM states, and 6-agent pipeline.

// ─── FSM States ─────────────────────────────────────────────────────────────
export type FSMState =
  | 'planned'
  | 'ready_for_generation'
  | 'caption_generating'
  | 'visual_matching'
  | 'waiting_asset'
  | 'asset_blocked'
  | 'evaluating'
  | 'eval_failed'
  | 'pending_content_approval'
  | 'approved_ready_to_post'
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
  assetRequestId: string | null;
  rejectionReason?: RejectionReason;
  rejectionFeedback?: string;
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
  | 'asset_request_created'
  | 'content_ready_for_approval'
  | 'strategy_ready_for_approval'
  | 'asset_submitted'
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
  assetRequestId: string | null;
  notes?: string;
}

// ─── Asset Requests (from D02) ───────────────────────────────────────────────
export interface AssetRequest {
  id: string;
  contentItemId: string;
  shotList: string[];
  deadline: Date;
  exampleImageUrl: string | null;
  status: 'pending' | 'submitted' | 'approved';
  submittedAssetIds: string[];
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
  waiting_asset: 'Chờ ảnh thật',
  asset_blocked: 'Ảnh bị chặn',
  evaluating: 'AI đang thẩm định',
  eval_failed: 'Thẩm định lại',
  pending_content_approval: 'Chờ bạn duyệt',
  approved_ready_to_post: 'Đã duyệt — Chờ đăng',
  posted: 'Đã đăng',
};
