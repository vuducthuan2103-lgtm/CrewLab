'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  TaskCard,
  ContentItem,
  ContentPillar,
  AppNotification,
  MediaAsset,
  AssetRequest,
  BrandVoiceConfig,
  AgentModelConfig,
  RejectionReason,
} from './types';
import {
  INITIAL_TASKS,
  CONTENT_ITEMS,
  INITIAL_PILLARS,
  INITIAL_NOTIFICATIONS,
  MEDIA_ASSETS,
  ASSET_REQUESTS,
  BRAND_VOICE,
  AGENT_MODEL_CONFIGS,
  DEMO_AI_EVENTS,
} from './mock-data';

// ─── Store State ─────────────────────────────────────────────────────────────
interface PortalState {
  tasks: TaskCard[];
  contentItems: ContentItem[];
  pillars: ContentPillar[];
  notifications: AppNotification[];
  mediaAssets: MediaAsset[];
  assetRequests: AssetRequest[];
  brandVoice: BrandVoiceConfig;
  agentModelConfigs: AgentModelConfig[];
  weekApproved: boolean;
  demoEventIndex: number;
  isDark: boolean;
}

// ─── Store Actions ────────────────────────────────────────────────────────────
interface PortalActions {
  // Theme
  toggleTheme: () => void;

  // Notification
  markNotificationRead: (id: string) => void;
  triggerDemoAiEvent: () => void;
  unreadCount: number;

  // Content Approval (Gate 2)
  approveContent: (id: string, editedCaption?: string, editedPublishTime?: Date) => void;
  rejectContent: (id: string, reason: RejectionReason, feedback: string) => void;
  markAsPosted: (id: string) => void;

  // Gate S2 — Pillar & Angle
  updatePillarPercentage: (pillarId: string, newPercentage: number) => void;
  confirmPillars: () => void;
  resetPillarsToAI: () => void;

  // Gate S3 — Approve All Week
  approveWeek: () => void;

  // Client Brief Action
  createClientBrief: (title: string, details: string, urgency: 'standard' | 'high' | 'urgent', platform?: 'all' | 'fb' | 'ig') => void;

  // Settings
  updateBrandVoice: (config: BrandVoiceConfig) => void;
  updateAgentModel: (agentCode: string, model: string, tier: string) => void;
  updateAgentBudget: (agentCode: string, budget: number) => void;
}


