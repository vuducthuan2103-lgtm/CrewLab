'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AgentModelConfig, AppNotification, BrandVoiceConfig, ContentItem, ContentPillar, EligibleModel,
  MediaAsset, PortalLoadError, PortalLoadStatus, RejectionReason, TaskCard,
} from './types';
import {
  apiApproveContent, apiApproveWeek, apiConfirmPillars, apiUpdateContentSchedule,
  apiFetchAssets, apiFetchBootstrap, apiFetchSettings,
  apiMarkAsPosted, apiRejectContent, apiUpdateAgentBudget,
  apiUpdateAgentModel, apiUpdateBrandVoice, apiUploadAsset, toPortalLoadError,
} from './api';
import { supabase } from './supabase';

interface PortalState {
  tasks: TaskCard[];
  contentItems: ContentItem[];
  pillars: ContentPillar[];
  notifications: AppNotification[];
  mediaAssets: MediaAsset[];
  brandVoice: BrandVoiceConfig;
  agentModelConfigs: AgentModelConfig[];
  eligibleModels: EligibleModel[];
  clientName: string;
  portalUserEmail: string;
  weekApproved: boolean;
  isLoading: boolean;
  error: PortalLoadError | null;
  brandLogoUrl: string | null;
  assetsStatus: PortalLoadStatus;
  assetsError: PortalLoadError | null;
  settingsStatus: PortalLoadStatus;
  settingsError: PortalLoadError | null;
}

interface PortalActions {
  markNotificationRead: (id: string) => void;
  unreadCount: number;
  setBrandLogoUrl: (url: string | null) => void;
  uploadBrandLogo: (file: File) => Promise<string>;
  approveContent: (id: string, editedCaption?: string, editedPublishTime?: Date) => Promise<void>;
  rejectContent: (id: string, reason: RejectionReason, feedback: string) => Promise<void>;
  markAsPosted: (id: string) => Promise<void>;
  updatePillarPercentage: (pillarId: string, newPercentage: number) => void;
  updatePillarDraft: (pillarId: string, changes: Partial<Pick<ContentPillar, 'label' | 'description' | 'angles'>>) => void;
  confirmPillars: () => Promise<void>;
  resetPillarsToAI: () => void;
  approveWeek: () => Promise<void>;
  updateContentSchedule: (id: string, publishTime: Date) => Promise<void>;
  updateBrandVoice: (config: BrandVoiceConfig) => Promise<void>;
  updateAgentModel: (agentCode: string, model: string, tier: string) => Promise<void>;
  updateAgentBudget: (agentCode: string, budget: number) => Promise<void>;
  uploadAsset: (file: File, rightsAttested: boolean) => Promise<void>;
  refreshData: (isManual?: boolean) => Promise<void>;
  loadAssets: (force?: boolean) => Promise<void>;
  loadSettings: (force?: boolean) => Promise<void>;
}

import { getISOWeekNumber } from './dateUtils';

const EMPTY_BRAND_VOICE: BrandVoiceConfig = {
  brandName: '', category: '', tagline: '', mission: '', targetAudience: '', personalityKeywords: [],
  archetype: '', formalityScore: 5, goodCaptionExample: '', badCaptionExample: '', forbiddenWords: [], signatureWords: [],
  brandPronoun: '', customerPronoun: '', emojiUsage: 'minimal', sentenceStyle: '', languageMixing: '', facebookTone: '',
  zaloTone: '', websiteTone: '', promotionalTone: '', customerServiceTone: '', benchmarkCaptions: [], referenceLinks: [],
};

