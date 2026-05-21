/**
 * Tests for Email Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailService } from "./email";
import { logger } from "../lib/logger";
import { getEnv } from "../lib/env";

// Mock the logger
vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock getEnv to avoid environment validation in tests
vi.mock("../lib/env", () => ({
  getEnv: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe("EmailService", { tags: ['regression', 'integration'] }, () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    vi.clearAllMocks();
    // Mock getEnv to return empty config by default
    (getEnv as any).mockReturnValue({
      RESEND_API_KEY: "",
      EMAIL_FROM_ADDRESS: "",
      EMAIL_FROM_NAME: "SpaFlow",
    });
  });

  describe("sendPasswordReset", () => {
    it("should not send email if Resend not configured", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "",
        EMAIL_FROM_ADDRESS: "",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      await emailService.sendPasswordReset("test@example.com", "https://example.com/reset", 30);

      expect(logger.info).toHaveBeenCalledWith(
        { to: "test@example.com" },
        "Password reset email not sent - Resend not configured"
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should send password reset email successfully", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await emailService.sendPasswordReset("test@example.com", "https://example.com/reset", 30);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("test@example.com"),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: "test@example.com" },
        "Password reset email sent successfully"
      );
    });

    it("should log error when email send fails", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => "API Error",
      });

      await expect(
        emailService.sendPasswordReset("test@example.com", "https://example.com/reset", 30)
      ).rejects.toThrow("Failed to send password reset email: API Error");

      expect(logger.error).toHaveBeenCalledWith(
        { error: "API Error", to: "test@example.com" },
        "Resend password reset email failed"
      );
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), to: "test@example.com" },
        "Error sending password reset email"
      );
    });

    it("should handle network errors", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      await expect(
        emailService.sendPasswordReset("test@example.com", "https://example.com/reset", 30)
      ).rejects.toThrow("Network error");

      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), to: "test@example.com" },
        "Error sending password reset email"
      );
    });
  });

  describe("sendPasswordResetConfirmation", () => {
    it("should not send email if Resend not configured", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "",
        EMAIL_FROM_ADDRESS: "",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      await emailService.sendPasswordResetConfirmation("test@example.com");

      expect(logger.info).toHaveBeenCalledWith(
        { to: "test@example.com" },
        "Password reset confirmation email not sent - Resend not configured"
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should send password reset confirmation email successfully", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await emailService.sendPasswordResetConfirmation("test@example.com");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("test@example.com"),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: "test@example.com" },
        "Password reset confirmation email sent successfully"
      );
    });

    it("should log error when confirmation email send fails", async () => {
      (getEnv as any).mockReturnValue({
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        EMAIL_FROM_NAME: "SpaFlow",
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => "API Error",
      });

      await expect(
        emailService.sendPasswordResetConfirmation("test@example.com")
      ).rejects.toThrow("Failed to send password reset confirmation email: API Error");

      expect(logger.error).toHaveBeenCalledWith(
        { error: "API Error", to: "test@example.com" },
        "Resend password reset confirmation email failed"
      );
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), to: "test@example.com" },
        "Error sending password reset confirmation email"
      );
    });
  });
});
