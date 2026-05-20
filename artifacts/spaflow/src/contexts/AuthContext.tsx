import { createContext, useContext, useEffect, useCallback, useRef } from "react";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Mutex } from "async-mutex";

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

  // Mutex for refresh request deduplication
  const refreshMutex = useRef(new Mutex());
  // Track in-flight refresh promise to prevent duplicate requests
  const refreshPromise = useRef<Promise<void> | null>(null);
  // Rate limiting: track last refresh attempt timestamp
  const lastRefreshAttempt = useRef<number>(0);
  // Track consecutive refresh failures for exponential backoff
  const consecutiveFailures = useRef<number>(0);

  // Log refresh errors with context
  const logRefreshError = (error: unknown, context: string) => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? error.message : String(error),
      isNetworkError: error instanceof TypeError && error.message.includes('fetch'),
      consecutiveFailures: consecutiveFailures.current,
    };
    console.error('[AuthContext] Token refresh error:', errorInfo);
  };

  // Rate limiting with exponential backoff
  const shouldAllowRefresh = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastRefreshAttempt.current;
    const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveFailures.current), 30000); // Max 30s
    
    if (timeSinceLastAttempt < backoffDelay) {
      console.warn(`[AuthContext] Rate limited refresh attempt. Next retry in ${backoffDelay - timeSinceLastAttempt}ms`);
      return false;
    }
    
    lastRefreshAttempt.current = now;
    return true;
  };

  // Perform token refresh with deduplication
  const performRefresh = useCallback(async (): Promise<boolean> => {
    // If a refresh is already in progress, wait for it
    if (refreshPromise.current) {
      console.log('[AuthContext] Refresh already in progress, waiting...');
      await refreshPromise.current;
      return true;
    }

    // Rate limiting check
    if (!shouldAllowRefresh()) {
      return false;
    }

    const release = await refreshMutex.current.acquire();
    
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        console.warn('[AuthContext] No refresh token available');
        return false;
      }

      console.log('[AuthContext] Attempting token refresh...');
      
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
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        // Reset failure counter on success
        consecutiveFailures.current = 0;
        console.log('[AuthContext] Token refresh successful');
        return true;
      } else {
        const error = await refreshResponse.text();
        logRefreshError(new Error(`Refresh failed with status ${refreshResponse.status}: ${error}`), 'refresh_response');
        consecutiveFailures.current++;
        return false;
      }
    } catch (error) {
      logRefreshError(error, 'refresh_network');
      consecutiveFailures.current++;
      return false;
    } finally {
      release();
      refreshPromise.current = null;
    }
  }, [queryClient]);

  // Automatic token refresh on 401 errors
  useEffect(() => {
    // Set up global error handler for 401 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401) {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          // Use mutex to prevent concurrent refresh attempts
          const refreshSuccess = await performRefresh();
          
          if (refreshSuccess) {
            // Retry the original request with new token
            console.log('[AuthContext] Retrying original request after successful refresh');
            return originalFetch(...args);
          } else {
            // Refresh failed, redirect to login
            console.warn('[AuthContext] Refresh failed, redirecting to login');
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            queryClient.clear();
            setLocation("/login");
          }
        } else {
          // No refresh token, redirect to login
          console.warn('[AuthContext] No refresh token, redirecting to login');
          queryClient.clear();
          setLocation("/login");
        }
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [queryClient, setLocation, performRefresh]);

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
    const refreshSuccess = await performRefresh();
    if (!refreshSuccess) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      queryClient.clear();
      setLocation("/login");
    }
  }, [performRefresh, queryClient, setLocation]);

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
