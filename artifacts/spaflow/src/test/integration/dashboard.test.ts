/**
 * Integration tests for Dashboard API hooks
 * Following 2026 best practices: MSW for network-level mocking
 * Tag: @integration
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetDashboard } from '@workspace/api-client-react';
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

describe('Dashboard API Hooks @integration', () => {
  describe('useGetDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        lockerOccupancy: {
          total: 167,
          available: 20,
          occupied: 145,
          reserved: 2,
        },
        roomOccupancy: {
          total: 38,
          available: 5,
          occupied: 30,
          reserved: 3,
        },
        todayRevenue: 500,
        activeClients: 75,
        waitlistCount: 10,
        lowStockCount: 3,
      });
    });

    it('should handle loading state', () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetDashboard(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle network errors', async () => {
      // Override handler to simulate network error
      server.use(
        http.get('/api/v1/dashboard', () => {
          return HttpResponse.json(
            { message: 'Network error' },
            { status: 503 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
