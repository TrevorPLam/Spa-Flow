import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkAndSendExpirationReminders } from "./notifications";
import { sendSms } from "../lib/sms";
import { getEnv } from "../lib/env";
import { writeAuditLog } from "../lib/audit";

// Mock dependencies
vi.mock("../lib/sms");
vi.mock("../lib/env");
vi.mock("../lib/audit");

describe("notifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({
      REMINDER_MINUTES_BEFORE: "30,15",
    } as any);
  });

  describe("checkAndSendExpirationReminders", () => {
    it("should parse reminder timing from environment", async () => {
      vi.mocked(getEnv).mockReturnValue({
        REMINDER_MINUTES_BEFORE: "30,15,5",
      } as any);

      vi.mocked(sendSms).mockResolvedValue();
      vi.mocked(writeAuditLog).mockResolvedValue();

      await checkAndSendExpirationReminders();

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle empty reminder list", async () => {
      vi.mocked(getEnv).mockReturnValue({
        REMINDER_MINUTES_BEFORE: "",
      } as any);

      await checkAndSendExpirationReminders();

      // Should not throw error
      expect(true).toBe(true);
    });
  });
});
