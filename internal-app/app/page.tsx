'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Cpu, 
  Layers, 
  Play, 
  Terminal, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  ArrowRight,
  Sparkles,
  Search,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

interface AgentInfo {
  code: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun: string;
}

export default function AgencyAdminDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('A01');
  const [logFilter, setLogFilter] = useState<string>('all');

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const agents: AgentInfo[] = [
    { code: 'A01', name: 'Orchestrator', role: 'Phân phối nhiệm vụ & FSM State Manager', status: 'running', lastRun: 'Vừa xong' },
    { code: 'B02', name: 'Content Pillar', role: 'Định hướng định dạng & Chủ đề bài viết', status: 'completed', lastRun: '2 phút trước' },
    { code: 'B03', name: 'Content Plan', role: 'Lập lịch & Tối ưu thời gian đăng', status: 'completed', lastRun: '5 phút trước' },
    { code: 'D01', name: 'Caption Writer', role: 'Viết nội dung truyền thông & Hashtags', status: 'completed', lastRun: '1 phút trước' },
    { code: 'D02', name: 'Image Design', role: 'Tạo prompt hình ảnh & Layout banner', status: 'completed', lastRun: '1 phút trước' },
    { code: 'E01', name: 'Evaluator', role: 'Chấm điểm Brand Voice & Kiểm duyệt', status: 'running', lastRun: 'Đang chạy...' },
  ];

  const clientTasks = [
    { client: 'Phở Thìn Hà Nội', branch: 'Cơ sở Lò Đúc', task: 'Bài đăng Khung giờ Vàng', fsm: 'pending_content_approval', agent: 'E01 Evaluator', updated: '10:45' },
    { client: 'Cà Phê Muối Chú Lắm', branch: 'Cơ sở 1 - Q.3', task: 'Bảng giá Combo Sáng', fsm: 'evaluating', agent: 'D01/D02', updated: '10:42' },
    { client: 'Bún Chả Hương Liên', branch: 'Cơ sở Lê Văn Hưu', task: 'Bài giới thiệu Khách Tây', fsm: 'approved_ready_to_post', agent: 'System', updated: '09:30' },
    { client: 'Tacos Hà Nội', branch: 'Cơ sở Tây Hồ', task: 'Chương trình Happy Hour', fsm: 'posted', agent: 'System', updated: 'Hôm qua' },
  ];

  const agentLogs = [
    { time: '10:45:12', agent: 'E01', type: 'INFO', msg: 'Evaluator scoring post #1402... Brand match: 9.4/10. Criteria PASSED.' },
    { time: '10:45:05', agent: 'D02', type: 'SUCCESS', msg: 'Image generated: "A steaming bowl of Pho Thin with scallions, 4k ultra realistic, high contrast food photography".' },
    { time: '10:44:48', agent: 'D01', type: 'SUCCESS', msg: 'Caption generated: 145 words, Tone: Warm & Heritage. Hashtags: #PhoThinLoDuc #CrewlabAI.' },
    { time: '10:44:20', agent: 'A01', type: 'FSM', msg: 'Transition state for Client #01: planned -> drafting -> evaluating.' },
    { time: '10:43:10', agent: 'B03', type: 'INFO', msg: 'Fetched agent_memory (client_id=01, limit=5). Applied historical human feedback.' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-300">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-black border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-900 dark:text-[#D4FF00]">
              C
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white">Crewlab</span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-[#D4FF00] border border-zinc-300 dark:border-zinc-700 uppercase tracking-wider font-mono">
                Agency Admin Operations
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Database className="w-3.5 h-3.5 text-yellow-600 dark:text-[#D4FF00]" />
            <span>Postgres DB Connected</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-[#D4FF00] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer flex items-center justify-center shadow-sm"
            title={isDark ? "Chuyển sang Chế độ Sáng (Light Mode)" : "Chuyển sang Chế độ Tối (Dark Mode)"}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          <div className="w-8 h-8 rounded-full bg-[#D4FF00] text-black font-extrabold flex items-center justify-center text-xs shadow-[0_2px_10px_rgba(212,255,0,0.3)]">
            AG
          </div>
        </div>
      </header>

      {/* Main Agency Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Pipeline & Agent Monitor Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Cpu className="w-6 h-6 text-yellow-600 dark:text-[#D4FF00]" />
              Trung tâm điều khiển 6 AI Agents (Phase 1 MVP)
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Quản lý danh sách khách hàng F&B, giám sát luồng FSM State Machine và nhật ký Agent Memory.
            </p>
          </div>

          <button className="self-start md:self-auto py-2.5 px-4 rounded-xl text-xs font-extrabold text-black bg-[#D4FF00] hover:bg-[#c2f000] shadow-[0_4px_15px_rgba(212,255,0,0.3)] transition-all flex items-center gap-2 cursor-pointer active:scale-95">
            <Play className="w-3.5 h-3.5 fill-black" /> Trigger Full Pipeline Test
          </button>
        </div>

        {/* 6 AI Agents Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div 
              key={agent.code}
              onClick={() => setSelectedAgent(agent.code)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                selectedAgent === agent.code 
                  ? 'bg-white dark:bg-zinc-900 border-[#D4FF00] shadow-md dark:shadow-[0_0_20px_rgba(212,255,0,0.15)]' 
                  : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-mono font-bold text-sm text-zinc-900 dark:text-[#D4FF00]">
                    {agent.code}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{agent.name}</h3>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1">{agent.role}</p>
                  </div>
                </div>

                {agent.status === 'running' && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4FF00]"></span>
                  </span>
                )}
                {agent.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>Chạy gần nhất: {agent.lastRun}</span>
                <span className="text-yellow-600 dark:text-[#D4FF00] font-bold flex items-center gap-1">
                  Chi tiết <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* FSM Client Task Queue & Agent Terminal split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left 7 cols: Client Tasks Table */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-600 dark:text-[#D4FF00]" />
                Tiến độ FSM Pipeline theo Khách hàng F&B
              </h2>
              <span className="text-xs text-zinc-500 font-mono font-medium">4 active clients</span>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-md dark:shadow-xl transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-800 dark:text-zinc-300">
                  <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Thương hiệu F&B</th>
                      <th className="px-4 py-3">Task bài viết</th>
                      <th className="px-4 py-3">FSM State</th>
                      <th className="px-4 py-3 text-right">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                    {clientTasks.map((task, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-white">
                          {task.client}
                          <span className="block text-[10px] font-normal text-zinc-500">{task.branch}</span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-800 dark:text-zinc-300">
                          {task.task}
                          <span className="block text-[10px] font-mono text-zinc-500">Agent: {task.agent}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {task.fsm === 'pending_content_approval' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 dark:bg-[#D4FF00]/10 text-yellow-800 dark:text-[#D4FF00] border border-yellow-300 dark:border-[#D4FF00]/30 font-mono">
                              pending_approval
                            </span>
                          )}
                          {task.fsm === 'evaluating' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30 font-mono">
                              evaluating
                            </span>
                          )}
                          {task.fsm === 'approved_ready_to_post' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-mono">
                              ready_to_post
                            </span>
                          )}
                          {task.fsm === 'posted' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 font-mono">
                              posted
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[11px] text-zinc-500">
                          {task.updated}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 5 cols: Live Agent Log Terminal */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-yellow-600 dark:text-[#D4FF00]" />
                Live Agent Terminal Logs (`agent_memory`)
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-yellow-600 dark:text-[#D4FF00]">
                <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse"></span> Streaming
              </span>
            </div>

            {/* Terminal always keeps high contrast dark theme for authentic code feel */}
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 font-mono text-xs text-zinc-300 space-y-3 shadow-lg dark:shadow-2xl h-[340px] overflow-y-auto">
              <div className="text-[11px] text-zinc-600 pb-2 border-b border-zinc-900 flex items-center justify-between">
                <span>[Postgres: agent_memory_log_stream]</span>
                <span>MVP-v3.5 Scope</span>
              </div>

              {agentLogs.map((log, i) => (
                <div key={i} className="space-y-1 text-[11px] leading-relaxed border-b border-zinc-900/60 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">[{log.time}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.type === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' :
                      log.type === 'FSM' ? 'bg-cyan-950 text-cyan-400' : 'bg-zinc-900 text-[#D4FF00]'
                    }`}>
                      {log.agent} • {log.type}
                    </span>
                  </div>
                  <p className="text-zinc-300 pl-2 border-l border-zinc-800">{log.msg}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
