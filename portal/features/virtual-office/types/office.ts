export type AgentCode = 'A01' | 'B02' | 'B03' | 'D01' | 'D02' | 'E01';

export type AgentVisualState =
  | 'idle'
  | 'working'
  | 'waiting_human'
  | 'reviewing'
  | 'reworking'
  | 'success'
  | 'error'
  | 'rejected';

export type AgentEmotion =
  | 'neutral'
  | 'focused'
  | 'thinking'
  | 'happy'
  | 'concerned'
  | 'urgent';

export interface AgentTaskItem {
  id: string;
  title: string;
  status: 'done' | 'in_progress' | 'waiting_human' | 'error';
  completedAt?: string;
  category?: string;
}

export interface AgentTokenStats {
  model: string;
  tier: string;
  budgetUSD: number;
  totalTokensUsed: number;
  maxTokenQuota: number;
  tokensIn: number;
  tokensOut: number;
  remainingPercent: number;
  usedPercent: number;
}

export interface OfficeAgent {
  code: AgentCode;
  displayName: string;
  role: string;
  fullDesc: string;
  zoneName: string;
  position: [number, number, number];
  rotation: [number, number, number];
  visualState: AgentVisualState;
  emotion: AgentEmotion;
  tokenStats: AgentTokenStats;
  currentTask?: {
    id?: string;
    title: string;
    summary?: string;
    contentItemId?: string;
    time?: string;
  };
  recentTasks: AgentTaskItem[];
  requiresHumanAction: boolean;
  actionPrompt?: string;
  ctaText?: string;
  ctaHref?: string;
  updatedAt?: string;
}

export interface OfficeSummary {
  workingCount: number;
  waitingForCeoCount: number;
  totalAgents: number;
}
