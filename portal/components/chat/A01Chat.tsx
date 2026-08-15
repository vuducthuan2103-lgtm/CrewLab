'use client';

import React, { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  Folder,
  FolderPlus,
  Layers,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCw,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';

import { ApiError, apiFetchA01Messages, apiSendA01Message, shortSupportReference } from '@/lib/api';
import { A01ChatMessage } from '@/lib/types';
import { useOptionalPortal } from '@/lib/store';
import { toast } from '@/components/ui/Toast';

const SUGGESTIONS = [
  'Lên ý tưởng bài Facebook cho món bán chạy tuần này',
  'Tôi muốn quảng bá chương trình mua 2 tặng 1 trên Instagram',
  'Giúp tôi làm rõ nội dung nên đăng cho dịp cuối tuần',
  'Viết bài giới thiệu không gian quán phong cách vintage',
];

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  color: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  projectId?: string | null;
  messages: A01ChatMessage[];
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-back-to-school',
    name: 'Chiến dịch Back to School',
    description: 'Thu hút học sinh - sinh viên đầu năm học, ưu đãi combo trà & bánh',
    instructions: 'Tone giọng Gen Z năng động, gần gũi, dùng ngôn ngữ trẻ trung và nhiều icon.',
    color: '#D4FF00', // Lime
    createdAt: '2026-08-10T08:00:00.000Z',
  },
  {
    id: 'proj-cold-brew',
    name: 'Ra mắt Cold Brew Mới',
    description: 'Giới thiệu 3 vị cà phê ủ lạnh thủ công 24h',
    instructions: 'Phong cách tinh tế, sành điệu, nhấn mạnh chất lượng hạt Arabica Cầu Đất nguyên chất.',
    color: '#06b6d4', // Cyan
    createdAt: '2026-08-05T08:00:00.000Z',
  },
];

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: 'session-default-1',
    title: 'Lên ý tưởng tuần 33 cho quán',
    projectId: null,
    updatedAt: '2026-08-15T10:00:00.000Z',
    messages: [],
  },
  {
    id: 'session-default-2',
    title: 'Tạo caption Instagram Back to School',
    projectId: 'proj-back-to-school',
    updatedAt: '2026-08-14T14:30:00.000Z',
    messages: [
      {
        id: 'mock-1',
        user_message: 'Viết caption Instagram chủ đề Back to School cho quán cà phê',
        assistant_message: 'Đã nhận yêu cầu viết caption Instagram chủ đề Back to School. Đội sáng tạo sẽ soạn caption theo phong cách gần gũi, Gen Z và gửi bạn duyệt sớm nhé.',
        action: 'create_content',
        dispatch_status: 'dispatched',
        content_item_id: 'content-1',
        created_at: '2026-08-14T14:30:00.000Z',
      },
    ],
  },
  {
    id: 'session-default-3',
    title: 'Khuyến mãi Mua 2 Tặng 1',
    projectId: 'proj-back-to-school',
    updatedAt: '2026-08-13T09:15:00.000Z',
    messages: [
      {
        id: 'mock-2',
        user_message: 'Lên kế hoạch khuyến mãi Mua 2 tặng 1 thứ 7 và chủ nhật này',
        assistant_message: 'A01 đã ghi nhận thông tin chương trình Mua 2 Tặng 1. Đang điều phối Agent B03 lên lịch và D01 viết bài thông báo trên fanpage.',
        action: 'create_content',
        dispatch_status: 'dispatched',
        content_item_id: 'content-2',
        created_at: '2026-08-13T09:15:00.000Z',
      },
    ],
  },
  {
    id: 'session-default-4',
    title: 'Giới thiệu Cold Brew Cam Sả',
    projectId: 'proj-cold-brew',
    updatedAt: '2026-08-12T16:20:00.000Z',
    messages: [],
  },
];

type A01Error = {
  message: string;
  code: string | null;
  provider: string | null;
  providerRequestId: string | null;
  supportReference: string | null;
};

