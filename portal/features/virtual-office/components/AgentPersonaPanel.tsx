'use client';

import React, { useState } from 'react';
import { X, Star, Zap, Target, Clock, ChevronRight } from 'lucide-react';

interface AgentPersona {
  code: string;
  realName: string;
  age: number;
  slogan: string;
  bio: string;
  catchphrase: string;
  avatarColor: string;
  accentColor: string;
  stats: {
    creativity: number;    // 0-100
    discipline: number;    // 0-100
    expertise: number;     // 0-100
    speed: number;         // 0-100
  };
  emoji: string;
  role: string;
}

const AGENT_PERSONAS: AgentPersona[] = [
  {
    code: 'A01',
    realName: 'Sếp Vũ',
    age: 42,
    slogan: '"Tôi không quản người — tôi quản kết quả."',
    bio: '20 năm lăn lộn trong nghề marketing, từng làm agency cho đến khi quyết định "chiêu mộ" một đội AI toàn thời gian. Sáng nào cũng uống 2 ly cà phê đen trước 7h và không có khái niệm "ngủ trưa". Thỉnh thoảng hát nhạc Trịnh trong lúc review bài.',
    catchphrase: '🎯 "Anh không cần bài dài — anh cần bài ĐÚNG!"',
    avatarColor: '#2563eb',
    accentColor: '#60a5fa',
    stats: { creativity: 78, discipline: 95, expertise: 90, speed: 72 },
    emoji: '👔',
    role: 'Giám đốc Điều phối AI',
  },
  {
    code: 'B02',
    realName: 'Chị Hà',
    age: 31,
    slogan: '"Insight đúng là nền tảng của mọi content hay."',
    bio: 'Cựu content strategist của một agency Hà Nội, nghiện đọc báo cáo xu hướng tiêu dùng đến mức nghỉ lễ vẫn đọc. Hay dùng cụm từ "cái này viral lắm anh ơi" và 80% thời gian là đúng. Bộ sưu tập note màu vàng của chị nhiều hơn sách trong nhà.',
    catchphrase: '💡 "Anh ơi, cái này viral lắm anh ơi!"',
    avatarColor: '#059669',
    accentColor: '#34d399',
    stats: { creativity: 88, discipline: 72, expertise: 85, speed: 70 },
    emoji: '📊',
    role: 'Chiến lược gia Nội dung',
  },
  {
    code: 'B03',
    realName: 'Anh Minh',
    age: 35,
    slogan: '"Mọi thứ đều có lịch — và lịch không bao giờ sai."',
    bio: 'Cựu project manager với niềm tin sắt đá rằng "deadline là deadline, không có ngoại lệ". Lên lịch chính xác đến từng phút, kể cả lịch ăn trưa. Từng reject một chiến dịch chỉ vì bài đăng lệch múi giờ 3 phút. Dùng 4 màu highlight khác nhau cho mỗi loại nội dung.',
    catchphrase: '📅 "Deadline là deadline, không có ngoại lệ!"',
    avatarColor: '#0d9488',
    accentColor: '#2dd4bf',
    stats: { creativity: 55, discipline: 99, expertise: 80, speed: 88 },
    emoji: '📋',
    role: 'Chuyên viên Lịch xuất bản',
  },
  {
    code: 'D01',
    realName: 'Bé Thư',
    age: 24,
    slogan: '"Caption hay là caption khiến người ta dừng scroll."',
    bio: 'Gen Z chính hiệu, sống ảo trên Facebook từ năm 14 tuổi. Caption nào cũng có ít nhất 3 emoji, thích dùng chữ "chill" và "vibe". Từng viết một post về trà sữa mà khiến quán hàng xóm ghen tị. Nghe nhạc lofi khi làm việc và claim rằng "nghe vậy mới ra chữ".',
    catchphrase: '✨ "Đợi em chút, em đang tìm đúng vibe ạ~"',
    avatarColor: '#d97706',
    accentColor: '#fbbf24',
    stats: { creativity: 96, discipline: 58, expertise: 75, speed: 85 },
    emoji: '✍️',
    role: 'Copywriter Gen Z',
  },
  {
    code: 'D02',
    realName: 'Anh Khoa',
    age: 29,
    slogan: '"Màu sắc không chỉ là thẩm mỹ — đó là tâm lý học."',
    bio: 'Designer 5 năm kinh nghiệm, không bao giờ hài lòng với font chữ trừ khi thử ít nhất 12 loại. Hay nói "để anh thử thêm màu nữa" và thêm 3 tiếng sau vẫn đang thử. Coi kerning là nghệ thuật linh thiêng và từng reject cả khách hàng vì "không thể dùng màu đó với font này được".',
    catchphrase: '🎨 "Khoan đã, để anh thử thêm 1 màu nữa..."',
    avatarColor: '#ea580c',
    accentColor: '#fb923c',
    stats: { creativity: 94, discipline: 62, expertise: 88, speed: 55 },
    emoji: '🎨',
    role: 'Thiết kế Visual AI',
  },
  {
    code: 'E01',
    realName: 'Chị Lan',
    age: 38,
    slogan: '"Bài hay không phải bài đẹp — bài hay là bài ĐÚNG."',
    bio: 'QA cực kỳ nghiêm khắc, từng reject 3 bài liên tiếp của D01 chỉ vì thiếu dấu phẩy ở câu cuối. Đọc brief kỹ hơn đọc sách giáo khoa. Có một checklist 47 tiêu chí tự tạo và không bao giờ bỏ sót điểm nào. Cộng đồng D01 hay gọi chị là "Yêu Tinh Chấm Điểm".',
    catchphrase: '🔍 "Thiếu dấu phẩy thôi là không đạt nhé!"',
    avatarColor: '#7c3aed',
    accentColor: '#a78bfa',
    stats: { creativity: 60, discipline: 100, expertise: 92, speed: 65 },
    emoji: '✅',
    role: 'Kiểm duyệt Viên QA',
  },
];

