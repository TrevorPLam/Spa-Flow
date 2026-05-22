import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * WebSocket event types matching the server implementation
 */
export const WebSocketEventType = {
  LOCKER_STATUS_CHANGE: "LOCKER_STATUS_CHANGE",
  ROOM_STATUS_CHANGE: "ROOM_STATUS_CHANGE",
  WAITLIST_UPDATE: "WAITLIST_UPDATE",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  RESOURCE_RELEASED: "RESOURCE_RELEASED",
} as const;

export type WebSocketEventType = typeof WebSocketEventType[keyof typeof WebSocketEventType];

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  data: unknown;
  timestamp: string;
}

/**
 * Connection status for UI display
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

/**
 * WebSocket hook options
 */
interface UseWebSocketOptions {
  /**
   * Callback when a message is received
   */
  onMessage?: (message: WebSocketMessage) => void;
  /**
   * Callback when connection status changes
   */
  onStatusChange?: (status: ConnectionStatus) => void;
  /**
   * Whether to automatically connect when user is authenticated
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Reconnection delay in milliseconds (base for exponential backoff)
   * @default 1000
   */
  reconnectDelay?: number;
  /**
   * Maximum reconnection delay in milliseconds
   * @default 30000
   */
  maxReconnectDelay?: number;
  /**
   * Maximum number of reconnection attempts
   * @default Infinity
   */
  maxReconnectAttempts?: number;
}

/**
 * WebSocket React hook with auto-reconnect and exponential backoff
 * 
 * This hook manages a WebSocket connection with JWT authentication,
 * automatic reconnection with exponential backoff, and query invalidation
 * on relevant messages.
 * 
 * @example
 * ```tsx
 * const { status, lastMessage } = useWebSocket({
 *   onMessage: (message) => {
 *     if (message.type === WebSocketEventType.LOCKER_STATUS_CHANGE) {
 *       queryClient.invalidateQueries({ queryKey: getListLockersQueryKey() });
 *     }
 *   },
 * });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onStatusChange,
    autoConnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    maxReconnectAttempts = Infinity,
  } = options;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const statusRef = useRef<ConnectionStatus>("disconnected");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  /**
   * Update connection status and notify callback
   */
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    if (statusRef.current !== newStatus) {
      statusRef.current = newStatus;
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    }
  }, [onStatusChange]);

  /**
   * Calculate reconnection delay with exponential backoff
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [reconnectDelay, maxReconnectDelay]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!user) {
      console.log("[useWebSocket] Not authenticated, skipping connection");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[useWebSocket] Already connected");
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error("[useWebSocket] Max reconnection attempts reached");
      updateStatus("error");
      return;
    }

    updateStatus("connecting");

    try {
      // Build WebSocket URL with token if available
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log(`[useWebSocket] Connecting to ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1})`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[useWebSocket] Connected");
        reconnectAttemptsRef.current = 0;
        updateStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("[useWebSocket] Received message:", message.type);
          setLastMessage(message);
          onMessage?.(message);

          // Auto-invalidate queries based on message type
          switch (message.type) {
            case WebSocketEventType.LOCKER_STATUS_CHANGE:
              queryClient.invalidateQueries({ queryKey: ["lockers"] });
              queryClient.invalidateQueries({ queryKey: ["lockers-occupancy"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              break;
            case WebSocketEventType.ROOM_STATUS_CHANGE:
              queryClient.invalidateQueries({ queryKey: ["rooms"] });
              queryClient.invalidateQueries({ queryKey: ["rooms-occupancy"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              break;
            case WebSocketEventType.WAITLIST_UPDATE:
              queryClient.invalidateQueries({ queryKey: ["waitlist"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              break;
            case WebSocketEventType.SESSION_EXPIRED:
              queryClient.invalidateQueries({ queryKey: ["sessions"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              break;
            case WebSocketEventType.RESOURCE_RELEASED:
              queryClient.invalidateQueries({ queryKey: ["lockers"] });
              queryClient.invalidateQueries({ queryKey: ["rooms"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              break;
          }
        } catch (error) {
          console.error("[useWebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[useWebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`);
        wsRef.current = null;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts && user) {
          updateStatus("connecting");
          const delay = getReconnectDelay();
          reconnectAttemptsRef.current++;
          console.log(`[useWebSocket] Reconnecting in ${Math.round(delay)}ms...`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          updateStatus("disconnected");
        }
      };

      ws.onerror = (error) => {
        console.error("[useWebSocket] WebSocket error:", error);
        updateStatus("error");
      };

    } catch (error) {
      console.error("[useWebSocket] Failed to create WebSocket:", error);
      updateStatus("error");
    }
  }, [user, maxReconnectAttempts, getReconnectDelay, updateStatus, onMessage, queryClient]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log("[useWebSocket] Disconnecting");
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    updateStatus("disconnected");
  }, [updateStatus]);

  /**
   * Send a message to the server
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[useWebSocket] Cannot send message: not connected");
    }
  }, []);

  /**
   * Auto-connect when user is authenticated
   */
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    } else if (!user) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, autoConnect, connect, disconnect]);

  /**
   * Handle page visibility changes
   * Reconnect when page becomes visible if disconnected
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user && status === "disconnected") {
        console.log("[useWebSocket] Page visible, reconnecting...");
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, status, connect]);

  return {
    status,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
