import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create mock before importing the hook
const { useAuth } = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth,
}));

import { useWebSocket, WebSocketEventType } from './use-websocket';

describe('useWebSocket', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;
  let mockAuth: any;

  beforeEach(() => {
    // Setup QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
    };

    Object.defineProperty(global, 'WebSocket', {
      value: vi.fn(() => mockWebSocket),
      writable: true,
      configurable: true,
    });

    // Mock AuthContext
    mockAuth = {
      user: { id: 1, email: 'test@example.com' },
    };
    useAuth.mockReturnValue(mockAuth);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        protocol: 'http:',
        host: 'localhost:5173',
      },
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should start in disconnected state', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }), { wrapper });
    expect(result.current.status).toBe('disconnected');
  });

  it('should auto-connect when user is authenticated', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    expect(result.current.status).toBe('connecting');
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:5173/ws');
  });

  it('should not connect when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useWebSocket(), { wrapper });

    expect(result.current.status).toBe('disconnected');
    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('should update status to connected when WebSocket opens', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    expect(result.current.status).toBe('connected');
  });

  it('should handle incoming messages', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebSocket({ onMessage }), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    const testMessage = {
      type: WebSocketEventType.LOCKER_STATUS_CHANGE,
      data: { lockerId: 1, status: 'OCCUPIED' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(testMessage) });
      }
    });

    expect(result.current.lastMessage).toEqual(testMessage);
    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it('should invalidate queries on LOCKER_STATUS_CHANGE', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: WebSocketEventType.LOCKER_STATUS_CHANGE,
            data: {},
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lockers'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lockers-occupancy'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('should invalidate queries on ROOM_STATUS_CHANGE', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: WebSocketEventType.ROOM_STATUS_CHANGE,
            data: {},
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rooms'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rooms-occupancy'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('should invalidate queries on WAITLIST_UPDATE', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: WebSocketEventType.WAITLIST_UPDATE,
            data: {},
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['waitlist'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('should handle invalid JSON messages gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: 'invalid json' });
      }
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should disconnect when user logs out', async () => {
    const { result, rerender } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    expect(result.current.status).toBe('connected');

    useAuth.mockReturnValue({ user: null });
    rerender();

    expect(result.current.status).toBe('disconnected');
    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'User disconnected');
  });

  it('should reconnect on disconnect with exponential backoff', async () => {
    const { result } = renderHook(() => useWebSocket({ reconnectDelay: 1000 }), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    expect(result.current.status).toBe('connected');

    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });

    expect(result.current.status).toBe('connecting');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should respect maxReconnectAttempts', async () => {
    const { result } = renderHook(() => useWebSocket({ maxReconnectAttempts: 2 }), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    // First disconnect
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Second disconnect
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Third disconnect - should not reconnect
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    const message = {
      type: WebSocketEventType.LOCKER_STATUS_CHANGE,
      data: {},
      timestamp: new Date().toISOString(),
    };

    act(() => {
      result.current.sendMessage(message);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should not send messages when disconnected', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }), { wrapper });

    const message = {
      type: WebSocketEventType.LOCKER_STATUS_CHANGE,
      data: {},
      timestamp: new Date().toISOString(),
    };

    act(() => {
      result.current.sendMessage(message);
    });

    expect(mockWebSocket.send).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot send message: not connected')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should call onStatusChange callback', async () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() => useWebSocket({ onStatusChange }), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    expect(onStatusChange).toHaveBeenCalledWith('connected');
  });

  it('should clean up on unmount', async () => {
    const { unmount } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'User disconnected');
  });

  it('should handle WebSocket errors', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('WebSocket error'));
      }
    });

    expect(result.current.status).toBe('error');
  });

  it('should reconnect when page becomes visible', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });

    expect(result.current.status).toBe('connecting');

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });

    expect(result.current.status).toBe('connecting');
  });
});