function toA01Error(cause: unknown, fallback: string): A01Error {
  if (cause instanceof ApiError) {
    return {
      message: cause.message,
      code: cause.errorCode,
      provider: cause.provider,
      providerRequestId: cause.providerRequestId,
      supportReference: cause.supportReference,
    };
  }
  return {
    message: cause instanceof Error ? cause.message : fallback,
    code: null,
    provider: null,
    providerRequestId: null,
    supportReference: null,
  };
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.copy('Đã sao chép câu trả lời của A01');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      title="Sao chép câu trả lời"
    >
      {copied ? <Check size={13} className="text-lime-brand" /> : <Copy size={13} />}
    </button>
  );
}

function DispatchBadge({ message }: { message: A01ChatMessage }) {
  if (message.action !== 'create_content') return null;
  const pending = message.dispatch_status === 'pending';
  return (
    <div
      className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        pending
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          : 'border-lime-500/30 bg-lime-500/10 text-lime-brand'
      }`}
    >
      {pending ? <CircleAlert size={12} /> : <CheckCircle2 size={12} />}
      {pending ? 'Đã nhận, đang chờ hệ thống xử lý' : 'Đã giao vào quy trình nội dung'}
    </div>
  );
}

export default function A01Chat() {
  const portal = useOptionalPortal();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Projects State
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crewlab_a01_projects');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_PROJECTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Modal Create Project State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectInstructions, setNewProjectInstructions] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#D4FF00');

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crewlab_a01_sessions');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'session-default-1');
  const [draft, setDraft] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<A01Error | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeProject = projects.find((p) => p.id === (selectedProjectId || activeSession?.projectId));

  // Dynamic model configuration from backend for A01
  const a01Config = portal?.agentModelConfigs?.find((c) => c.agentCode === 'A01');
  const a01Eligible = portal?.eligibleModels?.find((m) => m.id === a01Config?.selectedModel);
  const a01ModelLabel = a01Eligible?.label || a01Config?.selectedModel || null;

  const [isReloading, setIsReloading] = useState(false);
  const [reloadSuccess, setReloadSuccess] = useState(false);

  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Persist projects to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crewlab_a01_projects', JSON.stringify(projects));
    }
  }, [projects]);

  // Persist sessions to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crewlab_a01_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Load and synchronize chat history directly from backend (stable, no loop)
  const loadServerHistory = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsReloading(true);
      setReloadSuccess(false);
    } else {
      setLoadingHistory(true);
    }
    setError(null);

    try {
      const history = await apiFetchA01Messages(100);
      if (history && history.length > 0) {
        setSessions((prev) => {
          const currentTargetId = activeSessionIdRef.current || prev[0]?.id || 'session-default-1';
          return prev.map((s) =>
            s.id === currentTargetId
              ? {
                  ...s,
                  title:
                    s.title === 'Đoạn chat mới' || s.title.startsWith('Lên ý tưởng')
                      ? history[0]?.user_message?.slice(0, 32) || s.title
                      : s.title,
                  messages: history,
                  updatedAt: new Date().toISOString(),
                }
              : s
          );
        });
      }
      if (isManual) {
        setReloadSuccess(true);
        setTimeout(() => setReloadSuccess(false), 2000);
      }
    } catch (cause) {
      setError(toA01Error(cause, 'Không tải được lịch sử cuộc trò chuyện từ máy chủ.'));
    } finally {
      setLoadingHistory(false);
      setIsReloading(false);
    }
  }, []);

  // Run once on initial mount
  useEffect(() => {
    let active = true;
    if (active) {
      void loadServerHistory(false);
    }
    return () => {
      active = false;
    };
  }, [loadServerHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeSession?.messages, sending]);

  const handleNewChat = (targetProjectId: string | null = selectedProjectId) => {
    const newId = `session-${Date.now()}`;
    const targetProj = projects.find((p) => p.id === targetProjectId);
    const defaultTitle = targetProj ? `Chat trong ${targetProj.name}` : 'Đoạn chat mới';

    const newSession: ChatSession = {
      id: newId,
      title: defaultTitle,
      projectId: targetProjectId,
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setDraft('');
    setError(null);
    setShowSuggestions(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleCreateProject = (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || 'Dự án marketing tùy chỉnh',
      instructions: newProjectInstructions.trim(),
      color: newProjectColor,
      createdAt: new Date().toISOString(),
    };

    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
    setIsCreateProjectOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectInstructions('');

    // Open a fresh chat tagged to the new project
    handleNewChat(newProj.id);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0]?.id || '');
    }
  };

  async function sendMessage(value = draft) {
    const message = value.trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    setShowSuggestions(false);

    try {
      const response = await apiSendA01Message(message);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const isFirst = s.messages.length === 0;
            const updatedTitle = isFirst
              ? message.length > 32
                ? message.slice(0, 32) + '...'
                : message
              : s.title;
            return {
              ...s,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, response],
            };
          }
          return s;
        })
      );

      setDraft('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      portal?.refreshData();
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (cause) {
      setError(toA01Error(cause, 'Không gửi được tin nhắn. Vui lòng thử lại.'));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  // Filter sessions by selected project if one is active
  const filteredSessions = selectedProjectId
    ? sessions.filter((s) => s.projectId === selectedProjectId)
    : sessions;

  const currentMessages = activeSession?.messages || [];

  return (
    <div className="h-full w-full flex overflow-hidden bg-background relative">
      {/* ─── ChatGPT-Style Left Sub-Sidebar (History & Projects) ─── */}
      <aside
        className={`h-full bg-zinc-950/95 border-r border-zinc-800/80 flex flex-col shrink-0 transition-all duration-300 z-20 ${
          sidebarOpen ? 'w-64' : 'w-0 border-r-0 overflow-hidden'
        }`}
      >
        {/* Top: New Chat Button */}
        <div className="p-3 border-b border-zinc-800/60">
          <button
            onClick={() => handleNewChat(selectedProjectId)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-all group shadow-sm text-left"
          >
            <Plus size={15} className="text-zinc-400 group-hover:text-white transition-colors shrink-0" />
            <span>Đoạn chat mới</span>
          </button>
        </div>

        {/* Projects Section */}
        <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60">
          <div className="flex items-center justify-between px-1 mb-1 text-[11px] font-medium text-zinc-400">
            <span>Dự án</span>
            <button
              type="button"
              onClick={() => setIsCreateProjectOpen(true)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Tạo dự án mới"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="space-y-0.5">
            {/* View All (General Chats) */}
            <button
              onClick={() => {
                setSelectedProjectId(null);
                const generalChat = sessions.find((s) => !s.projectId) || sessions[0];
                if (generalChat) {
                  setActiveSessionId(generalChat.id);
                } else {
                  handleNewChat(null);
                }
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                selectedProjectId === null
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Folder size={13} className={selectedProjectId === null ? 'text-zinc-200' : 'text-zinc-500'} />
              <span className="truncate">Tất cả đoạn chat</span>
            </button>

            {/* Project List */}
            {projects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    if (isSelected) {
                      // Toggle off back to general chat
                      setSelectedProjectId(null);
                      const generalChat = sessions.find((s) => !s.projectId) || sessions[0];
                      if (generalChat) setActiveSessionId(generalChat.id);
                    } else {
                      setSelectedProjectId(proj.id);
                      const projectChats = sessions.filter((s) => s.projectId === proj.id);
                      if (projectChats.length > 0) {
                        setActiveSessionId(projectChats[0].id);
                      } else {
                        handleNewChat(proj.id);
                      }
                    }
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || '#a1a1aa' }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-opacity rounded"
                    title="Xóa dự án"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recents / History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-zinc-400">
            <span>{selectedProjectId ? 'Đoạn chat trong dự án' : 'Gần đây'}</span>
            <button
              type="button"
              onClick={() => void loadServerHistory(true)}
              disabled={isReloading}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Đồng bộ lịch sử"
            >
              <RotateCw size={11} className={isReloading ? 'animate-spin' : ''} />
            </button>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-zinc-400">
              <p>Chưa có đoạn chat nào trong dự án này.</p>
              <button
                onClick={() => handleNewChat(selectedProjectId)}
                className="mt-2 text-xs text-lime-brand hover:underline"
              >
                + Bắt đầu chat mới
              </button>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const proj = projects.find((p) => p.id === session.projectId);

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setError(null);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    <MessageSquare size={13} className={isActive ? 'text-lime-brand' : 'text-zinc-500'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{session.title}</p>
                      {proj && !selectedProjectId && (
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <Tag size={9} style={{ color: proj.color }} />
                          {proj.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity rounded"
                      title="Xóa đoạn chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Profile / Assistant Status */}
        <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-lime-brand shrink-0">
              A01
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">CrewLab AI Assistant</p>
              <p className="text-[10px] text-zinc-400 truncate">Văn phòng 6 Agents</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Chat Window ─── */}
      <section className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-background">
        {/* Header Bar */}
        <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/40 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={sidebarOpen ? 'Đóng thanh bên' : 'Mở thanh bên'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm font-bold text-foreground truncate">
                {activeSession?.title || 'Trò chuyện với A01'}
              </span>

              {activeProject && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800/90 text-zinc-200"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject.color }} />
                  {activeProject.name}
                </span>
              )}

              {a01ModelLabel && (
                <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {a01ModelLabel}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Project Context Header Banner if Active Project */}
        {activeProject && (
          <div className="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800/60 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Folder size={14} style={{ color: activeProject.color }} className="shrink-0" />
              <span className="font-semibold text-white truncate">{activeProject.name}</span>
              <span className="text-zinc-400 truncate hidden sm:inline">• {activeProject.description}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedProjectId(null);
                const generalChat = sessions.find((s) => !s.projectId) || sessions[0];
                if (generalChat) setActiveSessionId(generalChat.id);
                else handleNewChat(null);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0 ml-2"
              title="Rời khỏi dự án và quay về đoạn chat bình thường"
            >
              <X size={12} />
              <span>Rời dự án</span>
            </button>
          </div>
        )}

        {/* Message Thread (Centered ChatGPT Container) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 min-h-0" aria-live="polite">
          {loadingHistory && currentMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2.5 text-sm text-muted-foreground">
              <Loader2 size={18} className="animate-spin text-lime-brand" />
              <span>Đang tải lịch sử trò chuyện...</span>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center pb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/80 shadow-lg">
                <Bot size={26} className="text-lime-brand" />
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {activeProject
                  ? `Khởi động dự án: ${activeProject.name}`
                  : `Bạn muốn A01 điều phối việc gì hôm nay?`}
              </h2>
              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {activeProject
                  ? activeProject.description
                  : `Trao đổi ý tưởng, nhờ A01 biên soạn bài viết, lên kế hoạch tuần hoặc điều phối các agent D01, D02, E01.`}
              </p>

              <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2 text-left">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setDraft(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="group p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/90 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-all shadow-sm flex flex-col justify-between"
                  >
                    <span className="leading-snug">{suggestion}</span>
                    <span className="text-[10px] text-zinc-500 group-hover:text-lime-brand mt-2 flex items-center gap-1 font-medium">
                      Chọn gợi ý &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {currentMessages.map((message) => (
                <div key={message.id} className="space-y-6">
                  {/* User Bubble - Soft, gentle, comfortable tone */}
                  <div className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-[#27272a] hover:bg-[#2d2d30] border border-zinc-700/60 px-4 py-2.5 text-sm leading-relaxed text-[#f4f4f5] shadow-sm transition-colors">
                      <p className="whitespace-pre-wrap font-normal text-zinc-100">{message.user_message}</p>
                      <p className="mt-1 text-right text-[10px] text-zinc-400 font-mono">
                        {timeLabel(message.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* AI Response (Gentle, clean, readable ChatGPT Style) */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800/90 text-lime-400 shadow-sm mt-0.5">
                      <Bot size={15} />
                    </div>

                    <div className="flex-1 space-y-2 max-w-[88%]">
                      <div className="text-sm leading-relaxed text-[#d4d4d8] whitespace-pre-wrap font-normal">
                        {message.assistant_message}
                      </div>

                      <DispatchBadge message={message} />

                      {/* Action Row */}
                      <div className="flex items-center gap-2 pt-1">
                        <CopyButton text={message.assistant_message} />
                        <button
                          type="button"
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors"
                          title="Hữu ích"
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors"
                          title="Chưa hài lòng"
                        >
                          <ThumbsDown size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {sending && (
                <div className="flex items-start gap-3.5 animate-in fade-in duration-200">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-lime-brand shadow-sm">
                    <Bot size={15} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
                    <Loader2 size={13} className="animate-spin text-lime-brand" />
                    <span>A01 đang suy nghĩ và điều phối...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ─── Bottom ChatGPT Floating Input Dock ─── */}
        <footer className="p-4 pb-4 sm:pb-5 pt-1 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
          {/* Error Alert */}
          {error && (
            <div role="alert" className="max-w-3xl mx-auto mb-2 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-400">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">{error.message}</span>
                {(error.code || error.provider || error.providerRequestId || error.supportReference) && (
                  <span className="mt-0.5 block text-[10px] opacity-80 font-mono">
                    {error.code && `Mã lỗi: ${error.code}`}
                    {error.provider && ` · Provider: ${error.provider}`}
                    {error.providerRequestId && ` · Provider request: ${error.providerRequestId}`}
                    {error.supportReference && ` · Mã hỗ trợ: ${shortSupportReference(error.supportReference)}`}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Quick suggestions if opened */}
          {showSuggestions && (
            <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setDraft(s);
                    setShowSuggestions(false);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white transition-colors"
                >
                  ✨ {s}
                </button>
              ))}
            </div>
          )}

          {/* Floating Pill Input Box */}
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full">
            <div className="rounded-[26px] bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/60 p-2 sm:p-2.5 shadow-2xl backdrop-blur-xl flex items-end gap-2 transition-all focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-400/20 focus-within:bg-zinc-800">
              {/* Plus button */}
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/70 transition-colors flex-shrink-0 mb-0.5 ${
                  showSuggestions ? 'bg-zinc-700 text-white' : ''
                }`}
                title="Gợi ý mẫu prompt"
              >
                <Plus size={18} className={`transition-transform duration-150 ${showSuggestions ? 'rotate-45' : ''}`} />
              </button>

              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeProject
                    ? `Nhắn tin cho A01 về dự án "${activeProject.name}"...`
                    : 'Nhắn tin cho A01...'
                }
                rows={1}
                maxLength={4000}
                disabled={sending}
                aria-label="Nhắn tin cho A01"
                className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm text-zinc-100 placeholder-zinc-400 resize-none py-1.5 px-1 max-h-36 min-h-[36px] leading-relaxed"
              />

              {/* Send Button */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mb-0.5">
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    draft.trim() && !sending
                      ? 'bg-white text-black hover:opacity-90 shadow-md scale-100'
                      : 'bg-zinc-700/60 text-zinc-500 cursor-not-allowed opacity-50'
                  }`}
                  title="Gửi tin nhắn (Enter)"
                  aria-label="Gửi tin nhắn"
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ArrowUp size={16} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center mt-2 font-normal">
              A01 có thể mắc lỗi. Hãy kiểm tra các thông tin quan trọng trước khi duyệt xuất bản.
            </p>
          </form>
        </footer>
      </section>

      {/* ─── Modal: Tạo Dự Án Marketing Mới (Create New Project Dialog) ─── */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-lime-500/10 text-lime-brand">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tạo Dự Án Marketing Mới</h3>
                  <p className="text-[11px] text-zinc-400">Không gian riêng với mục tiêu & phong cách tùy chỉnh</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateProjectOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tên dự án <span className="text-lime-brand">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khai trương chi nhánh 2, Menu Thu Đông 2026..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-lime-brand focus:outline-none focus:ring-1 focus:ring-lime-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Mục tiêu & Định hướng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Thu hút 500 khách hàng trẻ, đẩy mạnh bán mang về và combo..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-lime-brand focus:outline-none focus:ring-1 focus:ring-lime-brand resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Yêu cầu riêng cho A01 (Tông giọng, phong cách)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Giọng văn hài hước, ngắn gọn, dùng nhiều emoji, nhấn mạnh ưu đãi..."
                  value={newProjectInstructions}
                  onChange={(e) => setNewProjectInstructions(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-lime-brand focus:outline-none focus:ring-1 focus:ring-lime-brand resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Màu sắc đại diện
                </label>
                <div className="flex items-center gap-2">
                  {['#D4FF00', '#06b6d4', '#a855f7', '#f97316', '#10b981', '#ec4899'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewProjectColor(col)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newProjectColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-xl bg-lime-brand hover:bg-lime-400 text-black text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
