'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AgentModelConfig, AppNotification, AssetRequest, BrandVoiceConfig, ContentItem, ContentPillar, EligibleModel,
  MediaAsset, PortalLoadError, PortalLoadStatus, RejectionReason, TaskCard,
} from './types';
import {
  apiApproveContent, apiApproveWeek, apiConfirmPillars, apiFetchAssetRequests,
  apiFetchAssets, apiFetchBootstrap, apiFetchSettings,
  apiMarkAsPosted, apiRejectContent, apiSubmitAssetRequest, apiUpdateAgentBudget,
  apiUpdateAgentModel, apiUpdateBrandVoice, apiUploadAsset, toPortalLoadError,
} from './api';
import { supabase } from './supabase';

interface PortalState {
  tasks: TaskCard[];
  contentItems: ContentItem[];
  pillars: ContentPillar[];
  notifications: AppNotification[];
  mediaAssets: MediaAsset[];
  assetRequests: AssetRequest[];
  brandVoice: BrandVoiceConfig;
  agentModelConfigs: AgentModelConfig[];
  eligibleModels: EligibleModel[];
  clientName: string;
  portalUserEmail: string;
  weekApproved: boolean;
  isDark: boolean;
  isLoading: boolean;
  error: PortalLoadError | null;
  assetsStatus: PortalLoadStatus;
  assetsError: PortalLoadError | null;
  settingsStatus: PortalLoadStatus;
  settingsError: PortalLoadError | null;
}

interface PortalActions {
  toggleTheme: () => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;
  approveContent: (id: string, editedCaption?: string, editedPublishTime?: Date) => Promise<void>;
  rejectContent: (id: string, reason: RejectionReason, feedback: string) => Promise<void>;
  markAsPosted: (id: string) => Promise<void>;
  updatePillarPercentage: (pillarId: string, newPercentage: number) => void;
  confirmPillars: () => Promise<void>;
  resetPillarsToAI: () => void;
  approveWeek: () => Promise<void>;
  updateBrandVoice: (config: BrandVoiceConfig) => Promise<void>;
  updateAgentModel: (agentCode: string, model: string, tier: string) => Promise<void>;
  updateAgentBudget: (agentCode: string, budget: number) => Promise<void>;
  submitAssets: (requestId: string, assetUrls: string[]) => Promise<void>;
  uploadAsset: (file: File) => Promise<void>;
  refreshData: () => Promise<void>;
  loadAssets: (force?: boolean) => Promise<void>;
  loadSettings: (force?: boolean) => Promise<void>;
}

const EMPTY_BRAND_VOICE: BrandVoiceConfig = {
  brandName: '', category: '', tagline: '', mission: '', targetAudience: '', personalityKeywords: [],
  archetype: '', formalityScore: 5, goodCaptionExample: '', badCaptionExample: '', forbiddenWords: [], signatureWords: [],
  brandPronoun: '', customerPronoun: '', emojiUsage: 'minimal', sentenceStyle: '', languageMixing: '', facebookTone: '',
  zaloTone: '', websiteTone: '', promotionalTone: '', customerServiceTone: '', benchmarkCaptions: [], referenceLinks: [],
};

function currentWeekNumber() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - firstDay.getTime()) / 86400000) + firstDay.getDay() + 1) / 7);
}

function mapContentItems(items: any[]): ContentItem[] {
  return (items || []).map((item: any) => ({
    id: item.id,
    title: item.topic,
    platform: item.platform === 'both' ? 'both' : item.platform === 'instagram' ? 'ig' : 'fb',
    caption: item.client_edited_caption || item.caption || '',
    imageUrl: item.image_url || null,
    publishTime: item.scheduled_date ? new Date(item.scheduled_date) : new Date(item.created_at),
    state: item.status,
    pillarId: item.pillar_id || 'general',
    weekNumber: currentWeekNumber(),
    needsRealPhoto: item.status === 'waiting_asset',
    assetRequestId: null,
  }));
}

