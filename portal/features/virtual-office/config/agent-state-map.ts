/**
 * agent-state-map.ts
 * SINGLE SOURCE OF TRUTH for all agent visual state presentation.
 */
import { AgentVisualState } from '../types/office';

export interface AgentStatePresentation {
  state: AgentVisualState;
  labelVi: string;
  descVi: string;
  labelEn: string;
  dotColor: string;
  allowLargeBubble: boolean;
  attentionPriority: number;
  requiresHuman: boolean;
  emoji: string;
}

export const AGENT_STATE_MAP: Record<AgentVisualState, AgentStatePresentation> = {
  idle: {
    state: 'idle', labelVi: 'Rảnh', descVi: 'Đang nghỉ, sẵn sàng nhận nhiệm vụ mới.',
    labelEn: 'idle', dotColor: '#71717a', allowLargeBubble: false, attentionPriority: 99, requiresHuman: false, emoji: '⚪',
  },
  working: {
    state: 'working', labelVi: 'Đang làm', descVi: 'Đang xử lý nhiệm vụ.',
    labelEn: 'working', dotColor: '#10b981', allowLargeBubble: false, attentionPriority: 80, requiresHuman: false, emoji: '🟢',
  },
  waiting_human: {
    state: 'waiting_human', labelVi: 'Chờ bạn', descVi: 'Cần bạn xem và hành động.',
    labelEn: 'waiting_human', dotColor: '#f59e0b', allowLargeBubble: true, attentionPriority: 1, requiresHuman: true, emoji: '🟡',
  },
  reviewing: {
    state: 'reviewing', labelVi: 'Đang kiểm tra', descVi: 'Đang thẩm định và kiểm tra chất lượng.',
    labelEn: 'reviewing', dotColor: '#818cf8', allowLargeBubble: false, attentionPriority: 70, requiresHuman: false, emoji: '🔵',
  },
  reworking: {
    state: 'reworking', labelVi: 'Đang làm lại', descVi: 'Đang chỉnh sửa lại theo phản hồi.',
    labelEn: 'reworking', dotColor: '#fb923c', allowLargeBubble: false, attentionPriority: 60, requiresHuman: false, emoji: '🟠',
  },
  success: {
    state: 'success', labelVi: 'Hoàn thành', descVi: 'Đã hoàn tất nhiệm vụ thành công.',
    labelEn: 'success', dotColor: '#D4FF00', allowLargeBubble: true, attentionPriority: 50, requiresHuman: false, emoji: '✅',
  },
  error: {
    state: 'error', labelVi: 'Có lỗi', descVi: 'Gặp sự cố, cần bạn kiểm tra.',
    labelEn: 'error', dotColor: '#ef4444', allowLargeBubble: true, attentionPriority: 2, requiresHuman: true, emoji: '🔴',
  },
  rejected: {
    state: 'rejected', labelVi: 'Đã từ chối', descVi: 'Nhiệm vụ bị từ chối, đang chờ xử lý.',
    labelEn: 'rejected', dotColor: '#f87171', allowLargeBubble: true, attentionPriority: 10, requiresHuman: true, emoji: '⛔',
  },
};

export function getStatePresentation(state: AgentVisualState): AgentStatePresentation {
  return AGENT_STATE_MAP[state] ?? AGENT_STATE_MAP['idle'];
}

export function allowsAttentionBubble(state: AgentVisualState, requiresHumanAction: boolean): boolean {
  if (requiresHumanAction) return true;
  return AGENT_STATE_MAP[state]?.allowLargeBubble ?? false;
}
