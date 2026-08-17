import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "../api/client";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("nac_user");
    const token = localStorage.getItem("nac_access_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", { email, password });
    setToken(result.accessToken);
    localStorage.setItem("nac_refresh_token", result.refreshToken);
    localStorage.setItem("nac_user", JSON.stringify(result.user));
    setUser(result.user);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("nac_refresh_token");
    localStorage.removeItem("nac_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
