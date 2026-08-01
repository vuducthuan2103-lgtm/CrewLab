'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { CLIENTS } from '@/lib/mock-data';
import { ChevronLeft, Save, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export default function ClientAiCostsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const client = CLIENTS.find(c => c.id === clientId);

  const [budget, setBudget] = useState(client?.budgetTotal || 50);
  const [anthropicKey, setAnthropicKey] = useState('sk-ant-...4a2f');
  const [openAiKey, setOpenAiKey] = useState('sk-...9c1d');
  
  if (!client) {
    return (
      <AdminLayout>
        <div className="p-8">Client not found</div>
      </AdminLayout>
    );
  }

  const budgetPercent = (client.budgetUsed / budget) * 100;

  return (
    <AdminLayout>
      <div className="flex items-center px-6 py-4 border-b border-border bg-card">
        <Link href="/ai-costs" className="text-muted-foreground hover:text-foreground mr-4 flex items-center gap-1 text-sm font-medium">
          <ChevronLeft size={16} /> Chi phí AI
        </Link>
        <h1 className="text-lg font-bold text-foreground">{client.name} — Chi tiết chi phí</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* NGÂN SÁCH */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-1">Ngân sách tổng/tháng</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-foreground">${budget.toFixed(2)}</span>
                <button className="text-xs font-bold text-cyan-admin bg-cyan-admin/10 px-3 py-1.5 rounded-lg border border-cyan-admin/20 hover:bg-cyan-admin/20 transition-colors">
                  Sửa ngân sách
                </button>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold text-muted-foreground mb-1">Đã dùng</h2>
              <span className="text-xl font-bold text-foreground">${client.budgetUsed.toFixed(2)} ({budgetPercent.toFixed(1)}%)</span>
            </div>
          </div>
          
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 border-t border-border pt-6">Breakdown Theo Agent</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">D02 Image Design</span>
              <span className="font-mono text-muted-foreground">$8.20 (45%) <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded ml-2">← tốn nhất</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">D01 Caption Writer</span>
              <span className="font-mono text-muted-foreground">$4.10 (22%)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">G01-G04 Analytics</span>
              <span className="font-mono text-muted-foreground">$3.20 (17%)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Khác (A01, B01-B03, E01, H01)</span>
              <span className="font-mono text-muted-foreground">$2.90 (16%)</span>
            </div>
          </div>
        </div>

        {/* PROVIDER & API KEY */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Provider & API Key</h3>
          
          <div className="p-4 rounded-xl border border-lime-admin/30 bg-lime-admin/5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-foreground">ANTHROPIC</span>
              <span className="text-xs text-lime-admin font-bold bg-lime-admin/10 px-2 py-0.5 rounded border border-lime-admin/20">🟢 Bật</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={anthropicKey} readOnly className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <button className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors">Test</button>
              <button className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors">Sửa key</button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-lime-admin/30 bg-lime-admin/5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-foreground">OPENAI</span>
              <span className="text-xs text-lime-admin font-bold bg-lime-admin/10 px-2 py-0.5 rounded border border-lime-admin/20">🟢 Bật</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={openAiKey} readOnly className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <button className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors">Test</button>
              <button className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors">Sửa key</button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-border bg-transparent flex items-center justify-between">
            <span className="font-bold text-muted-foreground">GOOGLE</span>
            <button className="text-xs font-bold text-foreground bg-muted/50 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">+ Nhập API Key để bật</button>
          </div>
        </div>

        {/* MODEL THEO AGENT */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">Model Theo Agent</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">A01 Orchestrator</span>
              <select className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-foreground"><option>Claude Haiku</option></select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">B01-B03 Strategy</span>
              <select className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-foreground"><option>Claude Sonnet</option></select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">D01 Caption</span>
              <select className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-foreground"><option>Claude Sonnet</option></select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">D02 Image</span>
              <select className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-foreground"><option>GPT-Image-2</option></select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">E01 Evaluator</span>
              <select className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-foreground"><option>Claude Haiku</option></select>
            </div>
          </div>
          
          <div className="flex justify-end mt-8 border-t border-border pt-6">
            <button className="flex items-center gap-2 bg-lime-admin text-black px-6 py-2.5 rounded-lg font-bold text-sm shadow-glow-lime-sm hover:opacity-90 transition-opacity">
              <Save size={16} /> Lưu thay đổi
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
