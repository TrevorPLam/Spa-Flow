import { describe, it, expect } from "vitest";
import {
  AuthErrorCodes,
  AuthErrorMessages,
  createAuthErrorResponse,
  type AuthErrorResponse,
} from "./authErrors";

describe("authErrors", { tags: ['regression'] }, () => {
  describe("AuthErrorCodes", () => {
    it("should have all required error codes", () => {
      expect(AuthErrorCodes.UNAUTHORIZED).toBe("AUTH_001");
      expect(AuthErrorCodes.INVALID_CREDENTIALS).toBe("AUTH_002");
      expect(AuthErrorCodes.INVALID_SESSION).toBe("AUTH_003");
      expect(AuthErrorCodes.INVALID_REFRESH_TOKEN).toBe("AUTH_004");
      expect(AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED).toBe("AUTH_005");
      expect(AuthErrorCodes.MANAGER_ACCESS_REQUIRED).toBe("AUTH_006");
      expect(AuthErrorCodes.ACCOUNT_LOCKED).toBe("AUTH_007");
      expect(AuthErrorCodes.USER_NOT_FOUND).toBe("AUTH_008");
      expect(AuthErrorCodes.INVALID_REQUEST).toBe("AUTH_009");
      expect(AuthErrorCodes.INTERNAL_SERVER_ERROR).toBe("AUTH_010");
    });

    it("should have unique error codes", () => {
      const codes = Object.values(AuthErrorCodes);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe("AuthErrorMessages", () => {
    it("should have messages for all error codes", () => {
      Object.values(AuthErrorCodes).forEach((code) => {
        expect(AuthErrorMessages[code]).toBeDefined();
        expect(typeof AuthErrorMessages[code]).toBe("string");
        expect(AuthErrorMessages[code].length).toBeGreaterThan(0);
      });
    });

    it("should have user-friendly but generic messages", () => {
      expect(AuthErrorMessages[AuthErrorCodes.UNAUTHORIZED]).toBe("Unauthorized");
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_CREDENTIALS]).toBe("Invalid credentials");
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_SESSION]).toBe("Invalid or expired session");
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_REFRESH_TOKEN]).toBe("Invalid or expired refresh token");
      expect(AuthErrorMessages[AuthErrorCodes.REFRESH_TOKEN_ROTATION_FAILED]).toBe("Failed to rotate refresh token");
      expect(AuthErrorMessages[AuthErrorCodes.MANAGER_ACCESS_REQUIRED]).toBe("Manager access required");
      expect(AuthErrorMessages[AuthErrorCodes.ACCOUNT_LOCKED]).toBe("Account temporarily locked due to too many failed login attempts");
      expect(AuthErrorMessages[AuthErrorCodes.USER_NOT_FOUND]).toBe("User not found");
      expect(AuthErrorMessages[AuthErrorCodes.INVALID_REQUEST]).toBe("Invalid request");
      expect(AuthErrorMessages[AuthErrorCodes.INTERNAL_SERVER_ERROR]).toBe("Internal server error");
    });

    it("should not reveal sensitive information", () => {
      Object.values(AuthErrorMessages).forEach((message) => {
        // Messages should not contain database details, stack traces, etc.
        expect(message.toLowerCase()).not.toContain("database");
        expect(message.toLowerCase()).not.toContain("sql");
        expect(message.toLowerCase()).not.toContain("stack");
        expect(message.toLowerCase()).not.toContain("password");
      });
    });
  });

  describe("createAuthErrorResponse", () => {
    it("should create error response with default message", () => {
      const response = createAuthErrorResponse(AuthErrorCodes.UNAUTHORIZED);
      
      expect(response).toEqual({
        error: "Unauthorized",
        code: "AUTH_001",
      });
    });

    it("should create error response with custom message", () => {
      const customMessage = "Custom error message";
      const response = createAuthErrorResponse(AuthErrorCodes.UNAUTHORIZED, customMessage);
      
      expect(response).toEqual({
        error: customMessage,
        code: "AUTH_001",
      });
    });

    it("should include error code in response", () => {
      const response = createAuthErrorResponse(AuthErrorCodes.INVALID_CREDENTIALS);
      
      expect(response.code).toBe("AUTH_002");
      expect(typeof response.code).toBe("string");
    });

    it("should include error message in response", () => {
      const response = createAuthErrorResponse(AuthErrorCodes.INVALID_CREDENTIALS);
      
      expect(response.error).toBe("Invalid credentials");
      expect(typeof response.error).toBe("string");
    });

    it("should match AuthErrorResponse interface", () => {
      const response = createAuthErrorResponse(AuthErrorCodes.UNAUTHORIZED);
      
      // Type check - response should have error and code properties
      expect(response).toHaveProperty("error");
      expect(response).toHaveProperty("code");
      
      // Type guard check
      const isAuthErrorResponse = (obj: unknown): obj is AuthErrorResponse => {
        return typeof obj === "object" && obj !== null && 
               "error" in obj && "code" in obj;
      };
      
      expect(isAuthErrorResponse(response)).toBe(true);
    });

    it("should handle all error codes", () => {
      Object.values(AuthErrorCodes).forEach((code) => {
        const response = createAuthErrorResponse(code);
        
        expect(response.code).toBe(code);
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe("string");
      });
    });
  });
});
