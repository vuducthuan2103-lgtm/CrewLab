import { create } from 'zustand';
import { AgentCode, AgentVisualState, OfficeAgent, OfficeSummary } from '../types/office';
import { INITIAL_OFFICE_AGENTS } from '../config/office-layout';

export interface AttentionItem {
  agentCode: AgentCode;
  agentName: string;
  agentRole: string;
  actionPrompt: string;
  taskTitle: string;
  urgency: 'high' | 'medium';
  waitingSince: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  agentCode: AgentCode;
  agentName: string;
  title: string;
  description: string;
  type: 'working' | 'success' | 'review' | 'human_action' | 'handoff';
}

interface OfficeState {
  agents: Record<string, OfficeAgent>;
  selectedAgentCode: AgentCode | null;
  hoveredAgentCode: AgentCode | null;
  nearbyAgentCode: AgentCode | null; // Triggered when CEO walks near an agent
  dismissedNearbyAgentCode: AgentCode | null; // Agent whose proximity tab was manually closed by CEO
  autoWalkTargetAgentCode: AgentCode | null; // Target agent CEO is walking to
  isDetailOpen: boolean;
  isAccessibleRosterOpen: boolean;
  isAttentionQueueOpen: boolean;
  isActivityFeedOpen: boolean;
  activeZoneFilter: string | null;
  activeTab: '3d_office' | 'dossier';
  timeOfDay: 'day' | 'night';
  ceoPosition: [number, number, number];
  isStandUpModalOpen: boolean;
  isCelebrationActive: boolean;
  activeHandoff: {
    from: AgentCode;
    to: AgentCode;
    title: string;
  } | null;

  // Actions
  setCeoPosition: (pos: [number, number, number]) => void;
  setStandUpModalOpen: (open: boolean) => void;
  triggerCelebration: () => void;
  triggerTaskHandoff: (from: AgentCode, to: AgentCode, title: string) => void;
  clearTaskHandoff: () => void;
  selectAgent: (code: AgentCode | null) => void;
  closeDetail: () => void;
  setHoveredAgent: (code: AgentCode | null) => void;
  setNearbyAgentCode: (code: AgentCode | null) => void;
  dismissNearbyHUD: (code: AgentCode) => void;
  clearDismissedNearby: () => void;
  startAutoWalk: (code: AgentCode) => void;
  cancelAutoWalk: () => void;
  setAccessibleRosterOpen: (open: boolean) => void;
  setAttentionQueueOpen: (open: boolean) => void;
  setActivityFeedOpen: (open: boolean) => void;
  setActiveZoneFilter: (zone: string | null) => void;
  setActiveTab: (tab: '3d_office' | 'dossier') => void;
  setTimeOfDay: (time: 'day' | 'night') => void;
  toggleTimeOfDay: () => void;
  updateAgentVisualState: (
    code: AgentCode,
    state: AgentVisualState,
    requiresHuman?: boolean,
    actionPrompt?: string
  ) => void;
  mockSwitchA01State: (state: AgentVisualState) => void;

  // Selectors
  getSummary: () => OfficeSummary;
  getAttentionQueueItems: () => AttentionItem[];
  getActivityFeedEvents: () => ActivityEvent[];
}

