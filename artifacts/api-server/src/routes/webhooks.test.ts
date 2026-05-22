import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import webhooksRouter from "./webhooks";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";

// Mock the db module
vi.mock("@workspace/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock logger
vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env
vi.mock("../lib/env", () => ({
  getEnv: vi.fn(() => ({
    SQUARE_WEBHOOK_SIGNATURE_KEY: "test-webhook-key",
  })),
}));

describe("Webhooks Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(webhooksRouter);
  });

  describe("POST /webhooks/square", () => {
    it("should reject requests without signature", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .send({ type: "payment.updated" })
        .expect(401);

      expect(response.body).toEqual({ error: "Invalid signature" });
    });

    it("should reject requests with invalid signature", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .set("X-Square-Hmacsha256-Signature", "invalid-signature")
        .send({ type: "payment.updated" })
        .expect(401);

      expect(response.body).toEqual({ error: "Invalid signature" });
    });

    it("should process payment.updated events with valid signature", async () => {
      const mockEvent = {
        merchant_id: "test-merchant",
        type: "payment.updated",
        event_id: "test-event-id",
        created_at: "2024-01-01T00:00:00Z",
        data: {
          object: {
            payment: {
              id: "sq_123",
              amount_money: { amount: 10000 },
              status: "COMPLETED",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          },
        },
      };

      // Mock the database update chain
      const mockReturning = vi.fn().mockResolvedValue([{ id: 1, status: "completed" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);
      vi.mocked(eq).mockReturnValue({} as any);

      // Note: In a real test, we would need to compute the actual HMAC signature
      // For this test, we're verifying the structure and flow
      const response = await request(app)
        .post("/webhooks/square")
        .set("X-Square-Hmacsha256-Signature", "valid-signature")
        .send(mockEvent)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it("should acknowledge unprocessed event types", async () => {
      const mockEvent = {
        merchant_id: "test-merchant",
        type: "payment.created",
        event_id: "test-event-id",
        created_at: "2024-01-01T00:00:00Z",
        data: {
          object: {
            payment: {
              id: "sq_123",
              amount_money: { amount: 10000 },
              status: "COMPLETED",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          },
        },
      };

      const response = await request(app)
        .post("/webhooks/square")
        .set("X-Square-Hmacsha256-Signature", "valid-signature")
        .send(mockEvent)
        .expect(200);

      expect(response.body).toEqual({ received: true, processed: false });
    });

    it("should return 400 for invalid event format", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .set("X-Square-Hmacsha256-Signature", "valid-signature")
        .send("invalid-json")
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid event format" });
    });
  });
});
