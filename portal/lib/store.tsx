'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
import {
  apiFetchContentItems,
  apiApproveContent,
  apiRejectContent,
  apiMarkAsPosted,
  apiConfirmPillars,
  apiApproveWeek,
  apiSubmitAssetRequest,
  apiFetchTaskLogs,
  apiUpdateBrandVoice,
  apiUpdateAgentModel,
  apiUpdateAgentBudget,
} from './api';

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
  isLoading: boolean;
  error: string | null;
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
  approveContent: (id: string, editedCaption?: string, editedPublishTime?: Date) => Promise<void>;
  rejectContent: (id: string, reason: RejectionReason, feedback: string) => Promise<void>;
  markAsPosted: (id: string) => Promise<void>;

  // Gate S2 — Pillar & Angle
  updatePillarPercentage: (pillarId: string, newPercentage: number) => void;
  confirmPillars: () => Promise<void>;
  resetPillarsToAI: () => void;

  // Gate S3 — Approve All Week
  approveWeek: () => Promise<void>;

  // Client Brief Action
  createClientBrief: (title: string, details: string, urgency: 'standard' | 'high' | 'urgent', platform?: 'all' | 'fb' | 'ig') => void;

  // Settings
  updateBrandVoice: (config: BrandVoiceConfig) => Promise<void>;
  updateAgentModel: (agentCode: string, model: string, tier: string) => Promise<void>;
  updateAgentBudget: (agentCode: string, budget: number) => Promise<void>;

  // Asset Upload
  submitAssets: (requestId: string, assetUrls: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Initial Real Data from Backend API ────────────────────────────────
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const realItems = await apiFetchContentItems();
      if (Array.isArray(realItems) && realItems.length > 0) {
        const mappedItems: ContentItem[] = realItems.map((item: any) => ({
          id: item.id,
          title: item.topic,
          platform: item.platform === 'both' ? 'both' : item.platform === 'instagram' ? 'ig' : 'fb',
          state: item.status,
          caption: item.caption,
          imageUrl: item.image_url,
          publishTime: item.scheduled_date ? new Date(item.scheduled_date) : new Date(),
          pillarLabel: item.pillar_id || 'General',
          weekNumber: 25,
          retryCount: item.eval_retry_count || 0,
          evalScoreCaption: item.eval_score_caption,
          evalScoreVisual: item.eval_score_visual,
          evalFeedback: item.fix_instructions,
          failedCriteria: item.failed_criteria || [],
          currentAgent: null,
          needsRealPhoto: item.status === 'waiting_asset',
          assetRequestId: undefined,
          clientEditedCaption: item.client_edited_caption,
          rejectionReason: undefined,
          rejectionFeedback: undefined,
          postedAt: item.posted_at ? new Date(item.posted_at) : undefined,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }));
        setContentItems(mappedItems);
      }

      const realLogs = await apiFetchTaskLogs();
      if (Array.isArray(realLogs) && realLogs.length > 0) {
        const mappedTasks: TaskCard[] = realLogs.map((log: any) => ({
          id: log.id,
          title: `[${log.agent_code}] ${log.task_type}`,
          assigneeType: 'agent',
          assigneeCode: log.agent_code,
          desk: log.agent_code === 'A01' || log.agent_code.startsWith('B') ? 'strategy' : log.agent_code.startsWith('D') ? 'creative' : 'qa',
          column: log.status === 'completed' || log.status === 'success' ? 'done' : log.status === 'failed' ? 'todo' : 'in_progress',
          linkedContentItemId: log.content_item_id,
          retryCount: 0,
          hasError: log.status === 'failed',
          slaDeadline: new Date(new Date(log.created_at).getTime() + 24 * 3600 * 1000),
          createdAt: new Date(log.created_at),
          startedAt: new Date(log.created_at),
          completedAt: log.status === 'completed' || log.status === 'success' ? new Date(log.created_at) : null,
        }));
        setTasks((prev) => [...mappedTasks, ...prev.filter(t => t.assigneeType === 'human')]);
      }
    } catch (err: any) {
      console.warn('Backend API connection failed, using local mock fallback:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  // ── Content Approval (Gate 2) ──────────────────────────────────────────────
  const approveContent = useCallback(
    async (id: string, editedCaption?: string, _editedPublishTime?: Date) => {
      try {
        await apiApproveContent(id, editedCaption);
      } catch (e: any) {
        console.warn('API approveContent failed, applying local state update:', e.message);
      }
      
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
      setTasks((prev) =>
        prev.map((t) =>
          t.linkedContentItemId === id && t.assigneeType === 'human' && t.column === 'review'
            ? { ...t, column: 'done', completedAt: new Date() }
            : t
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (n.linkedContentItemId === id ? { ...n, read: true } : n))
      );
    },
    []
  );

  const rejectContent = useCallback(async (id: string, reason: RejectionReason, feedback: string) => {
    try {
      await apiRejectContent(id, reason, feedback);
    } catch (e: any) {
      console.warn('API rejectContent failed, applying local state update:', e.message);
    }

    setContentItems((prev) =>
      prev.map((ci) =>
        ci.id === id
          ? { ...ci, state: 'eval_failed', rejectionReason: reason, rejectionFeedback: feedback }
          : ci
      )
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.linkedContentItemId === id && t.assigneeType === 'human' && t.column === 'review'
          ? { ...t, column: 'todo', retryCount: t.retryCount + 1 }
          : t
      )
    );
  }, []);

  const markAsPosted = useCallback(async (id: string) => {
    try {
      await apiMarkAsPosted(id);
    } catch (e: any) {
      console.warn('API markAsPosted failed, applying local state update:', e.message);
    }

    setContentItems((prev) =>
      prev.map((ci) => (ci.id === id ? { ...ci, state: 'posted' } : ci))
    );
  }, []);

  // ── Gate S2 — Pillars ─────────────────────────────────────────────────────
  const updatePillarPercentage = useCallback((pillarId: string, newPercentage: number) => {
    setPillars((prev) =>
      prev.map((p) =>
        p.id === pillarId ? { ...p, percentage: Math.max(5, Math.min(85, newPercentage)) } : p
      )
    );
  }, []);

  const confirmPillars = useCallback(async () => {
    try {
      const payload = pillars.map((p) => ({ pillar_id: p.id, percentage: p.percentage }));
      await apiConfirmPillars(payload);
    } catch (e: any) {
      console.warn('API confirmPillars failed:', e.message);
    }
  }, [pillars]);

  const resetPillarsToAI = useCallback(() => {
    setPillars(AI_SUGGESTED_PILLARS);
  }, []);

  // ── Gate S3 — Approve Week ────────────────────────────────────────────────
  const approveWeek = useCallback(async () => {
    try {
      await apiApproveWeek('00000000-0000-0000-0000-000000000001');
    } catch (e: any) {
      console.warn('API approveWeek failed:', e.message);
    }

    setWeekApproved(true);
    setContentItems((prev) =>
      prev.map((ci) =>
        ci.state === 'planned' ? { ...ci, state: 'ready_for_generation' } : ci
      )
    );
  }, []);

  // ── Asset Submit ──────────────────────────────────────────────────────────
  const submitAssets = useCallback(async (requestId: string, assetUrls: string[]) => {
    try {
      await apiSubmitAssetRequest(requestId, assetUrls);
    } catch (e: any) {
      console.warn('API submitAssets failed:', e.message);
    }

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
  const updateBrandVoice = useCallback(async (config: BrandVoiceConfig) => {
    try {
      await apiUpdateBrandVoice(config);
    } catch (e: any) {
      console.warn('API updateBrandVoice failed:', e.message);
    }
    setBrandVoice(config);
  }, []);

  const updateAgentModel = useCallback(async (agentCode: string, model: string, tier: string) => {
    try {
      await apiUpdateAgentModel(agentCode, model, tier);
    } catch (e: any) {
      console.warn('API updateAgentModel failed:', e.message);
    }
    setAgentModelConfigs((prev) =>
      prev.map((c) =>
        c.agentCode === agentCode ? { ...c, selectedModel: model, tier: tier as AgentModelConfig['tier'] } : c
      )
    );
  }, []);

  const updateAgentBudget = useCallback(async (agentCode: string, budget: number) => {
    try {
      await apiUpdateAgentBudget(agentCode, budget);
    } catch (e: any) {
      console.warn('API updateAgentBudget failed:', e.message);
    }
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
    isLoading,
    error,
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
    refreshData,
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalState & PortalActions {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside <PortalProvider>');
  return ctx;
}
