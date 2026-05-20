/**
 * Integration tests for Auth API hooks
 * Following 2026 best practices: MSW for network-level mocking
 * Tag: @integration
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useLogout, useGetMe } from '@workspace/api-client-react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Helper to create a QueryClient for testing
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component for React Query
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Auth API Hooks @integration', () => {
  describe('useLogin', () => {
    it('should successfully login with valid credentials', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'STAFF',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should fail with invalid credentials', async () => {
      // Override handler for this test
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should fail when account is locked', async () => {
      // Override handler for this test
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Account is locked' },
            { status: 403 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: 'locked@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should validate required fields', async () => {
      // Override handler for this test
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Email and password are required' },
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: '',
          password: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('useLogout', () => {
    it('should successfully logout', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogout(), { wrapper });

      await result.current.mutateAsync();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        message: 'Logged out successfully',
      });
    });
  });

  describe('useGetMe', () => {
    it('should fetch current user successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetMe(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        role: 'STAFF',
      });
    });

    it('should handle network errors', async () => {
      // Override handler to simulate network error
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json(
            { message: 'Network error' },
            { status: 503 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetMe(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
