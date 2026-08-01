'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminState {
  isDark: boolean;
  toggleTheme: () => void;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AdminContext = createContext<AdminState | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof document !== 'undefined') {
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <AdminContext.Provider
      value={{
        isDark,
        toggleTheme,
        selectedClientId,
        setSelectedClientId,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