export const useOfficeStore = create<OfficeState>((set, get) => ({
  agents: INITIAL_OFFICE_AGENTS,
  selectedAgentCode: null,
  hoveredAgentCode: null,
  nearbyAgentCode: null,
  dismissedNearbyAgentCode: null,
  autoWalkTargetAgentCode: null,
  isDetailOpen: false,
  isAccessibleRosterOpen: false,
  isAttentionQueueOpen: false,
  isActivityFeedOpen: false,
  activeZoneFilter: null,
  activeTab: '3d_office',
  timeOfDay: 'night', // default night warm cozy aesthetic, toggleable to day
  ceoPosition: [0, 0.75, 1.2],
  isStandUpModalOpen: false,
  isCelebrationActive: false,
  activeHandoff: null,

  setCeoPosition: (pos) => set({ ceoPosition: pos }),
  setStandUpModalOpen: (open) => set({ isStandUpModalOpen: open }),
  triggerCelebration: () => {
    set({ isCelebrationActive: true });
    setTimeout(() => {
      set({ isCelebrationActive: false });
    }, 4500);
  },
  triggerTaskHandoff: (from, to, title) => {
    set({ activeHandoff: { from, to, title } });
    setTimeout(() => {
      get().clearTaskHandoff();
    }, 3800);
  },
  clearTaskHandoff: () => set({ activeHandoff: null }),

  setTimeOfDay: (time) => set({ timeOfDay: time }),
  toggleTimeOfDay: () => set((state) => ({ timeOfDay: state.timeOfDay === 'day' ? 'night' : 'day' })),

  selectAgent: (code) =>
    set({
      selectedAgentCode: code,
      isDetailOpen: code !== null,
      isAttentionQueueOpen: false,
    }),

  closeDetail: () =>
    set({
      selectedAgentCode: null,
      isDetailOpen: false,
    }),

  setHoveredAgent: (code) =>
    set({
      hoveredAgentCode: code,
    }),

  setNearbyAgentCode: (code) => {
    if (code !== null && code === get().dismissedNearbyAgentCode) {
      return; // Do not auto-reopen if dismissed while still standing near
    }
    set({
      nearbyAgentCode: code,
    });
  },

  dismissNearbyHUD: (code) =>
    set({
      dismissedNearbyAgentCode: code,
      nearbyAgentCode: null,
    }),

  clearDismissedNearby: () =>
    set({
      dismissedNearbyAgentCode: null,
    }),

  startAutoWalk: (code) =>
    set({
      autoWalkTargetAgentCode: code,
      activeTab: '3d_office',
      isAttentionQueueOpen: false,
      isAccessibleRosterOpen: false,
      isActivityFeedOpen: false,
      isDetailOpen: false,
    }),

  cancelAutoWalk: () =>
    set({
      autoWalkTargetAgentCode: null,
    }),

  setAccessibleRosterOpen: (open) =>
    set({
      isAccessibleRosterOpen: open,
      isAttentionQueueOpen: open ? false : get().isAttentionQueueOpen,
      isActivityFeedOpen: open ? false : get().isActivityFeedOpen,
    }),

  setAttentionQueueOpen: (open) =>
    set({
      isAttentionQueueOpen: open,
      isAccessibleRosterOpen: open ? false : get().isAccessibleRosterOpen,
      isActivityFeedOpen: open ? false : get().isActivityFeedOpen,
    }),

  setActivityFeedOpen: (open) =>
    set({
      isActivityFeedOpen: open,
      isAttentionQueueOpen: open ? false : get().isAttentionQueueOpen,
      isAccessibleRosterOpen: open ? false : get().isAccessibleRosterOpen,
    }),

  setActiveZoneFilter: (zone) =>
    set({
      activeZoneFilter: zone,
    }),

  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      isDetailOpen: false,
    }),

  updateAgentVisualState: (code, state, requiresHuman = false, actionPrompt) =>
    set((prev) => {
      const current = prev.agents[code];
      if (!current) return prev;
      return {
        agents: {
          ...prev.agents,
          [code]: {
            ...current,
            visualState: state,
            requiresHumanAction: requiresHuman,
            actionPrompt: actionPrompt ?? current.actionPrompt,
          },
        },
      };
    }),

  mockSwitchA01State: (state) =>
    set((prev) => {
      const a01 = prev.agents['A01'];
      if (!a01) return prev;

      let emotion: OfficeAgent['emotion'] = 'focused';
      let requiresHuman = false;
      let prompt = 'A01 đang điều phối tự động các Agent chuyên trách.';
      let taskTitle = a01.currentTask?.title || 'Điều phối Content';

      if (state === 'waiting_human') {
        emotion = 'urgent';
        requiresHuman = true;
        prompt = 'A01 cần CEO duyệt phân bổ ngân sách chiến dịch tuần này.';
        taskTitle = 'Chờ CEO duyệt Phân bổ Ngân sách';
      } else if (state === 'idle') {
        emotion = 'neutral';
        prompt = 'A01 đang rà soát hệ thống và chờ chu kỳ lên lịch kế tiếp.';
        taskTitle = 'Nghỉ giữa chu kỳ chiến dịch';
      } else if (state === 'success') {
        emotion = 'happy';
        prompt = 'A01 đã hoàn thành phê duyệt tất cả 7 bài viết trong tuần!';
        taskTitle = 'Hoàn tất xuất bản tuần 34';
      } else if (state === 'error') {
        emotion = 'concerned';
        requiresHuman = true;
        prompt = 'A01 phát hiện bài viết bị từ chối vượt ngưỡng 3 lần, cần CEO xử lý.';
        taskTitle = 'Cảnh báo: Kiểm duyệt chưa đạt yêu cầu';
      }

      return {
        agents: {
          ...prev.agents,
          A01: {
            ...a01,
            visualState: state,
            emotion,
            requiresHumanAction: requiresHuman,
            actionPrompt: prompt,
            currentTask: {
              ...a01.currentTask,
              title: taskTitle,
            },
            updatedAt: 'Vừa cập nhật',
          },
        },
      };
    }),

  getSummary: () => {
    const agents = Object.values(get().agents);
    return {
      workingCount: agents.filter((a) => a.visualState === 'working' || a.visualState === 'reviewing').length,
      waitingForCeoCount: agents.filter((a) => a.requiresHumanAction || a.visualState === 'waiting_human' || a.visualState === 'error').length,
      totalAgents: agents.length,
    };
  },

  getAttentionQueueItems: () => {
    const agents = Object.values(get().agents);
    const items: AttentionItem[] = [];

    for (const a of agents) {
      if (a.requiresHumanAction || a.visualState === 'waiting_human' || a.visualState === 'error' || a.visualState === 'rejected') {
        items.push({
          agentCode: a.code,
          agentName: a.displayName,
          agentRole: a.role,
          actionPrompt: a.actionPrompt || 'Cần bạn xem qua và xác nhận.',
          taskTitle: a.currentTask?.title || 'Nhiệm vụ đang chờ duyệt',
          urgency: a.visualState === 'error' ? 'high' : 'medium',
          waitingSince: '5 phút trước',
        });
      }
    }

    // Sort urgent/high first, then medium
    return items.sort((a, b) => (a.urgency === 'high' ? -1 : 1));
  },

  getActivityFeedEvents: () => [
    {
      id: 'act-1',
      time: '14:02',
      agentCode: 'E01',
      agentName: 'Chị Lan (E01)',
      title: 'Đang kiểm duyệt bài Combo Trưa',
      description: 'Đánh giá độ chuẩn Brand Voice và tiêu chí CTA.',
      type: 'review',
    },
    {
      id: 'act-2',
      time: '13:58',
      agentCode: 'D02',
      agentName: 'Anh Khoa (D02)',
      title: 'Đã hoàn thiện thiết kế hình ảnh',
      description: 'Ảnh visual ly Matcha Latte với tông màu ấm của quán.',
      type: 'working',
    },
    {
      id: 'act-3',
      time: '13:50',
      agentCode: 'D01',
      agentName: 'Bé Thư (D01)',
      title: 'Hoàn thành bản nháp Caption',
      description: 'Bản nháp caption phong cách gần gũi, ấm áp.',
      type: 'working',
    },
    {
      id: 'act-4',
      time: '13:30',
      agentCode: 'A01',
      agentName: 'Sếp Vũ (A01)',
      title: 'Phân công bước thực thi cho D01 & D02',
      description: 'Kích hoạt luồng sản xuất content tuần 34.',
      type: 'handoff',
    },
    {
      id: 'act-5',
      time: '11:15',
      agentCode: 'B03',
      agentName: 'Anh Minh (B03)',
      title: 'Hoàn tất Lịch Nội Dung tuần 34',
      description: 'Tổng cộng 7 bài viết phân bổ theo 3 Pillar chính.',
      type: 'success',
    },
  ],
}));
