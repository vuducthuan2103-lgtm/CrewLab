'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { CLIENTS, CONTENT_ITEMS } from '@/lib/mock-data';
import { ContentState, STATE_LABELS } from '@/lib/types';
import {
  ArrowLeft,
  Filter,
  Bug,
  RotateCcw,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function ClientContentMonitorPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const client = CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
  const clientItems = CONTENT_ITEMS.filter(item => item.clientId === client.id);

  const [stateFilter, setStateFilter] = useState<string>('all');

  const filteredItems = clientItems.filter(item => {
    if (stateFilter === 'all') return true;
    if (stateFilter === 'planning') return ['planned', 'ready_for_generation'].includes(item.state);
    if (stateFilter === 'generating') return ['caption_generating', 'visual_matching', 'visual_generating'].includes(item.state);
    if (stateFilter === 'evaluating') return item.state === 'evaluating';
    if (stateFilter === 'approval') return item.state === 'pending_content_approval';
    if (stateFilter === 'ready') return item.state === 'approved_ready_to_post';
    if (stateFilter === 'posted') return item.state === 'posted';
    if (stateFilter === 'failed') return ['eval_failed', 'rejected'].includes(item.state);
    return true;
  });

  return (
    <AdminLayout>
      <AdminHeader
        title={`Content Monitor — ${client.name}`}
        subtitle={`Quản lý luồng FSM State Machine cho thương hiệu ${client.name}`}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                  {client.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-tint text-cyan-admin font-mono font-bold">
                  {client.vertical}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tổng cộng {clientItems.length} content items trong hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="py-2 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-all flex items-center gap-1.5">
              <RefreshCw size={13} className="text-cyan-admin" /> Làm mới FSM State
            </button>
          </div>
        </div>

        {/* FSM Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-border">
          {[
            { id: 'all', label: 'Tất cả', count: clientItems.length },
            { id: 'planning', label: 'Kế hoạch', count: clientItems.filter(i => ['planned', 'ready_for_generation'].includes(i.state)).length },
            { id: 'generating', label: 'Đang tạo', count: clientItems.filter(i => ['caption_generating', 'visual_matching', 'visual_generating'].includes(i.state)).length },
            { id: 'evaluating', label: 'Đang thẩm định', count: clientItems.filter(i => i.state === 'evaluating').length },
            { id: 'approval', label: 'Chờ duyệt', count: clientItems.filter(i => i.state === 'pending_content_approval').length },
            { id: 'ready', label: 'Sẵn sàng đăng', count: clientItems.filter(i => i.state === 'approved_ready_to_post').length },
            { id: 'posted', label: 'Đã đăng', count: clientItems.filter(i => i.state === 'posted').length },
            { id: 'failed', label: 'Lỗi / Fail', count: clientItems.filter(i => ['eval_failed', 'rejected'].includes(i.state)).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStateFilter(tab.id)}
              className={`px-3 py-2 rounded-t-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                stateFilter === tab.id
                  ? 'bg-card text-lime-admin font-bold border-b-2 border-lime-admin'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                stateFilter === tab.id ? 'bg-lime-tint text-lime-admin' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Items List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Không có bài viết nào ở trạng thái này</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Item Info */}
                  <div className="flex items-start gap-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs font-mono flex-shrink-0">
                        No image
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-foreground">
                          {item.title}
                        </span>
                        <StatusBadge state={item.state} label={STATE_LABELS[item.state]} />
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.platform}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                          Tuần {item.weekNumber} • {item.pillarLabel}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.caption || 'Chưa có caption'}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono pt-1">
                        <span>Agent: <strong className="text-cyan-admin">{item.currentAgent || 'A01'}</strong></span>
                        <span>Retry count: <strong className="text-amber-400">{item.retryCount}</strong></span>
                        {item.evalScoreCaption && (
                          <span>Score: <strong className="text-emerald-400">{item.evalScoreCaption}/10</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Debug Link */}
                  <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
                    <Link
                      href={`/clients/${client.id}/debug/${item.id}`}
                      className="py-2 px-3 rounded-xl bg-cyan-tint border border-cyan-tint text-cyan-admin hover:bg-cyan-tint/80 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Bug size={13} /> Debug View
                    </Link>
                  </div>
                </div>

                {/* Eval Failure Alert inside card if eval_failed */}
                {item.state === 'eval_failed' && item.evalFeedback && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Lý do thẩm định thất bại (E01 Evaluator):</p>
                      <p className="mt-0.5">{item.evalFeedback}</p>
                      {item.failedCriteria.length > 0 && (
                        <p className="mt-1 font-mono text-[10px] text-red-300">
                          Tiêu chí vi phạm: [{item.failedCriteria.join(', ')}]
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
