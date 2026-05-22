import { describe, it, expect } from "vitest";
import { validateClientData } from "./data-quality";

describe("Data Quality Service", () => {
  describe("validateClientData", () => {
    it("validates correct phone format", () => {
      const result = validateClientData({ phone: "(555) 123-4567" });
      const phoneResult = result.find((r) => r.field === "phone");
      expect(phoneResult?.valid).toBe(true);
    });

    it("rejects phone with less than 10 digits", () => {
      const result = validateClientData({ phone: "123456" });
      const phoneResult = result.find((r) => r.field === "phone");
      expect(phoneResult?.valid).toBe(false);
      expect(phoneResult?.error).toContain("at least 10 digits");
    });

    it("validates correct email format", () => {
      const result = validateClientData({ email: "john@example.com" });
      const emailResult = result.find((r) => r.field === "email");
      expect(emailResult?.valid).toBe(true);
    });

    it("rejects invalid email format", () => {
      const result = validateClientData({ email: "invalid-email" });
      const emailResult = result.find((r) => r.field === "email");
      expect(emailResult?.valid).toBe(false);
      expect(emailResult?.error).toContain("Invalid email format");
    });

    it("handles null values", () => {
      const result = validateClientData({ phone: null, email: null });
      expect(result.every((r) => r.valid)).toBe(true);
    });

    it("validates multiple fields", () => {
      const result = validateClientData({
        phone: "(555) 123-4567",
        email: "john@example.com",
      });
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.valid)).toBe(true);
    });
  });
});
