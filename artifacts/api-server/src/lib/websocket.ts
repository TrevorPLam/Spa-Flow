import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { verifyToken, type AuthPayload } from "./auth";
import { logger } from "./logger";

/**
 * WebSocket event types for real-time updates
 */
export enum WebSocketEventType {
  LOCKER_STATUS_CHANGE = "LOCKER_STATUS_CHANGE",
  ROOM_STATUS_CHANGE = "ROOM_STATUS_CHANGE",
  WAITLIST_UPDATE = "WAITLIST_UPDATE",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  RESOURCE_RELEASED = "RESOURCE_RELEASED",
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  data: unknown;
  timestamp: string;
}

/**
 * Extended WebSocket interface with user information
 */
export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  email?: string;
  role?: "STAFF" | "MANAGER";
  isAlive?: boolean;
}

/**
 * Connection tracking for rate limiting and monitoring
 */
interface ConnectionInfo {
  userId: string;
  email: string;
  role: "STAFF" | "MANAGER";
  connectedAt: Date;
  lastPing: Date;
}

/**
 * WebSocket server instance (singleton)
 */
let wss: WebSocketServer | null = null;

/**
 * Active connections map for tracking and management
 */
const connections = new Map<AuthenticatedWebSocket, ConnectionInfo>();

/**
 * User ID to WebSocket connections map for targeted broadcasts
 */
const userConnections = new Map<string, Set<AuthenticatedWebSocket>>();

/**
 * Handle WebSocket disconnection
 */
function handleDisconnect(ws: AuthenticatedWebSocket): void {
  const info = connections.get(ws);
  if (info) {
    logger.info({ userId: info.userId, email: info.email }, "WebSocket connection closed");

    // Remove from user connections map
    const userSet = userConnections.get(info.userId);
    if (userSet) {
      userSet.delete(ws);
      if (userSet.size === 0) {
        userConnections.delete(info.userId);
      }
    }

    connections.delete(ws);
  }
}

/**
 * Send a message to a specific WebSocket connection
 */
function sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Handle HTTP upgrade requests for WebSocket connections
 */
function handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void {
  if (!wss) {
    logger.error("WebSocket server not initialized");
    socket.destroy();
    return;
  }

  // Extract token from query parameter
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    logger.warn("WebSocket connection attempt without token");
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // Verify JWT token
  verifyToken(token)
    .then((payload) => {
      if (!payload) {
        logger.warn("WebSocket connection attempt with invalid token");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Upgrade connection
      if (!wss) {
        logger.error("WebSocket server not initialized during upgrade");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws: AuthenticatedWebSocket) => {
        if (wss) {
          wss.emit("connection", ws, request, payload);
        }
      });
    })
    .catch((error) => {
      logger.error({ error }, "Error verifying WebSocket token");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    });
}

/**
 * Initialize WebSocket server with HTTP server
 * @param httpServer - The HTTP server to attach WebSocket server to
 */
export function initializeWebSocketServer(httpServer: import("http").Server): void {
  if (wss) {
    logger.warn("WebSocket server already initialized");
    return;
  }

  wss = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });

  httpServer.on("upgrade", handleUpgrade);

  // Handle new WebSocket connection
  wss.on("connection", (ws: AuthenticatedWebSocket, _request: IncomingMessage, payload: AuthPayload) => {
    // Attach user info to WebSocket
    ws.userId = payload.sub;
    ws.email = payload.email;
    ws.role = payload.role;
    ws.isAlive = true;

    // Track connection
    const connectionInfo: ConnectionInfo = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      connectedAt: new Date(),
      lastPing: new Date(),
    };
    connections.set(ws, connectionInfo);

    // Add to user connections map
    if (!userConnections.has(payload.sub)) {
      userConnections.set(payload.sub, new Set());
    }
    userConnections.get(payload.sub)!.add(ws);

    logger.info({ userId: payload.sub, email: payload.email }, "WebSocket connection established");

    // Set up event handlers
    ws.on("pong", () => {
      ws.isAlive = true;
      const info = connections.get(ws);
      if (info) {
        info.lastPing = new Date();
      }
    });

    ws.on("close", () => {
      handleDisconnect(ws);
    });

    ws.on("error", (error: Error) => {
      logger.error({ userId: ws.userId, error }, "WebSocket error");
      handleDisconnect(ws);
    });

    // Send welcome message
    sendMessage(ws, {
      type: WebSocketEventType.RESOURCE_RELEASED,
      data: { message: "Connected to SpaFlow WebSocket" },
      timestamp: new Date().toISOString(),
    });
  });

  // Set up periodic ping/pong to detect dead connections
  const pingInterval = setInterval(() => {
    wss?.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        logger.info({ userId: ws.userId }, "Terminating dead WebSocket connection");
        handleDisconnect(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  // Clear interval on server close
  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  logger.info("WebSocket server initialized");
}

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(message: WebSocketMessage): void {
  if (!wss) {
    logger.warn("Cannot broadcast: WebSocket server not initialized");
    return;
  }

  const messageStr = JSON.stringify(message);
  wss.clients.forEach((ws: AuthenticatedWebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });

  logger.debug({ type: message.type, clientCount: wss.clients.size }, "Broadcast message sent");
}

/**
 * Broadcast a message to all connections for a specific user
 */
export function broadcastToUser(userId: string, message: WebSocketMessage): void {
  const userSet = userConnections.get(userId);
  if (!userSet || userSet.size === 0) {
    logger.debug({ userId }, "No active connections for user");
    return;
  }

  const messageStr = JSON.stringify(message);
  userSet.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });

  logger.debug({ userId, type: message.type, connectionCount: userSet.size }, "Message sent to user");
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  uniqueUsers: number;
  connectionsByRole: Record<string, number>;
} {
  const connectionsByRole: Record<string, number> = { STAFF: 0, MANAGER: 0 };

  for (const info of connections.values()) {
    connectionsByRole[info.role]++;
  }

  return {
    totalConnections: connections.size,
    uniqueUsers: userConnections.size,
    connectionsByRole,
  };
}

/**
 * Close all WebSocket connections gracefully
 */
export function closeAllConnections(): void {
  if (!wss) {
    return;
  }

  wss.clients.forEach((ws: AuthenticatedWebSocket) => {
    ws.close(1000, "Server shutting down");
  });

  connections.clear();
  userConnections.clear();
  logger.info("All WebSocket connections closed");
}

/**
 * Get WebSocket server instance (for testing)
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