function mapTaskLogs(logs: any[]): TaskCard[] {
  return (logs || []).map((log: any) => ({
    id: log.id,
    title: `[${log.agent_code}] ${log.task_type}`,
    assigneeType: 'agent',
    assigneeCode: log.agent_code,
    desk: log.agent_code === 'A01' || log.agent_code?.startsWith('B') ? 'strategy' : log.agent_code?.startsWith('D') ? 'creative' : 'qa',
    column: log.status === 'completed' || log.status === 'success' ? 'done' : log.status === 'failed' ? 'todo' : 'in_progress',
    linkedContentItemId: log.content_item_id || null,
    retryCount: 0,
    hasError: log.status === 'failed',
    errorMessage: log.status === 'failed' ? log.wake_reason : undefined,
    slaDeadline: null,
    createdAt: new Date(log.created_at),
    startedAt: new Date(log.created_at),
    completedAt: log.status === 'completed' || log.status === 'success' ? new Date(log.created_at) : null,
  }));
}

function mapPillars(pillars: any[]): ContentPillar[] {
  return (pillars || []).map((pillar: any) => ({
    id: pillar.id,
    label: pillar.name,
    emoji: '',
    description: pillar.description || '',
    percentage: pillar.weight,
    fbRatio: 50,
    igRatio: 50,
    angles: [],
  }));
}

function mapAssetRequests(requests: any[]): AssetRequest[] {
  return (requests || []).map((request: any) => ({
    id: request.id,
    contentItemId: request.content_item_id,
    shotList: Array.isArray(request.shot_list) ? request.shot_list : [],
    deadline: request.expires_at ? new Date(request.expires_at) : new Date(),
    exampleImageUrl: null,
    status: request.status === 'fulfilled' ? 'submitted' : request.status,
    submittedAssetIds: [],
  }));
}

function mapAssets(assets: any[]): MediaAsset[] {
  return (assets || []).map((asset: any) => ({
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.url,
    source: asset.source || 'pending_review',
    tags: asset.tags || [],
    uploadedAt: new Date(asset.created_at),
    usedInItems: [],
    assetRequestId: asset.asset_request_id || null,
  }));
}

