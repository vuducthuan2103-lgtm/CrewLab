'use client';

import React, { useState } from 'react';
import { AGENT_PERSONA_CATALOG, AgentPersonaData } from '../config/agent-personas';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';
import {
  Sparkles,
  Zap,
  Target,
  Clock,
  ShieldCheck,
  Coffee,
  HeartHandshake,
  FileText,
  CheckCircle2,
  ChevronRight,
  Search,
  ExternalLink,
  Flame,
  Bot,
  BrainCircuit,
  MessageSquareQuote,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useOfficeStore } from '../state/office-store';
import { AgentCode } from '../types/office';

interface AgentDossierViewProps {
  onSelectAgentIn3D?: (code: AgentCode) => void;
}

export const AgentDossierView: React.FC<AgentDossierViewProps> = ({ onSelectAgentIn3D }) => {
  const [selectedCode, setSelectedCode] = useState<string>('A01');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const agents = useOfficeStore((s) => s.agents);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  const personas = Object.values(AGENT_PERSONA_CATALOG);
  const activePersona = AGENT_PERSONA_CATALOG[selectedCode] || AGENT_PERSONA_CATALOG['A01'];
  const activeLiveAgent = agents[selectedCode];

  // Filters
  const filteredPersonas = personas.filter((p) => {
    const matchesSearch =
      p.realName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory === 'leader') return p.code === 'A01';
    if (filterCategory === 'strategy') return p.code === 'B02' || p.code === 'B03';
    if (filterCategory === 'creative') return p.code === 'D01' || p.code === 'D02';
    if (filterCategory === 'qa') return p.code === 'E01';
    return true;
  });

  const handleJumpTo3D = (code: string) => {
    selectAgent(code as AgentCode);
    if (onSelectAgentIn3D) {
      onSelectAgentIn3D(code as AgentCode);
    }
  };

  return (
    <div
      className="w-full h-full bg-[#09090D] text-zinc-100 overflow-y-auto"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#D4FF00]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══════════════════════════════════
            1. HERO HEADER
           ═══════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HỒ SƠ NHÂN SỰ MARKETING AI • CREWLAB</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Biệt Đội 6 Nhân Sự AI <span className="text-[#D4FF00]">Bardinh F&B</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Mỗi Agent đóng vai một chuyên gia thực chiến với cá tính, giọng văn và tuyệt chiêu riêng biệt. Tự động hóa 100% quy trình từ nghiên cứu xu hướng, lên lịch, viết bài, thiết kế ảnh đến thẩm định chất lượng.
            </p>
          </div>

          {/* Quick Metrics Bar — honest counts only, no fabricated performance numbers */}
          <div className="flex items-center gap-3 bg-[#121217]/90 p-3 rounded-2xl border border-zinc-800/80 backdrop-blur-xl">
            <div className="text-center px-3 border-r border-zinc-800">
              <div className="text-xl font-black text-[#D4FF00]">6/6</div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase">Agent Vận Hành</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xl font-black text-emerald-400">MVP</div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase">Phase 1</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            2. FILTER & SEARCH BAR
           ═══════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121217] border border-zinc-800 self-start overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Tất cả 6 Agent' },
              { id: 'leader', label: 'Điều Phối (A01)' },
              { id: 'strategy', label: 'Chiến Lược (B02/B03)' },
              { id: 'creative', label: 'Sáng Tạo (D01/D02)' },
              { id: 'qa', label: 'Thẩm Định (E01)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterCategory === tab.id
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-md shadow-[#D4FF00]/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, vai trò..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#121217] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4FF00]/70 transition-colors"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════
            3. MAIN SHOWCASE: ROSTER GRID + DEEP PROFILE INSPECT
           ═══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Agent Roster Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between px-1">
              <span>Danh Sách Nhân Sự ({filteredPersonas.length})</span>
              <span className="text-[10px] text-zinc-500">Click để mở hồ sơ chi tiết</span>
            </div>

            <div className="space-y-3">
              {filteredPersonas.map((persona) => {
                const isSelected = selectedCode === persona.code;
                const liveAgent = agents[persona.code];

                return (
                  <div
                    key={persona.code}
                    onClick={() => setSelectedCode(persona.code)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-[#15151c] border-opacity-100 shadow-2xl scale-[1.01]'
                        : 'bg-[#101015]/90 hover:bg-[#15151c] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: persona.accentColor,
                            boxShadow: `0 8px 30px ${persona.primaryColor}25`,
                          }
                        : {}
                    }
                  >
                    {/* Active Gradient Side Indicator */}
                    {isSelected && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: persona.accentColor }}
                      />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Avatar Illustration */}
                      <AgentAvatarIllustration code={persona.code} size="lg" />

                      {/* Info snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-black text-white tracking-tight group-hover:text-[#D4FF00] transition-colors">
                              {persona.realName}
                            </span>
                            <span className="text-[11px] text-zinc-400">• {persona.age}t</span>
                          </div>

                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                            style={{
                              backgroundColor: `${persona.primaryColor}20`,
                              borderColor: `${persona.accentColor}50`,
                              color: persona.accentColor,
                            }}
                          >
                            {persona.badge}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-zinc-300 mt-0.5 truncate">
                          {persona.nickname}
                        </div>

                        <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                          {persona.fnbSpecialty}
                        </div>

                        {/* Signature move pill */}
                        <div className="mt-2.5 flex items-center text-[10px]">
                          <span className="text-zinc-500 font-mono flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400" />
                            {persona.signatureMove.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Dossier Inspect Panel (7 cols) */}
          <div className="lg:col-span-7">
            <div className="sticky top-6 rounded-3xl bg-[#111116] border border-zinc-800/90 p-6 sm:p-8 space-y-6 shadow-2xl overflow-hidden relative">
              {/* Background gradient banner */}
              <div
                className={`absolute top-0 left-0 right-0 h-36 bg-gradient-to-r ${activePersona.gradientBg} opacity-20 blur-xl`}
              />

              {/* Dossier Header */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-5 pb-6 border-b border-zinc-800/80">
                <div className="flex items-start gap-4">
                  <AgentAvatarIllustration code={activePersona.code} size="xl" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border"
                        style={{
                          backgroundColor: `${activePersona.primaryColor}25`,
                          borderColor: activePersona.accentColor,
                          color: activePersona.accentColor,
                        }}
                      >
                        {activePersona.code}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">{activePersona.modelTech}</span>
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {activePersona.realName}
                    </h2>

                    <div className="text-sm font-bold text-[#D4FF00]">
                      {activePersona.nickname}
                    </div>

                    <div className="text-xs text-zinc-400">
                      {activePersona.title}
                    </div>
                  </div>
                </div>

                {/* Jump to 3D Workstation Button */}
                <button
                  onClick={() => handleJumpTo3D(activePersona.code)}
                  className="px-4 py-2.5 rounded-xl bg-[#D4FF00] hover:bg-[#E5FF55] text-[#09090B] font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#D4FF00]/15 shrink-0"
                >
                  <Bot className="w-4 h-4" />
                  <span>Xem vị trí trong 3D</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quote Box */}
              <div
                className="p-4 rounded-2xl border text-xs sm:text-sm font-medium leading-relaxed italic relative"
                style={{
                  backgroundColor: `${activePersona.primaryColor}12`,
                  borderColor: `${activePersona.accentColor}40`,
                  color: '#f4f4f5',
                }}
              >
                <MessageSquareQuote className="w-5 h-5 absolute right-3 top-3 text-zinc-600" />
                {activePersona.quote}
              </div>

              {/* 4 Persona Metrics — clearly labeled as PERSONA/LORE, not factual production data */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">PERSONA</span>
                  Đặc điểm nhân vật
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#17171f] border border-zinc-800 text-center space-y-1">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      Phong cách
                    </div>
                    <div className="text-base font-black text-white font-mono">{activePersona.metrics.responseTime}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#17171f] border border-zinc-800 text-center space-y-1">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Chính xác
                    </div>
                    <div className="text-base font-black text-emerald-400 font-mono">{activePersona.metrics.accuracyRate}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#17171f] border border-zinc-800 text-center space-y-1">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      Tư duy sáng tạo
                    </div>
                    <div className="text-base font-black text-amber-400 font-mono">{activePersona.metrics.viralIndex}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#17171f] border border-zinc-800 text-center space-y-1">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center justify-center gap-1">
                      <BrainCircuit className="w-3 h-3 text-purple-400" />
                      Cấp F&B
                    </div>
                    <div className="text-[11px] font-bold text-purple-300 truncate">{activePersona.metrics.fnbDomainIQ}</div>
                  </div>
                </div>
              </div>

              {/* Bio & Backstory */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#D4FF00]" />
                  <span>Tiểu Sử & Kinh Nghiệm Thực Chiến</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activePersona.bio}
                </p>
                <div className="p-3.5 rounded-xl bg-[#16161d] border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Kỷ niệm đáng nhớ: </strong>
                  {activePersona.backstory}
                </div>
              </div>

              {/* Superpower Signature Move */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#181824] to-[#14141e] border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {activePersona.signatureMove.tag}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Độc Quyền
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {activePersona.signatureMove.name}
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activePersona.signatureMove.description}
                </p>
              </div>

              {/* Personality Quirks & Favorites */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#14141a] border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-[#D4FF00]" />
                    Món ruột tại Bardinh
                  </div>
                  <div className="font-semibold text-zinc-200">{activePersona.favoriteDrink}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#14141a] border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Target className="w-3 h-3 text-rose-400" />
                    Nỗi sợ lớn nhất
                  </div>
                  <div className="font-semibold text-zinc-300 leading-snug">{activePersona.biggestFear}</div>
                </div>
              </div>

              {/* Sample Work Showcase */}
              <div className="p-4 rounded-2xl bg-[#14141e] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Tác Phẩm Tiêu Biểu
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                    {activePersona.sampleWork.type}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white">
                  {activePersona.sampleWork.title}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {activePersona.sampleWork.preview}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