function mapContentItems(items: any[]): ContentItem[] {
  return (items || []).map((item: any) => {
    const publishTime = item.scheduled_date
      ? new Date(`${String(item.scheduled_date).slice(0, 10)}T${item.scheduled_time || '00:00'}:00`)
      : new Date(item.created_at || Date.now());
    return {
      id: item.id,
      title: item.topic,
      platform: item.platform === 'both' ? 'both' : item.platform === 'instagram' ? 'ig' : 'fb',
      caption: item.client_edited_caption || item.caption || '',
      imageUrl: item.image_url || null,
      publishTime,
      state: item.status,
      pillarId: item.pillar_id || 'general',
      weekNumber: getISOWeekNumber(publishTime),
      needsRealPhoto: false,
      failedCriteria: item.failed_criteria || undefined,
      fixInstructions: item.fix_instructions || undefined,
      evalScoreCaption: item.eval_score_caption ?? null,
      evalScoreVisual: item.eval_score_visual ?? null,
      imageProvenance: item.image_provenance ? {
        sourceAssetId: item.image_provenance.source_asset_id || null,
        derivativeAssetId: item.image_provenance.derivative_asset_id || null,
        generationMode: item.image_provenance.generation_mode || null,
        selectionRationale: item.image_provenance.selection_rationale || null,
        selectionScore: item.image_provenance.selection_score ?? null,
      } : undefined,
    };
  });
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
    errorMessage: log.status === 'failed' ? (log.error_message || 'Tác vụ thất bại') : undefined,
    errorCode: log.error_code || undefined,
    errorProvider: log.error_provider || undefined,
    providerRequestId: log.provider_request_id || undefined,
    errorRetryable: log.error_retryable ?? undefined,
    slaDeadline: null,
    createdAt: new Date(log.created_at),
    startedAt: new Date(log.created_at),
    completedAt: log.status === 'completed' || log.status === 'success' ? new Date(log.created_at) : null,
    modelUsed: log.model_used || undefined,
    tokensIn: log.tokens_in || 0,
    tokensOut: log.tokens_out || 0,
    latencyMs: log.latency_ms || 0,
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
    angles: (pillar.angles || []).map((angle: string, index: number) => ({ id: `${pillar.id}-angle-${index}`, label: angle })),
  }));
}

function mapAssets(assets: any[]): MediaAsset[] {
  return (assets || []).map((asset: any) => ({
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.url,
    source: asset.status === 'pending_review'
      ? 'pending_review'
      : asset.source === 'd02_ai_derivative'
        ? 'ai_generated'
        : 'real_photo',
    tags: asset.tags || [],
    uploadedAt: new Date(asset.created_at),
    usedInItems: [],
    notes: asset.semantic_summary || undefined,
    indexingStatus: asset.indexing_status || 'processing',
    indexingReason: asset.indexing_reason || null,
    readyForD02: Boolean(asset.ready_for_d02),
  }));
}

function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('crewlab_read_notifications');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveReadNotificationId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const ids = getReadNotificationIds();
    ids.add(id);
    localStorage.setItem('crewlab_read_notifications', JSON.stringify(Array.from(ids)));
  } catch {}
}

