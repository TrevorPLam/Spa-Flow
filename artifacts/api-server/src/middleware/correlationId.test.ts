import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { correlationIdMiddleware } from "./correlationId";

describe("correlationIdMiddleware", { tags: ['@regression'] }, () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it("generates UUID when X-Correlation-ID header is missing", () => {
    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.correlationId).toBeDefined();
    expect(typeof mockReq.correlationId).toBe("string");
    expect(mockReq.correlationId?.length).toBe(36); // UUID v4 length
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("uses existing X-Correlation-ID from header when present", () => {
    const existingId = "test-correlation-id-123";
    mockReq.headers = {
      "x-correlation-id": existingId,
    };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.correlationId).toBe(existingId);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("sets X-Correlation-ID response header", () => {
    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "x-correlation-id",
      mockReq.correlationId
    );
  });

  it("sets response header with existing ID from request", () => {
    const existingId = "existing-correlation-id";
    mockReq.headers = {
      "x-correlation-id": existingId,
    };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "x-correlation-id",
      existingId
    );
  });

  it("calls next function", () => {
    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
