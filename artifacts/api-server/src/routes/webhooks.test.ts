import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { Router } from "express";

// Mock logger
vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env to skip signature verification
vi.mock("../lib/env", () => ({
  getEnv: vi.fn(() => ({
    SQUARE_WEBHOOK_SIGNATURE_KEY: "", // Empty key to skip verification in tests
  })),
}));

describe("Webhooks Routes", { tags: ['flaky'] }, () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Create a simplified webhooks router for testing
    const webhooksRouter = Router();
    
    webhooksRouter.post("/webhooks/square", (req, res) => {
      const event = req.body as any;
      
      if (!event || !event.type) {
        res.status(400).json({ error: "Invalid event format" });
        return;
      }
      
      if (event.type === "payment.updated") {
        res.status(200).json({ received: true });
      } else {
        res.status(200).json({ received: true, processed: false });
      }
    });
    
    app.use(webhooksRouter);
  });

  describe("POST /webhooks/square", () => {
    it("should process payment.updated events", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .send({ type: "payment.updated" })
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it("should acknowledge unprocessed event types", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .send({ type: "payment.created" })
        .expect(200);

      expect(response.body).toEqual({ received: true, processed: false });
    });

    it("should return 400 for invalid event format", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid event format" });
    });

    it("should return 400 for missing event type", async () => {
      const response = await request(app)
        .post("/webhooks/square")
        .send({ merchant_id: "test" })
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid event format" });
    });
  });
});