function generateRealNotifications(
  contentItems: ContentItem[],
  tasks: TaskCard[],
  schedule: { cycle_id?: string | null; phase?: string } | undefined,
  readIds: Set<string>
): AppNotification[] {
  const notifs: AppNotification[] = [];

  // 1. Kế hoạch chiến lược tuần mới sẵn sàng chờ xác nhận
  if (schedule?.phase === 'weekly_planning' || (!schedule?.phase && schedule?.cycle_id)) {
    const id = `notif-strategy-${schedule.cycle_id || 'active'}`;
    notifs.push({
      id,
      type: 'strategy_ready_for_approval',
      title: 'Kế hoạch nội dung tuần mới đã sẵn sàng',
      body: 'B02 & B03 đã hoàn thiện định hướng và lịch đăng tuần. Bạn vui lòng xem qua và xác nhận.',
      read: readIds.has(id),
      createdAt: new Date(),
      actionUrl: '/planner',
      linkedContentItemId: null,
    });
  }

  // 2. Các mốc nội dung quan trọng (Chờ duyệt, Sẵn sàng đăng, Đã đăng)
  for (const item of contentItems) {
    if (item.state === 'pending_content_approval') {
      const id = `notif-pending-${item.id}`;
      notifs.push({
        id,
        type: 'content_ready_for_approval',
        title: `Bài viết mới chờ bạn duyệt: "${item.title || 'Bài đăng'}"`,
        body: item.caption
          ? `Nội dung và hình ảnh đã sẵn sàng (${item.platform === 'both' ? 'Facebook & Instagram' : item.platform === 'ig' ? 'Instagram' : 'Facebook'}). Nhấn để xem và duyệt bài.`
          : 'D01 & D02 đã hoàn thiện bài viết. Nhấn để kiểm tra và duyệt.',
        read: readIds.has(id),
        createdAt: item.publishTime || new Date(),
        actionUrl: '/approval',
        linkedContentItemId: item.id,
      });
    } else if (item.state === 'approved_ready_to_post') {
      const id = `notif-ready-${item.id}`;
      notifs.push({
        id,
        type: 'system',
        title: `Bài viết đã duyệt sẵn sàng đăng: "${item.title || 'Bài đăng'}"`,
        body: `Đã duyệt thành công. Lịch đăng vào ${item.publishTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} lúc ${item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`,
        read: readIds.has(id),
        createdAt: item.publishTime || new Date(),
        actionUrl: '/content-hub',
        linkedContentItemId: item.id,
      });
    } else if (item.state === 'posted') {
      const id = `notif-posted-${item.id}`;
      notifs.push({
        id,
        type: 'system',
        title: `Bài viết đã xuất bản: "${item.title || 'Bài đăng'}"`,
        body: `Đã ghi nhận bài viết xuất bản thành công trên ${item.platform === 'both' ? 'Facebook & Instagram' : item.platform === 'ig' ? 'Instagram' : 'Facebook'}.`,
        read: readIds.has(id),
        createdAt: item.publishTime || new Date(),
        actionUrl: '/content-hub',
        linkedContentItemId: item.id,
      });
    }
  }

  return notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const PortalContext = createContext<(PortalState & PortalActions) | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [brandVoice, setBrandVoice] = useState<BrandVoiceConfig>(EMPTY_BRAND_VOICE);
  const [agentModelConfigs, setAgentModelConfigs] = useState<AgentModelConfig[]>([]);
  const [eligibleModels, setEligibleModels] = useState<EligibleModel[]>([]);
  const [clientName, setClientName] = useState('');
  const [portalUserEmail, setPortalUserEmail] = useState('');
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [weekApproved, setWeekApproved] = useState(false);
  const [brandLogoUrl, setBrandLogoUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('crewlab_brand_logo') || null;
    }
    return null;
  });
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

  const refreshData = useCallback(async (isManual = false) => {
    const generation = tenantGenerationRef.current;
    if (isManual) {
      setError(null);
      setIsLoading(true);
    }
    try {
      const [bootstrap, settings] = await Promise.all([
        apiFetchBootstrap(),
        apiFetchSettings().catch(() => null),
      ]);
      if (generation !== tenantGenerationRef.current) return;
      const board = bootstrap.work_board;
      setClientName(bootstrap.client.brand_name);
      if (bootstrap.viewer.email) setPortalUserEmail(bootstrap.viewer.email);
      const mappedItems = mapContentItems(board.content_items);
      const mappedTasks = mapTaskLogs(board.task_logs);
      setContentItems(mappedItems);
      setTasks(mappedTasks);
      setPillars(mapPillars(board.pillars));
      setCycleId(board.schedule.cycle_id);
      setWeekApproved(board.schedule.phase === 'content_production');

      const readIds = getReadNotificationIds();
      setNotifications(generateRealNotifications(mappedItems, mappedTasks, { cycle_id: board.schedule.cycle_id, phase: board.schedule.phase || undefined }, readIds));

      if (settings) {
        const serverBrand = settings.brand_voice || {};
        setBrandVoice((current) => ({
          ...current,
          facebookTone: serverBrand.tone || current.facebookTone,
          personalityKeywords: serverBrand.personality_keywords || current.personalityKeywords,
          forbiddenWords: serverBrand.avoid_phrases || current.forbiddenWords,
          sentenceStyle: serverBrand.writing_style || current.sentenceStyle,
        }));
        if (settings.agent_configs) {
          setAgentModelConfigs(
            settings.agent_configs.map((cfg: any) => ({
              agentCode: cfg.agent_code,
              selectedModel: cfg.model,
              tier: cfg.tier,
              budgetUSD: cfg.budget_usd_month,
              isActive: cfg.is_active,
            }))
          );
        }
        if (settings.eligible_models) {
          setEligibleModels(settings.eligible_models);
        }
      }
    } catch (cause) {
      if (generation !== tenantGenerationRef.current) return;
      if (isManual) {
        setError(toPortalLoadError(cause, 'bootstrap', 'Không tải được dữ liệu công việc.'));
      }
    } finally {
      if (generation === tenantGenerationRef.current && isManual) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadAssets = useCallback(async (force = false) => {
    if (assetsStatusRef.current === 'loading') return;
    if (!force && assetsStatusRef.current !== 'idle') return;
    const generation = tenantGenerationRef.current;
    const isBackgroundRefresh = force && assetsStatusRef.current === 'ready';
    assetsStatusRef.current = 'loading';
    if (!isBackgroundRefresh) setAssetsStatus('loading');
    setAssetsError(null);
    try {
      const assets = await apiFetchAssets();
      if (generation !== tenantGenerationRef.current) return;
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

  // Live Background Polling: Tự động cập nhật ngầm không ảnh hưởng UI
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshData(false);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const markNotificationRead = useCallback((id: string) => {
    saveReadNotificationId(id);
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

  const updatePillarDraft = useCallback((pillarId: string, changes: Partial<Pick<ContentPillar, 'label' | 'description' | 'angles'>>) => {
    setPillars((previous) => previous.map((pillar) => pillar.id === pillarId ? { ...pillar, ...changes } : pillar));
  }, []);

  const confirmPillars = useCallback(async () => {
    await apiConfirmPillars(pillars.map((pillar) => ({
      pillar_id: pillar.id,
      name: pillar.label,
      description: pillar.description,
      percentage: pillar.percentage,
      angles: pillar.angles.map((angle) => angle.label),
    })));
  }, [pillars]);

  const resetPillarsToAI = useCallback(() => { void refreshData(); }, [refreshData]);

  const approveWeek = useCallback(async () => {
    if (!cycleId) throw new Error('No active cycle is loaded');
    await apiApproveWeek(cycleId);
    setWeekApproved(true);
    setContentItems((previous) => previous.map((item) => item.state === 'planned' ? { ...item, state: 'ready_for_generation' } : item));
  }, [cycleId]);

  const updateContentSchedule = useCallback(async (id: string, publishTime: Date) => {
    const scheduledDate = [publishTime.getFullYear(), String(publishTime.getMonth() + 1).padStart(2, '0'), String(publishTime.getDate()).padStart(2, '0')].join('-');
    const scheduledTime = `${String(publishTime.getHours()).padStart(2, '0')}:${String(publishTime.getMinutes()).padStart(2, '0')}`;
    await apiUpdateContentSchedule(id, scheduledDate, scheduledTime);
    setContentItems((previous) => previous.map((item) => item.id === id ? { ...item, publishTime } : item));
  }, []);

  const uploadAsset = useCallback(async (file: File, rightsAttested: boolean) => {
    const asset = await apiUploadAsset(file, rightsAttested);
    setMediaAssets((previous) => [{
      id: asset.id, url: asset.url, thumbnailUrl: asset.url,
      source: asset.status === 'pending_review'
        ? 'pending_review'
        : asset.source === 'd02_ai_derivative'
          ? 'ai_generated'
          : 'real_photo',
      tags: asset.tags || [], uploadedAt: new Date(asset.created_at), usedInItems: [],
      indexingStatus: asset.indexing_status || 'processing', indexingReason: asset.indexing_reason || null,
      readyForD02: Boolean(asset.ready_for_d02),
    }, ...previous]);
  }, []);

  const setBrandLogoUrl = useCallback((url: string | null) => {
    setBrandLogoUrlState(url);
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('crewlab_brand_logo', url);
      } else {
        localStorage.removeItem('crewlab_brand_logo');
      }
    }
  }, []);

  const uploadBrandLogo = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setBrandLogoUrl(dataUrl);
        // Also try background uploadAsset to save into Supabase asset collection
        apiUploadAsset(file, true).catch(() => null);
        resolve(dataUrl);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }, [setBrandLogoUrl]);

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
    tasks, contentItems, pillars, notifications, mediaAssets, brandVoice, agentModelConfigs, eligibleModels, clientName, portalUserEmail, weekApproved,
    isLoading, error, brandLogoUrl, assetsStatus, assetsError, settingsStatus, settingsError,
    markNotificationRead, unreadCount: notifications.filter((n) => !n.read).length,
    setBrandLogoUrl, uploadBrandLogo,
    approveContent, rejectContent, markAsPosted, updatePillarPercentage, updatePillarDraft, confirmPillars, resetPillarsToAI, approveWeek, updateContentSchedule,
    updateBrandVoice, updateAgentModel, updateAgentBudget, uploadAsset, refreshData, loadAssets, loadSettings,
  };
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalState & PortalActions {
  const context = useContext(PortalContext);
  if (!context) throw new Error('usePortal must be used inside <PortalProvider>');
  return context;
}

export function useOptionalPortal(): (PortalState & PortalActions) | null {
  return useContext(PortalContext);
}
