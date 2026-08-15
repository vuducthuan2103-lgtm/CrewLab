'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Copy, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'copy';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  copy: (title?: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalAddToast: ((toast: Omit<ToastMessage, 'id'>) => string) | null = null;

export const toast = {
  success: (title: string, description?: string) => {
    if (globalAddToast) return globalAddToast({ type: 'success', title, description });
  },
  error: (title: string, description?: string) => {
    if (globalAddToast) return globalAddToast({ type: 'error', title, description });
  },
  info: (title: string, description?: string) => {
    if (globalAddToast) return globalAddToast({ type: 'info', title, description });
  },
  copy: (title = 'Đã sao chép vào bộ nhớ tạm', description?: string) => {
    if (globalAddToast) return globalAddToast({ type: 'copy', title, description });
  },
};

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return (
        <div className="w-6 h-6 rounded-full bg-lime-500/15 border border-lime-500/30 flex items-center justify-center text-lime-brand shrink-0">
          <CheckCircle2 size={14} />
        </div>
      );
    case 'error':
      return (
        <div className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
          <AlertCircle size={14} />
        </div>
      );
    case 'copy':
      return (
        <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
          <Copy size={13} />
        </div>
      );
    case 'info':
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
          <Info size={14} />
        </div>
      );
  }
}

function ToastItem({ toastItem, onDismiss }: { toastItem: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toastItem.id);
    }, toastItem.duration || 3500);
    return () => clearTimeout(timer);
  }, [toastItem, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-md max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-200 transition-all hover:border-zinc-700"
    >
      <ToastIcon type={toastItem.type} />
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-semibold text-zinc-100 leading-tight">{toastItem.title}</p>
        {toastItem.description && (
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{toastItem.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toastItem.id)}
        className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-900 transition-colors shrink-0 -mr-1 -mt-1"
        title="Đóng thông báo"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { ...toastData, id };
    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 toasts
    return id;
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  const success = useCallback((title: string, description?: string) => addToast({ type: 'success', title, description }), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast({ type: 'error', title, description }), [addToast]);
  const info = useCallback((title: string, description?: string) => addToast({ type: 'info', title, description }), [addToast]);
  const copy = useCallback((title = 'Đã sao chép vào bộ nhớ tạm', description?: string) => addToast({ type: 'copy', title, description }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, copy }}>
      {children}
      {/* Toast container floating at bottom right */}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 pointer-events-none items-end"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toastItem={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      addToast: () => '',
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      info: toast.info,
      copy: toast.copy,
    };
  }
  return ctx;
}
