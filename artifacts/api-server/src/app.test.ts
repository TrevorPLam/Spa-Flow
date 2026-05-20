import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app";

describe("Correlation ID Integration Tests", { tags: ['@integration'] }, () => {
  it("request without header gets new correlation ID", async () => {
    const response = await request(app).get("/healthz");

    expect(response.headers["x-correlation-id"]).toBeDefined();
    expect(typeof response.headers["x-correlation-id"]).toBe("string");
    expect(response.headers["x-correlation-id"].length).toBe(36); // UUID v4 length
  });

  it("request with header keeps existing correlation ID", async () => {
    const correlationId = "test-correlation-123";
    const response = await request(app)
      .get("/healthz")
      .set("X-Correlation-ID", correlationId);

    expect(response.headers["x-correlation-id"]).toBe(correlationId);
  });

  it("ID appears in response header", async () => {
    const correlationId = "test-correlation-456";
    const response = await request(app)
      .get("/healthz")
      .set("X-Correlation-ID", correlationId);

    expect(response.headers["x-correlation-id"]).toBe(correlationId);
  });

  it("different requests get different correlation IDs when not provided", async () => {
    const response1 = await request(app).get("/healthz");
    const response2 = await request(app).get("/healthz");

    expect(response1.headers["x-correlation-id"]).toBeDefined();
    expect(response2.headers["x-correlation-id"]).toBeDefined();
    expect(response1.headers["x-correlation-id"]).not.toBe(
      response2.headers["x-correlation-id"]
    );
  });
});