// ─── AI suggestion pillars (rebalanced to show B02 intelligence) ─────────────
const AI_SUGGESTED_PILLARS: ContentPillar[] = [
  { ...INITIAL_PILLARS[0], percentage: 35 },
  { ...INITIAL_PILLARS[1], percentage: 35 },
  { ...INITIAL_PILLARS[2], percentage: 20 },
  { ...INITIAL_PILLARS[3], percentage: 10 },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const PortalContext = createContext<(PortalState & PortalActions) | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskCard[]>(INITIAL_TASKS);
  const [contentItems, setContentItems] = useState<ContentItem[]>(CONTENT_ITEMS);
  const [pillars, setPillars] = useState<ContentPillar[]>(INITIAL_PILLARS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [mediaAssets] = useState<MediaAsset[]>(MEDIA_ASSETS);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>(ASSET_REQUESTS);
  const [brandVoice, setBrandVoice] = useState<BrandVoiceConfig>(BRAND_VOICE);
  const [agentModelConfigs, setAgentModelConfigs] = useState<AgentModelConfig[]>(AGENT_MODEL_CONFIGS);
  const [weekApproved, setWeekApproved] = useState(false);
  const [demoEventIndex, setDemoEventIndex] = useState(0);
  const [isDark, setIsDark] = useState(true);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const triggerDemoAiEvent = useCallback(() => {
    const template = DEMO_AI_EVENTS[demoEventIndex % DEMO_AI_EVENTS.length];
    const newNotification: AppNotification = {
      ...template,
      id: `demo-${Date.now()}`,
      createdAt: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    setDemoEventIndex((prev) => prev + 1);
  }, [demoEventIndex]);

  // ── Content Approval ──────────────────────────────────────────────────────
  const approveContent = useCallback(
    (id: string, editedCaption?: string, _editedPublishTime?: Date) => {
      setContentItems((prev) =>
        prev.map((ci) => {
          if (ci.id !== id) return ci;
          return {
            ...ci,
            state: 'approved_ready_to_post',
            ...(editedCaption ? { clientEditedCaption: editedCaption } : {}),
          };
        })
      );
      // Move corresponding human task to Done
      setTasks((prev) =>
        prev.map((t) =>
          t.linkedContentItemId === id && t.assigneeType === 'human' && t.column === 'review'
            ? { ...t, column: 'done', completedAt: new Date() }
            : t
        )
      );
      // Mark notification as read
      setNotifications((prev) =>
        prev.map((n) => (n.linkedContentItemId === id ? { ...n, read: true } : n))
      );
    },
    []
  );

  const rejectContent = useCallback((id: string, reason: RejectionReason, feedback: string) => {
    setContentItems((prev) =>
      prev.map((ci) =>
        ci.id === id
          ? { ...ci, state: 'eval_failed', rejectionReason: reason, rejectionFeedback: feedback }
          : ci
      )
    );
    // Move task back to Todo (for retry)
    setTasks((prev) =>
      prev.map((t) =>
        t.linkedContentItemId === id && t.assigneeType === 'human' && t.column === 'review'
          ? { ...t, column: 'todo', retryCount: t.retryCount + 1 }
          : t
      )
    );
  }, []);

  const markAsPosted = useCallback((id: string) => {
    setContentItems((prev) =>
      prev.map((ci) => (ci.id === id ? { ...ci, state: 'posted' } : ci))
    );
  }, []);

  // ── Gate S2 — Pillars ─────────────────────────────────────────────────────
  const updatePillarPercentage = useCallback((pillarId: string, newPercentage: number) => {
    setPillars((prev) => {
      const total = prev.reduce(
        (sum, p) => (p.id === pillarId ? sum : sum + p.percentage),
        0
      );
      // Simple clamp: just set the value, validation happens in UI
      return prev.map((p) =>
        p.id === pillarId ? { ...p, percentage: Math.max(5, Math.min(85, newPercentage)) } : p
      );
    });
  }, []);

  const confirmPillars = useCallback(() => {
    // In a real app, this would POST to /api/v1/pillars/confirm
    // For now it's already stored in state
  }, []);

  const resetPillarsToAI = useCallback(() => {
    setPillars(AI_SUGGESTED_PILLARS);
  }, []);

  // ── Gate S3 — Approve Week ────────────────────────────────────────────────
  const approveWeek = useCallback(() => {
    setWeekApproved(true);
    setContentItems((prev) =>
      prev.map((ci) =>
        ci.state === 'planned' ? { ...ci, state: 'ready_for_generation' } : ci
      )
    );
  }, []);

  // ── Asset Submit ──────────────────────────────────────────────────────────
  const submitAssets = useCallback((requestId: string, _assetUrls: string[]) => {
    setAssetRequests((prev) =>
      prev.map((ar) => (ar.id === requestId ? { ...ar, status: 'submitted' } : ar))
    );
    setContentItems((prev) =>
      prev.map((ci) => (ci.assetRequestId === requestId ? { ...ci, state: 'evaluating' } : ci))
    );
  }, []);

  // ── Client Brief ──────────────────────────────────────────────────────────
  const createClientBrief = useCallback((title: string, details: string, urgency: 'standard' | 'high' | 'urgent', platform: 'all' | 'fb' | 'ig' = 'all') => {
    const briefId = `brief-${Date.now()}`;
    const newBriefTask: TaskCard = {
      id: `t-${briefId}`,
      title: `⚡ Brief từ Client: ${title}`,
      assigneeType: 'agent',
      assigneeCode: 'A01',
      desk: 'strategy',
      column: 'in_progress',
      linkedContentItemId: null,
      retryCount: 0,
      hasError: false,
      slaDeadline: new Date(Date.now() + (urgency === 'urgent' ? 6 : 24) * 3600 * 1000),
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    };

    const newNotif: AppNotification = {
      id: `notif-${briefId}`,
      type: 'strategy_ready_for_approval',
      title: `📝 A01 đã tiếp nhận Brief: "${title}"`,
      body: `A01 Orchestrator đang phân tích Brand Voice và chỉ đạo D01 & D02 lập tức sản xuất nội dung cho ${platform === 'fb' ? 'Facebook' : platform === 'ig' ? 'Instagram' : 'FB & IG'}.`,
      actionUrl: '/',
      linkedContentItemId: null,
      createdAt: new Date(),
      read: false,
    };

    setTasks((prev) => [newBriefTask, ...prev]);
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateBrandVoice = useCallback((config: BrandVoiceConfig) => {
    setBrandVoice(config);
  }, []);


  const updateAgentModel = useCallback((agentCode: string, model: string, tier: string) => {
    setAgentModelConfigs((prev) =>
      prev.map((c) =>
        c.agentCode === agentCode ? { ...c, selectedModel: model, tier: tier as AgentModelConfig['tier'] } : c
      )
    );
  }, []);

  const updateAgentBudget = useCallback((agentCode: string, budget: number) => {
    setAgentModelConfigs((prev) =>
      prev.map((c) => (c.agentCode === agentCode ? { ...c, budgetUSD: budget } : c))
    );
  }, []);

  const value: PortalState & PortalActions = {
    tasks,
    contentItems,
    pillars,
    notifications,
    mediaAssets,
    assetRequests,
    brandVoice,
    agentModelConfigs,
    weekApproved,
    demoEventIndex,
    isDark,
    toggleTheme,
    markNotificationRead,
    triggerDemoAiEvent,
    unreadCount,
    approveContent,
    rejectContent,
    markAsPosted,
    updatePillarPercentage,
    confirmPillars,
    resetPillarsToAI,
    approveWeek,
    submitAssets,
    createClientBrief,
    updateBrandVoice,
    updateAgentModel,
    updateAgentBudget,
  };


  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalState & PortalActions {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside <PortalProvider>');
  return ctx;
}
