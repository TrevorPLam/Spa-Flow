import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import reconciliationRouter from "./reconciliation";
import { reconciliationService } from "../services/reconciliation";

// Mock the reconciliation service
vi.mock("../services/reconciliation", () => ({
  reconciliationService: {
    getReconciliationHistory: vi.fn(),
    runReconciliation: vi.fn(),
  },
}));

// Mock requireManager middleware
vi.mock("../lib/auth", () => ({
  requireManager: (req: any, res: any, next: any) => {
    req.user = { id: "1", email: "manager@example.com", role: "MANAGER", name: "Test Manager" };
    next();
  },
}));

// Mock apiLimiter middleware
vi.mock("../middleware/rateLimit", () => ({
  apiLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Reconciliation Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(reconciliationRouter);
  });

  describe("GET /reconciliation", () => {
    it("should return reconciliation history for valid date range", async () => {
      const mockResults = [
        {
          date: new Date("2024-01-01"),
          totalInternal: 1000,
          totalSquare: 1000,
          discrepancies: { missingInSquare: [], missingInInternal: [], amountMismatches: [] },
          status: "matched" as const,
        },
      ];

      vi.mocked(reconciliationService.getReconciliationHistory).mockResolvedValue(mockResults);

      const response = await request(app)
        .get("/reconciliation?startDate=2024-01-01&endDate=2024-01-31")
        .expect(200);

      expect(response.body).toEqual({
        data: mockResults.map(r => ({ ...r, date: r.date.toISOString() })),
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T00:00:00.000Z",
      });

      expect(reconciliationService.getReconciliationHistory).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });

    it("should use default date range when not provided", async () => {
      vi.mocked(reconciliationService.getReconciliationHistory).mockResolvedValue([]);

      await request(app).get("/reconciliation").expect(200);

      expect(reconciliationService.getReconciliationHistory).toHaveBeenCalled();
    });

    it("should return 400 for invalid date format", async () => {
      const response = await request(app)
        .get("/reconciliation?startDate=invalid-date")
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid date format. Use ISO 8601 format" });
    });

    it("should return 400 when start date is after end date", async () => {
      const response = await request(app)
        .get("/reconciliation?startDate=2024-01-31&endDate=2024-01-01")
        .expect(400);

      expect(response.body).toEqual({ error: "Start date must be before end date" });
    });

    it("should return 500 when service fails", async () => {
      vi.mocked(reconciliationService.getReconciliationHistory).mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .get("/reconciliation")
        .expect(500);

      expect(response.body).toEqual({ error: "Failed to fetch reconciliation history" });
    });
  });

  describe("POST /reconciliation/run", () => {
    it("should trigger reconciliation for specified date", async () => {
      const mockResult = {
        date: new Date("2024-01-01"),
        totalInternal: 1000,
        totalSquare: 1000,
        discrepancies: { missingInSquare: [], missingInInternal: [], amountMismatches: [] },
        status: "matched" as const,
      };

      vi.mocked(reconciliationService.runReconciliation).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/reconciliation/run")
        .send({ date: "2024-01-01" })
        .expect(200);

      expect(response.body).toEqual({
        data: { ...mockResult, date: mockResult.date.toISOString() },
        message: "Reconciliation completed successfully",
      });

      expect(reconciliationService.runReconciliation).toHaveBeenCalledWith(expect.any(Date));
    });

    it("should use today's date when not provided", async () => {
      vi.mocked(reconciliationService.runReconciliation).mockResolvedValue({
        date: new Date(),
        totalInternal: 0,
        totalSquare: 0,
        discrepancies: { missingInSquare: [], missingInInternal: [], amountMismatches: [] },
        status: "matched" as const,
      });

      await request(app).post("/reconciliation/run").send({}).expect(200);

      expect(reconciliationService.runReconciliation).toHaveBeenCalled();
    });

    it("should return 400 for invalid date format", async () => {
      const response = await request(app)
        .post("/reconciliation/run")
        .send({ date: "invalid-date" })
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid date format. Use ISO 8601 format" });
    });

    it("should return 500 when reconciliation fails", async () => {
      vi.mocked(reconciliationService.runReconciliation).mockRejectedValue(
        new Error("Reconciliation failed")
      );

      const response = await request(app)
        .post("/reconciliation/run")
        .send({ date: "2024-01-01" })
        .expect(500);

      expect(response.body).toEqual({ error: "Reconciliation failed" });
    });
  });
});
