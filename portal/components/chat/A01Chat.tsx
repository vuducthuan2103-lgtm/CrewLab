'use client';

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { apiFetchA01Messages, apiSendA01Message } from '@/lib/api';
import { A01ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

const SUGGESTIONS = [
  'Lên ý tưởng bài Facebook cho món bán chạy tuần này',
  'Tôi muốn quảng bá chương trình mua 2 tặng 1 trên Instagram',
  'Giúp tôi làm rõ nội dung nên đăng cho dịp cuối tuần',
];

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function DispatchBadge({ message }: { message: A01ChatMessage }) {
  if (message.action !== 'create_content') return null;
  const pending = message.dispatch_status === 'pending';
  return (
    <div
      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        pending
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
          : 'border-primary/30 bg-primary/10 text-lime-brand'
      }`}
    >
      {pending ? <CircleAlert size={12} /> : <CheckCircle2 size={12} />}
      {pending ? 'Đã nhận, đang chờ hệ thống xử lý' : 'Đã giao vào quy trình nội dung'}
    </div>
  );
}

export default function A01Chat() {
  const [messages, setMessages] = useState<A01ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    apiFetchA01Messages()
      .then((history) => {
        if (active) setMessages(history);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được cuộc trò chuyện.');
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function sendMessage(value = draft) {
    const message = value.trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    try {
      const response = await apiSendA01Message(message);
      setMessages((current) => [...current, response]);
      setDraft('');
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được tin nhắn. Vui lòng thử lại.');
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

  return (
    <section className="mx-auto flex h-[calc(100vh-6.5rem)] min-h-[620px] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Bot className="text-lime-brand" size={22} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Trò chuyện với A01</h1>
            <p className="text-xs text-muted-foreground">Điều phối viên AI của đội marketing CrewLab</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
          <Sparkles size={13} className="text-lime-brand" />
          A01 đang trực
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-background/40 px-4 py-5 sm:px-8" aria-live="polite">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={17} className="animate-spin" />
            Đang tải cuộc trò chuyện
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <MessageSquareText size={25} className="text-lime-brand" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Bạn muốn đội marketing làm gì?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Trao đổi ý tưởng, hỏi A01 để làm rõ yêu cầu hoặc giao một việc nội dung. A01 sẽ điều phối các agent phù hợp.
            </p>
            <div className="mt-6 grid w-full gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setDraft(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-7">
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <div className="flex justify-end gap-3">
                  <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                    {message.user_message}
                  </div>
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound size={15} className="text-muted-foreground" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                    <Bot size={16} className="text-lime-brand" />
                  </div>
                  <div className="max-w-[82%]">
                    <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground shadow-sm">
                      {message.assistant_message}
                      <DispatchBadge message={message} />
                    </div>
                    <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">{timeLabel(message.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                  <Bot size={16} className="text-lime-brand" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  A01 đang suy nghĩ
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border bg-card px-4 py-4 sm:px-6">
        {error && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="relative mx-auto max-w-3xl">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={4000}
            disabled={sending}
            aria-label="Nhắn tin cho A01"
            placeholder="Nhắn A01 về ý tưởng hoặc việc bạn muốn giao..."
            className="min-h-[92px] pr-14"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || sending}
            aria-label="Gửi tin nhắn"
            className="absolute bottom-3 right-3"
          >
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
          Enter để gửi, Shift + Enter để xuống dòng. A01 có thể hỏi thêm trước khi nhận việc.
        </p>
      </form>
    </section>
  );
}