const PortalContext = createContext<(PortalState & PortalActions) | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [brandVoice, setBrandVoice] = useState<BrandVoiceConfig>(EMPTY_BRAND_VOICE);
  const [agentModelConfigs, setAgentModelConfigs] = useState<AgentModelConfig[]>([]);
  const [eligibleModels, setEligibleModels] = useState<EligibleModel[]>([]);
  const [clientName, setClientName] = useState('');
  const [portalUserEmail, setPortalUserEmail] = useState('');
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [weekApproved, setWeekApproved] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PortalLoadError | null>(null);
  const [assetsStatus, setAssetsStatus] = useState<PortalLoadStatus>('idle');
  const [assetsError, setAssetsError] = useState<PortalLoadError | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<PortalLoadStatus>('idle');
  const [settingsError, setSettingsError] = useState<PortalLoadError | null>(null);
  const assetsStatusRef = useRef<PortalLoadStatus>('idle');
  const settingsStatusRef = useRef<PortalLoadStatus>('idle');
  const lastUserIdRef = useRef<string | null>(null);
  const tenantGenerationRef = useRef(0);

  const clearTenantData = useCallback(() => {
    setClientName('');
    setTasks([]);
    setContentItems([]);
    setPillars([]);
    setNotifications([]);
    setMediaAssets([]);
    setAssetRequests([]);
    setBrandVoice(EMPTY_BRAND_VOICE);
    setAgentModelConfigs([]);
    setEligibleModels([]);
    setCycleId(null);
    setWeekApproved(false);
    setIsLoading(false);
    setError(null);
    setAssetsError(null);
    setSettingsError(null);
    assetsStatusRef.current = 'idle';
    settingsStatusRef.current = 'idle';
    setAssetsStatus('idle');
    setSettingsStatus('idle');
  }, []);

  const refreshData = useCallback(async () => {
    const generation = tenantGenerationRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const bootstrap = await apiFetchBootstrap();
      if (generation !== tenantGenerationRef.current) return;
      const board = bootstrap.work_board;
      setClientName(bootstrap.client.brand_name);
      if (bootstrap.viewer.email) setPortalUserEmail(bootstrap.viewer.email);
      setContentItems(mapContentItems(board.content_items));
      setTasks(mapTaskLogs(board.task_logs));
      setPillars(mapPillars(board.pillars));
      setCycleId(board.schedule.cycle_id);
      setWeekApproved(board.schedule.phase === 'content_production');
    } catch (cause) {
      if (generation !== tenantGenerationRef.current) return;
      setError(toPortalLoadError(cause, 'bootstrap', 'Không tải được dữ liệu công việc.'));
    } finally {
      if (generation === tenantGenerationRef.current) setIsLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async (force = false) => {
    if (assetsStatusRef.current === 'loading') return;
    if (!force && assetsStatusRef.current !== 'idle') return;
    const generation = tenantGenerationRef.current;
    assetsStatusRef.current = 'loading';
    setAssetsStatus('loading');
    setAssetsError(null);
    try {
      const [requests, assets] = await Promise.all([
        apiFetchAssetRequests(),
        apiFetchAssets(),
      ]);
      if (generation !== tenantGenerationRef.current) return;
      setAssetRequests(mapAssetRequests(requests));
      setMediaAssets(mapAssets(assets));
      assetsStatusRef.current = 'ready';
      setAssetsStatus('ready');
    } catch (cause) {
      if (generation !== tenantGenerationRef.current) return;
      assetsStatusRef.current = 'error';
      setAssetsStatus('error');
      setAssetsError(toPortalLoadError(cause, 'assets', 'Không tải được thư viện ảnh.'));
    }
  }, []);

  const loadSettings = useCallback(async (force = false) => {
    if (settingsStatusRef.current === 'loading') return;
    if (!force && settingsStatusRef.current !== 'idle') return;
    const generation = tenantGenerationRef.current;
    settingsStatusRef.current = 'loading';
    setSettingsStatus('loading');
    setSettingsError(null);
    try {
      const settings = await apiFetchSettings();
      if (generation !== tenantGenerationRef.current) return;
      const serverBrand = settings?.brand_voice || {};
      setClientName(settings?.client?.brand_name || '');
      setBrandVoice((current) => ({
        ...current,
        facebookTone: serverBrand.tone || '',
        personalityKeywords: serverBrand.personality_keywords || [],
        forbiddenWords: serverBrand.avoid_phrases || [],
        sentenceStyle: serverBrand.writing_style || '',
      }));
      setAgentModelConfigs((settings?.agent_configs || []).map((cfg: any) => ({
        agentCode: cfg.agent_code,
        selectedModel: cfg.model,
        tier: cfg.tier,
        budgetUSD: cfg.budget_usd_month,
        isActive: cfg.is_active,
      })));
      setEligibleModels(settings?.eligible_models || []);
      settingsStatusRef.current = 'ready';
      setSettingsStatus('ready');
    } catch (cause) {
      if (generation !== tenantGenerationRef.current) return;
      settingsStatusRef.current = 'error';
      setSettingsStatus('error');
      setSettingsError(toPortalLoadError(cause, 'settings', 'Không tải được cấu hình client.'));
    }
  }, []);

  useEffect(() => {
    const syncSession = (session: { user: { id: string; email?: string | null } } | null) => {
      if (!session) {
        tenantGenerationRef.current += 1;
        lastUserIdRef.current = null;
        setPortalUserEmail('');
        clearTenantData();
        return;
      }
      setPortalUserEmail(session.user.email || '');
      if (session.user.id === lastUserIdRef.current) return;
      tenantGenerationRef.current += 1;
      lastUserIdRef.current = session.user.id;
      clearTenantData();
      void refreshData();
    };

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });
    return () => subscription.unsubscribe();
  }, [clearTenantData, refreshData]);

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => {
      const next = !previous;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((previous) => previous.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
  }, []);

  const approveContent = useCallback(async (id: string, editedCaption?: string) => {
    await apiApproveContent(id, editedCaption);
    setContentItems((previous) => previous.map((item) => item.id === id ? { ...item, state: 'approved_ready_to_post', ...(editedCaption ? { caption: editedCaption } : {}) } : item));
  }, []);

  const rejectContent = useCallback(async (id: string, reason: RejectionReason, feedback: string) => {
    await apiRejectContent(id, reason, feedback);
    setContentItems((previous) => previous.map((item) => item.id === id ? { ...item, state: 'rejected' } : item));
  }, []);

  const markAsPosted = useCallback(async (id: string) => {
    await apiMarkAsPosted(id);
    setContentItems((previous) => previous.map((item) => item.id === id ? { ...item, state: 'posted' } : item));
  }, []);

  const updatePillarPercentage = useCallback((pillarId: string, newPercentage: number) => {
    setPillars((previous) => previous.map((pillar) => pillar.id === pillarId ? { ...pillar, percentage: Math.max(5, Math.min(85, newPercentage)) } : pillar));
  }, []);

  const confirmPillars = useCallback(async () => {
    await apiConfirmPillars(pillars.map((pillar) => ({ pillar_id: pillar.id, percentage: pillar.percentage })));
  }, [pillars]);

  const resetPillarsToAI = useCallback(() => { void refreshData(); }, [refreshData]);

  const approveWeek = useCallback(async () => {
    if (!cycleId) throw new Error('No active cycle is loaded');
    await apiApproveWeek(cycleId);
    setWeekApproved(true);
    setContentItems((previous) => previous.map((item) => item.state === 'planned' ? { ...item, state: 'ready_for_generation' } : item));
  }, [cycleId]);

  const submitAssets = useCallback(async (requestId: string, assetUrls: string[]) => {
    await apiSubmitAssetRequest(requestId, assetUrls);
    setAssetRequests((previous) => previous.map((request) => request.id === requestId ? { ...request, status: 'submitted' } : request));
    await Promise.all([loadAssets(true), refreshData()]);
  }, [loadAssets, refreshData]);

  const uploadAsset = useCallback(async (file: File) => {
    const asset = await apiUploadAsset(file);
    setMediaAssets((previous) => [{
      id: asset.id, url: asset.url, thumbnailUrl: asset.url, source: asset.source || 'pending_review',
      tags: asset.tags || [], uploadedAt: new Date(asset.created_at), usedInItems: [],
      assetRequestId: asset.asset_request_id || null,
    }, ...previous]);
  }, []);

  const updateBrandVoice = useCallback(async (config: BrandVoiceConfig) => {
    await apiUpdateBrandVoice(config);
    setBrandVoice(config);
  }, []);

  const updateAgentModel = useCallback(async (agentCode: string, model: string, tier: string) => {
    const current = agentModelConfigs.find((config) => config.agentCode === agentCode);
    await apiUpdateAgentModel(agentCode, model, tier, current?.budgetUSD || 1);
    setAgentModelConfigs((previous) => previous.map((config) => config.agentCode === agentCode ? { ...config, selectedModel: model, tier: tier as AgentModelConfig['tier'] } : config));
  }, [agentModelConfigs]);

  const updateAgentBudget = useCallback(async (agentCode: string, budget: number) => {
    const current = agentModelConfigs.find((config) => config.agentCode === agentCode);
    await apiUpdateAgentBudget(agentCode, budget, current);
    setAgentModelConfigs((previous) => previous.map((config) => config.agentCode === agentCode ? { ...config, budgetUSD: budget } : config));
  }, [agentModelConfigs]);

  const value: PortalState & PortalActions = {
    tasks, contentItems, pillars, notifications, mediaAssets, assetRequests, brandVoice, agentModelConfigs, eligibleModels, clientName, portalUserEmail, weekApproved,
    isDark, isLoading, error, assetsStatus, assetsError, settingsStatus, settingsError,
    toggleTheme, markNotificationRead, unreadCount: notifications.filter((n) => !n.read).length,
    approveContent, rejectContent, markAsPosted, updatePillarPercentage, confirmPillars, resetPillarsToAI, approveWeek,
    updateBrandVoice, updateAgentModel, updateAgentBudget, submitAssets, uploadAsset, refreshData, loadAssets, loadSettings,
  };
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalState & PortalActions {
  const context = useContext(PortalContext);
  if (!context) throw new Error('usePortal must be used inside <PortalProvider>');
  return context;
}
