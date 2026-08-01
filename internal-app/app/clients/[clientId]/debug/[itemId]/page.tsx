'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  CLIENTS,
  CONTENT_ITEMS,
  RETRY_HISTORY_CI004,
  LLM_USAGE_CI001,
  EVAL_CRITERIA_CI001
} from '@/lib/mock-data';
import { ContentState, STATE_LABELS } from '@/lib/types';
import {
  ArrowLeft,
  Bug,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Send
} from 'lucide-react';

export default function DebugViewPage() {
  const params = useParams();
  const clientId = params?.clientId as string;
  const itemId = params?.itemId as string;

  const client = CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
  const item = CONTENT_ITEMS.find(i => i.id === itemId) || CONTENT_ITEMS[0];

  const [currentState, setCurrentState] = useState<ContentState>(item.state);
  const [overrideReason, setOverrideReason] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    setMessage(null);
    await new Promise(r => setTimeout(r, 1000));
    setIsRetrying(false);
    setMessage('Đã gửi tín hiệu trigger A01 Orchestrator (wake_reason=manual). FSM state chuyển về caption_generating.');
    setCurrentState('caption_generating');
  };

  const handleStateOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setMessage('Vui lòng nhập lý do can thiệp state!');
      return;
    }
    setMessage(`Đã cập nhật FSM state sang [${currentState}]. Lý do: ${overrideReason}`);
    setOverrideReason('');
  };

  return (
    <AdminLayout>
      <AdminHeader
        title={`Debug View — ${item.title}`}
        subtitle={`Chi tiết kỹ thuật cho Agency Admin • Client: ${client.name}`}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Navigation Top */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/clients/${client.id}`}
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-admin bg-cyan-tint px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                  {item.title}
                </h1>
                <StatusBadge state={currentState} label={STATE_LABELS[currentState]} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Platform: {item.platform.toUpperCase()} • Tuần {item.weekNumber} • {item.pillarLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="py-2 px-4 rounded-xl text-xs font-extrabold btn-lime-glow flex items-center gap-2"
            >
              <RotateCcw size={13} className={isRetrying ? 'animate-spin' : ''} />
              Chạy lại Task (Trigger A01)
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 font-mono flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left 7 cols: Evaluator Breakdown & Retry Timeline */}
          <div className="lg:col-span-7 space-y-6">

            {/* E01 Score Breakdown */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  E01 Evaluator Score Breakdown
                </h2>
                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Total Score: 8.2 / 10
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EVAL_CRITERIA_CI001.map((criterion, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">{criterion.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{criterion.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${criterion.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {criterion.score} / {criterion.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retry History Timeline */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <RotateCcw size={16} className="text-amber-400" />
                Lịch sử Retry (Retry History Timeline)
              </h2>

              <div className="space-y-4 font-mono text-xs">
                {RETRY_HISTORY_CI004.map((entry, idx) => (
                  <div key={idx} className="flex gap-4 items-start relative">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-cyan-admin text-xs flex-shrink-0">
                      #{entry.attempt}
                    </div>
                    <div className="flex-1 bg-muted/30 rounded-xl p-3 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{entry.action} (Agent {entry.agentCode})</span>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Kết quả: {entry.result === 'pass' ? '✓ Đạt' : entry.result === 'fail' ? '✕ Thất bại' : '⏳ Đang xử lý'}
                        {entry.evalScore && ` • Score: ${entry.evalScore}/10`}
                      </p>
                      {entry.failedCriteria.length > 0 && (
                        <p className="text-red-400 text-[10px]">
                          Lỗi: [{entry.failedCriteria.join(', ')}]
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right 5 cols: LLM Metrics & Manual State Override */}
          <div className="lg:col-span-5 space-y-6">

            {/* LLM Token & Latency Usage */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Zap size={16} className="text-lime-admin" />
                LLM Usage & Performance
              </h2>

              <div className="space-y-3 font-mono text-xs">
                {LLM_USAGE_CI001.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-admin">Agent {entry.agentCode}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.modelUsed}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>Tokens: {entry.tokensIn} in / {entry.tokensOut} out</span>
                      <span className="text-amber-400">{entry.latencyMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual FSM State Override Form */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Sliders size={16} className="text-cyan-admin" />
                Can thiệp State thủ công (State Override)
              </h2>

              <form onSubmit={handleStateOverride} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">FSM State mới:</label>
                  <select
                    value={currentState}
                    onChange={e => setCurrentState(e.target.value as ContentState)}
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground font-mono text-xs focus-admin outline-none"
                  >
                    {Object.entries(STATE_LABELS).map(([stateKey, label]) => (
                      <option key={stateKey} value={stateKey}>
                        {stateKey} ({label})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Lý do can thiệp (Bắt buộc):</label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Nhập lý do bypass hoặc sửa state..."
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs placeholder:text-muted-foreground focus-admin outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-tint border border-cyan-tint text-cyan-admin hover:bg-cyan-tint/80 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={13} /> Lưu Override State
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
