import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WebSocketServer } from "ws";
import {
  initializeWebSocketServer,
  broadcast,
  broadcastToUser,
  getConnectionStats,
  closeAllConnections,
  getWebSocketServer,
  WebSocketEventType,
  type WebSocketMessage,
} from "./websocket";
import { createServer } from "http";

describe("WebSocket Server", () => {
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(() => {
    // Create a test HTTP server
    httpServer = createServer();
  });

  afterEach(() => {
    // Clean up
    closeAllConnections();
    if (httpServer) {
      httpServer.close();
    }
  });

  describe("Initialization", () => {
    it("should initialize WebSocket server", () => {
      initializeWebSocketServer(httpServer);
      const wss = getWebSocketServer();
      expect(wss).toBeInstanceOf(WebSocketServer);
    });

    it("should not initialize twice", () => {
      initializeWebSocketServer(httpServer);
      const wss1 = getWebSocketServer();
      initializeWebSocketServer(httpServer);
      const wss2 = getWebSocketServer();
      expect(wss1).toBe(wss2);
    });
  });

  describe("Connection Statistics", () => {
    it("should report zero connections when no connections exist", () => {
      const stats = getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.connectionsByRole.STAFF).toBe(0);
      expect(stats.connectionsByRole.MANAGER).toBe(0);
    });
  });

  describe("Broadcasting", () => {
    it("should handle broadcast when server not initialized", () => {
      const message: WebSocketMessage = {
        type: WebSocketEventType.LOCKER_STATUS_CHANGE,
        data: { lockerId: 1, status: "OCCUPIED" },
        timestamp: new Date().toISOString(),
      };

      // Should not throw when server is not initialized
      expect(() => broadcast(message)).not.toThrow();
    });

    it("should handle broadcastToUser when no connections exist", () => {
      const message: WebSocketMessage = {
        type: WebSocketEventType.ROOM_STATUS_CHANGE,
        data: { roomId: 1, status: "AVAILABLE" },
        timestamp: new Date().toISOString(),
      };

      // Should not throw when no connections exist
      expect(() => broadcastToUser("123", message)).not.toThrow();
    });
  });

  describe("Graceful Shutdown", () => {
    it("should handle closeAllConnections when server not initialized", () => {
      // Should not throw when server is not initialized
      expect(() => closeAllConnections()).not.toThrow();
    });
  });
});
