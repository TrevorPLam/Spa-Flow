import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const REFRESH_TOKEN_KEY = "spaflow_refresh_token";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "STAFF" | "MANAGER";
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isManager: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: me, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  // Automatic token refresh on 401 errors
  useEffect(() => {
    // Set up global error handler for 401 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          // Try to refresh token
          try {
            const refreshResponse = await fetch("/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: storedRefreshToken }),
              credentials: "include",
            });

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              if (data.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
              }
              // Invalidate queries to trigger re-fetch with new access token
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              // Retry the original request
              return originalFetch(...args);
            } else {
              // Refresh failed, redirect to login
              localStorage.removeItem(REFRESH_TOKEN_KEY);
              queryClient.clear();
              setLocation("/login");
            }
          } catch (error) {
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            queryClient.clear();
            setLocation("/login");
          }
        } else {
          // No refresh token, redirect to login
          queryClient.clear();
          setLocation("/login");
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [queryClient, setLocation]);

  const user: AuthUser | null = me
    ? { id: me.id, email: me.email, name: me.name, role: me.role as "STAFF" | "MANAGER" }
    : null;

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginMutation.mutateAsync({ data: { email, password } }) as { refreshToken?: string };
    // Store refresh token from login response
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    }
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/dashboard");
  }, [loginMutation, queryClient, setLocation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    queryClient.clear();
    setLocation("/login");
  }, [logoutMutation, queryClient, setLocation]);

  const refreshToken = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      setLocation("/login");
      return;
    }

    try {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      const data = await response.json();
      // Update stored refresh token
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      // Invalidate queries to trigger re-fetch with new access token
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      queryClient.clear();
      setLocation("/login");
    }
  }, [queryClient, setLocation]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isManager: user?.role === "MANAGER",
      login,
      logout,
      refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
