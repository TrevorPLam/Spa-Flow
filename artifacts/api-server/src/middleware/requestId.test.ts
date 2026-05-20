import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requestIdMiddleware } from "./requestId";

describe("requestIdMiddleware", () => {
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

  it("generates UUID when X-Request-ID header is missing", () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(typeof mockReq.requestId).toBe("string");
    expect(mockReq.requestId?.length).toBe(36); // UUID v4 length
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("uses existing X-Request-ID from header when present", () => {
    const existingId = "test-request-id-123";
    mockReq.headers = {
      "x-request-id": existingId,
    };

    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBe(existingId);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("sets X-Request-ID response header", () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      mockReq.requestId
    );
  });

  it("sets response header with existing ID from request", () => {
    const existingId = "existing-request-id";
    mockReq.headers = {
      "x-request-id": existingId,
    };

    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      existingId
    );
  });

  it("calls next function", () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("generates unique IDs for different requests", () => {
    const mockReq2: Partial<Request> = { headers: {} };
    const mockRes2: Partial<Response> = { setHeader: vi.fn() };
    const mockNext2 = vi.fn();

    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
    requestIdMiddleware(mockReq2 as Request, mockRes2 as Response, mockNext2);

    expect(mockReq.requestId).toBeDefined();
    expect(mockReq2.requestId).toBeDefined();
    expect(mockReq.requestId).not.toBe(mockReq2.requestId);
  });
});
