import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

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

  const user: AuthUser | null = me
    ? { id: me.id, email: me.email, name: me.name, role: me.role as "STAFF" | "MANAGER" }
    : null;

  const login = useCallback(async (email: string, password: string) => {
    await loginMutation.mutateAsync({ data: { email, password } });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/dashboard");
  }, [loginMutation, queryClient, setLocation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    queryClient.clear();
    setLocation("/login");
  }, [logoutMutation, queryClient, setLocation]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isManager: user?.role === "MANAGER",
      login,
      logout,
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
