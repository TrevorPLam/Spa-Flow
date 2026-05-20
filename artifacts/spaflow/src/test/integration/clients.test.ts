/**
 * Integration tests for Client API hooks
 * Following 2026 best practices: MSW for network-level mocking
 * Tag: @integration
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListClients, useGetClient, useCreateClient, useUpdateClient, useDeleteClient } from '@workspace/api-client-react';
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
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Client API Hooks @integration', () => {
  describe('useListClients', () => {
    it('should fetch clients successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useListClients(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        clients: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            email: expect.any(String),
          }),
        ]),
        total: 10,
        page: 1,
        limit: 50,
      });
    });

    it('should filter clients by search term', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useListClients({ search: 'Client 1' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Search should filter to only matching clients
      expect(result.current.data?.clients.length).toBeGreaterThan(0);
      expect(result.current.data?.clients[0].name).toContain('Client 1');
    });

    it('should handle pagination', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useListClients({ page: 2, limit: 25 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify pagination params are passed through
      expect(result.current.data?.page).toBe(2);
      expect(result.current.data?.limit).toBe(25);
    });

    it('should handle loading state', () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useListClients(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('useGetClient', () => {
    it('should fetch a single client successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetClient(1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should handle not found error', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useGetClient('not-found'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateClient', () => {
    it('should create a client successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateClient(), { wrapper });

      await result.current.mutateAsync({
        name: 'New Client',
        email: 'newclient@example.com',
        phone: '555-5678',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        id: 1,
        name: 'New Client',
        email: 'newclient@example.com',
        phone: '555-5678',
      });
    });

    it('should validate required fields', async () => {
      server.use(
        http.post('/api/v1/clients', () => {
          return HttpResponse.json(
            { message: 'Name and email are required' },
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateClient(), { wrapper });

      await expect(
        result.current.mutateAsync({
          name: '',
          email: '',
        })
      ).rejects.toThrow();
    });

    it('should handle duplicate email error', async () => {
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
    });
  });

  describe('useUpdateClient', () => {
    it('should update a client successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateClient(), { wrapper });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Name' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
      });
    });

    it('should handle not found error', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateClient(), { wrapper });

      await expect(
        result.current.mutateAsync({
          clientId: 'not-found',
          data: { name: 'Updated Name' },
        })
      ).rejects.toThrow();
    });
  });

  describe('useDeleteClient', () => {
    it('should delete a client successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeleteClient(), { wrapper });

      await result.current.mutateAsync({ clientId: 1 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle not found error', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeleteClient(), { wrapper });

      await expect(
        result.current.mutateAsync({ id: 'not-found' })
      ).rejects.toThrow();
    });
  });
});
