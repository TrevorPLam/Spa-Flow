import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  detectBulkPIIAccess,
  detectOffHoursPIIAccess,
  detectRapidPIIAccess,
  detectPIIAnomalies,
  logPIIAnomaly,
  sendPIIAnomalyAlert,
  checkPIIAccessAnomalies,
} from "./pii-audit";
import { writeAuditLog } from "../lib/audit";
import { logger } from "../lib/logger";

// Mock dependencies
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
  },
  auditLogsTable: {},
  usersTable: {},
}));
vi.mock("../lib/audit");
vi.mock("../lib/logger");

describe("PII Audit Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeAuditLog).mockResolvedValue();
    vi.mocked(logger.warn).mockReturnValue(undefined);
    vi.mocked(logger.info).mockReturnValue(undefined);
    vi.mocked(logger.error).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectBulkPIIAccess", () => {
    it("should detect bulk PII access when threshold exceeded", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 15 }]);

      const anomaly = await detectBulkPIIAccess(1);

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("bulk_access");
      expect(anomaly?.severity).toBe("high");
      expect(anomaly?.description).toContain("15 clients");
    });

    it("should return null when bulk access threshold not exceeded", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 5 }]);

      const anomaly = await detectBulkPIIAccess(1);

      expect(anomaly).toBeNull();
    });

    it("should return medium severity for bulk access between 10-20", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 12 }]);

      const anomaly = await detectBulkPIIAccess(1);

      expect(anomaly?.severity).toBe("medium");
    });
  });

  describe("detectOffHoursPIIAccess", () => {
    it("should detect off-hours access before business hours", async () => {
      // Mock current time to 6 AM (before 8 AM)
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(6);
        }
        override getHours() {
          return 6;
        }
      }
      global.Date = MockDate as any;

      const anomaly = await detectOffHoursPIIAccess(1);

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("off_hours");
      expect(anomaly?.severity).toBe("medium");
      expect(anomaly?.description).toContain("6:00");

      global.Date = originalDate;
    });

    it("should detect off-hours access after business hours", async () => {
      // Mock current time to 10 PM (after 8 PM)
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(22);
        }
        override getHours() {
          return 22;
        }
      }
      global.Date = MockDate as any;

      const anomaly = await detectOffHoursPIIAccess(1);

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("off_hours");

      global.Date = originalDate;
    });

    it("should return null during business hours", async () => {
      // Mock current time to 2 PM (within 8 AM - 8 PM)
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(14);
        }
        override getHours() {
          return 14;
        }
      }
      global.Date = MockDate as any;

      const anomaly = await detectOffHoursPIIAccess(1);

      expect(anomaly).toBeNull();

      global.Date = originalDate;
    });
  });

  describe("detectRapidPIIAccess", () => {
    it("should detect rapid successive PII access", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 7 }]);

      const anomaly = await detectRapidPIIAccess(1);

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("rapid_access");
      expect(anomaly?.severity).toBe("high");
      expect(anomaly?.description).toContain("7 times");
    });

    it("should return null when rapid access threshold not exceeded", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 3 }]);

      const anomaly = await detectRapidPIIAccess(1);

      expect(anomaly).toBeNull();
    });
  });

  describe("detectPIIAnomalies", () => {
    it("should detect multiple anomalies", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 15 }]);

      // Mock off-hours access
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(6);
        }
        override getHours() {
          return 6;
        }
      }
      global.Date = MockDate as any;

      const anomalies = await detectPIIAnomalies(1);

      expect(anomalies).toHaveLength(2);
      expect(anomalies.some(a => a.type === "bulk_access")).toBe(true);
      expect(anomalies.some(a => a.type === "off_hours")).toBe(true);

      global.Date = originalDate;
    });

    it("should return empty array when no anomalies detected", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 5 }]);

      // Mock business hours
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(14);
        }
        override getHours() {
          return 14;
        }
      }
      global.Date = MockDate as any;

      const anomalies = await detectPIIAnomalies(1);

      expect(anomalies).toHaveLength(0);

      global.Date = originalDate;
    });
  });

  describe("logPIIAnomaly", () => {
    it("should log PII anomaly to audit log", async () => {
      const anomaly = {
        type: "bulk_access" as const,
        userId: 1,
        description: "Test anomaly",
        severity: "high" as const,
        metadata: { test: true },
      };

      await logPIIAnomaly(anomaly, 1);

      expect(writeAuditLog).toHaveBeenCalledWith({
        userId: 1,
        action: "PII_ANOMALY_DETECTED",
        resourceType: "pii_audit",
        description: "Test anomaly",
        requestId: expect.stringContaining("anomaly-bulk_access-1-"),
      });
    });

    it("should log warning to logger", async () => {
      const anomaly = {
        type: "off_hours" as const,
        userId: 1,
        description: "Test anomaly",
        severity: "medium" as const,
        metadata: {},
      };

      await logPIIAnomaly(anomaly, 1);

      expect(logger.warn).toHaveBeenCalledWith(
        { anomaly, requestingUserId: 1 },
        "PII access anomaly detected"
      );
    });
  });

  describe("sendPIIAnomalyAlert", () => {
    it("should send alert to all managers", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([
        { id: 1, email: "manager1@example.com", name: "Manager 1" },
        { id: 2, email: "manager2@example.com", name: "Manager 2" },
      ]);

      const anomaly = {
        type: "bulk_access" as const,
        userId: 1,
        description: "Test anomaly",
        severity: "high" as const,
        metadata: {},
      };

      await sendPIIAnomalyAlert(anomaly);

      expect(writeAuditLog).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        { anomaly, managerCount: 2 },
        "PII anomaly alert logged for managers"
      );
    });

    it("should log warning when no managers found", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([]);

      const anomaly = {
        type: "bulk_access" as const,
        userId: 1,
        description: "Test anomaly",
        severity: "high" as const,
        metadata: {},
      };

      await sendPIIAnomalyAlert(anomaly);

      expect(logger.warn).toHaveBeenCalledWith(
        { anomaly },
        "No managers found to notify about PII anomaly"
      );
    });

    it("should handle errors gracefully", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error("Database error");
      });

      const anomaly = {
        type: "bulk_access" as const,
        userId: 1,
        description: "Test anomaly",
        severity: "high" as const,
        metadata: {},
      };

      await sendPIIAnomalyAlert(anomaly);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("checkPIIAccessAnomalies", () => {
    it("should log and alert for high severity anomalies", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 15 }]);

      await checkPIIAccessAnomalies(1);

      expect(writeAuditLog).toHaveBeenCalled();
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PII_ANOMALY_ALERT",
        })
      );
    });

    it("should log and alert for medium severity anomalies", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 12 }]);

      // Mock off-hours access
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(6);
        }
        override getHours() {
          return 6;
        }
      }
      global.Date = MockDate as any;

      await checkPIIAccessAnomalies(1);

      expect(writeAuditLog).toHaveBeenCalled();

      global.Date = originalDate;
    });

    it("should not alert for low severity anomalies", async () => {
      const { db } = await import("@workspace/db");
      vi.mocked(db.select).mockResolvedValue([{ count: 5 }]);

      // Mock business hours
      const originalDate = Date;
      class MockDate extends Date {
        constructor() {
          super();
          this.setHours(14);
        }
        override getHours() {
          return 14;
        }
      }
      global.Date = MockDate as any;

      await checkPIIAccessAnomalies(1);

      expect(writeAuditLog).not.toHaveBeenCalled();

      global.Date = originalDate;
    });
  });
});
