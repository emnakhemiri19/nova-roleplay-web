import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

export type User = {
  id: string;
  username: string;
  avatarUrl?: string;
  roles: string[]; // later: returned from backend (role ids or names)
};

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/discord`;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const hasRole = (role: string) => !!user?.roles?.includes(role);

  const value = useMemo(
    () => ({ user, loading, refresh, login, logout, hasRole }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}