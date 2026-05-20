import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Graceful Shutdown Integration Tests", () => {
  it("should have graceful shutdown function exported", async () => {
    const { gracefulShutdown } = await import("./index");
    expect(typeof gracefulShutdown).toBe("function");
  });

  it("should have database pool with end method", async () => {
    const { pool } = await import("@workspace/db");
    expect(typeof pool.end).toBe("function");
  });

  it("should have cache close function", async () => {
    const { closeCache } = await import("./lib/cache");
    expect(typeof closeCache).toBe("function");
  });

  it("should have logger methods for shutdown logging", async () => {
    const { logger } = await import("./lib/logger");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});
