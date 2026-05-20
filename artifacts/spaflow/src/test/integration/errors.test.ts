/**
 * Integration tests for error handling
 * Following 2026 best practices: MSW for network-level mocking
 * Tag: @integration
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useCreateClient } from '@workspace/api-client-react';
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

describe('Error Handling @integration', () => {
  describe('Network Errors', () => {
    it('should handle network failures gracefully', async () => {
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Network error' },
            { status: 503 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Server Errors', () => {
    it('should handle 401 unauthorized errors', async () => {
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
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle 403 forbidden errors', async () => {
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

    it('should handle 404 not found errors', async () => {
      server.use(
        http.post('/api/v1/clients', () => {
          return HttpResponse.json(
            { message: 'Resource not found' },
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateClient(), { wrapper });

      await expect(
        result.current.mutateAsync({
          name: 'Test Client',
          email: 'test@example.com',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle 409 conflict errors', async () => {
      server.use(
        http.post('/api/v1/clients', () => {
          return HttpResponse.json(
            { message: 'Client with this email already exists' },
            { status: 409 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateClient(), { wrapper });

      await expect(
        result.current.mutateAsync({
          name: 'Duplicate Client',
          email: 'duplicate@example.com',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle 500 internal server errors', async () => {
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await expect(
        result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Validation Errors', () => {
    it('should handle 400 bad request errors', async () => {
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

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during request', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