interface StatBarProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, color, icon }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[10px]">
      <span className="flex items-center gap-1 text-zinc-400">
        {icon}
        {label}
      </span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

interface AgentPersonaCardProps {
  persona: AgentPersona;
  isExpanded: boolean;
  onSelect: () => void;
}

const AgentPersonaCard: React.FC<AgentPersonaCardProps> = ({ persona, isExpanded, onSelect }) => {
  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isExpanded
          ? 'border-opacity-80 shadow-xl'
          : 'border-zinc-800 hover:border-zinc-600 bg-[#111115]'
      }`}
      style={
        isExpanded
          ? {
              borderColor: persona.accentColor,
              background: `linear-gradient(135deg, ${persona.avatarColor}18, #111115 60%)`,
              boxShadow: `0 0 30px ${persona.avatarColor}22`,
            }
          : {}
      }
      onClick={onSelect}
    >
      {/* Card Header — always visible */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar Circle */}
        <div
          className="relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${persona.avatarColor}, ${persona.accentColor})`,
            boxShadow: isExpanded ? `0 4px 16px ${persona.avatarColor}66` : 'none',
          }}
        >
          <span>{persona.emoji}</span>
          {/* Agent code badge */}
          <span
            className="absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded-md border"
            style={{
              backgroundColor: '#09090b',
              borderColor: persona.accentColor,
              color: persona.accentColor,
            }}
          >
            {persona.code}
          </span>
        </div>

        {/* Name & role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-bold"
              style={{ color: isExpanded ? persona.accentColor : '#f4f4f5' }}
            >
              {persona.realName}
            </span>
            <span className="text-[10px] text-zinc-500">• {persona.age} tuổi</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">{persona.role}</div>
        </div>

        <ChevronRight
          className={`w-4 h-4 text-zinc-600 flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-4 space-y-3 border-t border-zinc-800/60">
          {/* Slogan */}
          <div
            className="mt-3 px-2.5 py-2 rounded-lg text-[10px] italic font-medium"
            style={{
              background: `${persona.avatarColor}18`,
              borderLeft: `3px solid ${persona.accentColor}`,
              color: persona.accentColor,
            }}
          >
            {persona.slogan}
          </div>

          {/* Bio */}
          <p className="text-[11px] text-zinc-300 leading-relaxed">{persona.bio}</p>

          {/* Catchphrase */}
          <div className="px-2.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-200 font-medium">
            {persona.catchphrase}
          </div>

          {/* Stats */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chỉ số năng lực</div>
            <StatBar label="Sáng tạo" value={persona.stats.creativity} color="#f59e0b" icon={<Star className="w-2.5 h-2.5" />} />
            <StatBar label="Kỷ luật" value={persona.stats.discipline} color="#38bdf8" icon={<Target className="w-2.5 h-2.5" />} />
            <StatBar label="Chuyên môn" value={persona.stats.expertise} color={persona.accentColor} icon={<Zap className="w-2.5 h-2.5" />} />
            <StatBar label="Tốc độ" value={persona.stats.speed} color="#a78bfa" icon={<Clock className="w-2.5 h-2.5" />} />
          </div>
        </div>
      )}
    </div>
  );
};

interface AgentPersonaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentPersonaPanel: React.FC<AgentPersonaPanelProps> = ({ isOpen, onClose }) => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: '340px',
        background: 'linear-gradient(180deg, #0d0d10 0%, #0a0a0d 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
        <div>
          <div className="text-sm font-bold text-white">Hồ Sơ Nhân Viên</div>
          <div className="text-[10px] text-zinc-500">Click vào từng thành viên để biết thêm 🙂</div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {AGENT_PERSONAS.map((persona) => (
          <AgentPersonaCard
            key={persona.code}
            persona={persona}
            isExpanded={expandedCode === persona.code}
            onSelect={() =>
              setExpandedCode(expandedCode === persona.code ? null : persona.code)
            }
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-zinc-800/60">
        <div className="text-[10px] text-zinc-600 text-center">
          6 AI Agents • Bardinh Coffee & Tea
        </div>
      </div>
    </div>
  );
};
