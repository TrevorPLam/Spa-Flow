import { describe, it, expect, vi } from "vitest";
import { reconciliationService } from "./reconciliation";

// Mock the db module
const mockQueryBuilder = {
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
};

const mockInsertBuilder = {
  values: vi.fn(),
};

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => mockQueryBuilder),
    insert: vi.fn(() => mockInsertBuilder),
  },
  transactionsTable: {},
  reconciliationResultsTable: {},
}));

// Mock logger
vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env
vi.mock("../lib/env", () => ({
  getEnv: vi.fn(() => ({
    SQUARE_ACCESS_TOKEN: null, // Mock mode by default
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_API_VERSION: "2024-01-01",
  })),
}));

describe("ReconciliationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectDiscrepancies", () => {
    it("should detect transactions missing in Square", () => {
      const internalTransactions = [
        { id: 1, squarePaymentId: "sq_123", total: 100 },
        { id: 2, squarePaymentId: "sq_456", total: 200 },
      ];
      const squarePayments = [
        { id: "sq_123", amount_money: { amount: 10000 }, status: "COMPLETED", created_at: "2024-01-01" },
      ];

      // Access private method via type assertion for testing
      const service = reconciliationService as any;
      const discrepancies = service.detectDiscrepancies(internalTransactions, squarePayments);

      expect(discrepancies.missingInSquare).toHaveLength(1);
      expect(discrepancies.missingInSquare[0]).toEqual({
        paymentId: "2",
        amount: 200,
      });
    });

    it("should detect Square payments missing in internal records", () => {
      const internalTransactions = [
        { id: 1, squarePaymentId: "sq_123", total: 100 },
      ];
      const squarePayments = [
        { id: "sq_123", amount_money: { amount: 10000 }, status: "COMPLETED", created_at: "2024-01-01" },
        { id: "sq_789", amount_money: { amount: 30000 }, status: "COMPLETED", created_at: "2024-01-01" },
      ];

      const service = reconciliationService as any;
      const discrepancies = service.detectDiscrepancies(internalTransactions, squarePayments);

      expect(discrepancies.missingInInternal).toHaveLength(1);
      expect(discrepancies.missingInInternal[0]).toEqual({
        squarePaymentId: "sq_789",
        amount: 300,
      });
    });

    it("should detect amount mismatches", () => {
      const internalTransactions = [
        { id: 1, squarePaymentId: "sq_123", total: 100 },
        { id: 2, squarePaymentId: "sq_456", total: 250 },
      ];
      const squarePayments = [
        { id: "sq_123", amount_money: { amount: 10000 }, status: "COMPLETED", created_at: "2024-01-01" },
        { id: "sq_456", amount_money: { amount: 20000 }, status: "COMPLETED", created_at: "2024-01-01" },
      ];

      const service = reconciliationService as any;
      const discrepancies = service.detectDiscrepancies(internalTransactions, squarePayments);

      expect(discrepancies.amountMismatches).toHaveLength(1);
      expect(discrepancies.amountMismatches[0]).toEqual({
        paymentId: "2",
        squarePaymentId: "sq_456",
        internalAmount: 250,
        squareAmount: 200,
      });
    });

    it("should return no discrepancies when all match", () => {
      const internalTransactions = [
        { id: 1, squarePaymentId: "sq_123", total: 100 },
      ];
      const squarePayments = [
        { id: "sq_123", amount_money: { amount: 10000 }, status: "COMPLETED", created_at: "2024-01-01" },
      ];

      const service = reconciliationService as any;
      const discrepancies = service.detectDiscrepancies(internalTransactions, squarePayments);

      expect(discrepancies.missingInSquare).toHaveLength(0);
      expect(discrepancies.missingInInternal).toHaveLength(0);
      expect(discrepancies.amountMismatches).toHaveLength(0);
    });
  });

  describe("calculateInternalTotal", () => {
    it("should calculate total from internal transactions", () => {
      const transactions = [
        { total: 100 },
        { total: 200 },
        { total: 50 },
      ];

      const service = reconciliationService as any;
      const total = service.calculateInternalTotal(transactions);

      expect(total).toBe(350);
    });

    it("should return 0 for empty array", () => {
      const service = reconciliationService as any;
      const total = service.calculateInternalTotal([]);

      expect(total).toBe(0);
    });
  });

  describe("calculateSquareTotal", () => {
    it("should calculate total from Square payments", () => {
      const payments = [
        { id: "sq_1", amount_money: { amount: 10000 }, status: "COMPLETED", created_at: "2024-01-01" },
        { id: "sq_2", amount_money: { amount: 20000 }, status: "COMPLETED", created_at: "2024-01-01" },
      ];

      const service = reconciliationService as any;
      const total = service.calculateSquareTotal(payments);

      expect(total).toBe(300);
    });

    it("should return 0 for empty array", () => {
      const service = reconciliationService as any;
      const total = service.calculateSquareTotal([]);

      expect(total).toBe(0);
    });
  });

  // Note: Integration tests for runReconciliation require complex Drizzle ORM mocking.
  // The core reconciliation logic is tested via detectDiscrepancies, calculateInternalTotal,
  // and calculateSquareTotal tests above. Integration tests can be added with proper test DB setup.
});
