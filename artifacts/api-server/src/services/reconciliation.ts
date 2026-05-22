import { db, transactionsTable, reconciliationResultsTable } from "@workspace/db";
import { and, gte, lte, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getEnv } from "../lib/env";
import { writeAuditLog } from "../lib/audit";

/**
 * Discrepancy details for reconciliation
 */
export interface Discrepancies {
  missingInSquare: Array<{ paymentId: string; amount: number }>;
  missingInInternal: Array<{ squarePaymentId: string; amount: number }>;
  amountMismatches: Array<{
    paymentId: string;
    squarePaymentId: string;
    internalAmount: number;
    squareAmount: number;
  }>;
}

/**
 * Result of a reconciliation operation
 */
export interface ReconciliationResult {
  date: Date;
  totalInternal: number;
  totalSquare: number;
  discrepancies: Discrepancies;
  status: "matched" | "discrepancy" | "pending";
}

/**
 * Square payment data from API
 */
interface SquarePayment {
  id: string;
  amount_money: {
    amount: number;
  };
  status: string;
  created_at: string;
}

/**
 * ReconciliationService handles payment reconciliation between internal transactions
 * and Square payments. Detects discrepancies and stores reconciliation results.
 */
export class ReconciliationService {
  /**
   * Fetch Square payments for a date range
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of Square payments
   */
  private async fetchSquarePayments(
    startDate: Date,
    endDate: Date
  ): Promise<SquarePayment[]> {
    const env = getEnv();
    const accessToken = env.SQUARE_ACCESS_TOKEN;
    const environment = env.SQUARE_ENVIRONMENT;
    const apiVersion = env.SQUARE_API_VERSION;

    // If no Square token configured, return empty array for dev
    if (!accessToken) {
      logger.info("Square reconciliation mock (no credentials configured)");
      return [];
    }

    const baseUrl =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const beginTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const response = await fetch(
      `${baseUrl}/v2/payments?begin_time=${beginTime}&end_time=${endTime}&sort_field=CREATED_AT&sort_order=ASC`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": apiVersion,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      logger.error({ squareError: err, startDate, endDate }, "Square payments fetch failed");
      throw new Error("Failed to fetch Square payments for reconciliation");
    }

    const data = (await response.json()) as { payments?: SquarePayment[] };
    return data.payments || [];
  }

  /**
   * Fetch internal transactions for a date range
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of internal transactions with payment IDs
   */
  private async fetchInternalTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ id: number; squarePaymentId: string | null; total: number }>> {
    const transactions = await db
      .select({
        id: transactionsTable.id,
        squarePaymentId: transactionsTable.squarePaymentId,
        total: transactionsTable.total,
      })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.createdAt, startDate),
          lte(transactionsTable.createdAt, endDate)
        )
      );

    return transactions.map((t) => ({
      id: t.id,
      squarePaymentId: t.squarePaymentId,
      total: parseFloat(t.total),
    }));
  }

  /**
   * Compare internal transactions with Square payments to detect discrepancies
   *
   * @param internalTransactions - Internal transaction records
   * @param squarePayments - Square payment records
   * @returns Discrepancy details
   */
  private detectDiscrepancies(
    internalTransactions: Array<{ id: number; squarePaymentId: string | null; total: number }>,
    squarePayments: SquarePayment[]
  ): Discrepancies {
    const discrepancies: Discrepancies = {
      missingInSquare: [],
      missingInInternal: [],
      amountMismatches: [],
    };

    // Create maps for efficient lookup
    const internalMap = new Map(
      internalTransactions.map((t) => [t.squarePaymentId, t])
    );
    const squareMap = new Map(
      squarePayments.map((p) => [p.id, p.amount_money.amount / 100])
    );

    // Find transactions missing in Square
    for (const transaction of internalTransactions) {
      if (transaction.squarePaymentId && !squareMap.has(transaction.squarePaymentId)) {
        discrepancies.missingInSquare.push({
          paymentId: transaction.id.toString(),
          amount: transaction.total,
        });
      }
    }

    // Find Square payments missing in internal records
    for (const [squareId, amount] of squareMap) {
      if (!internalMap.has(squareId)) {
        discrepancies.missingInInternal.push({
          squarePaymentId: squareId,
          amount,
        });
      }
    }

    // Find amount mismatches
    for (const transaction of internalTransactions) {
      if (transaction.squarePaymentId) {
        const squareAmount = squareMap.get(transaction.squarePaymentId);
        if (squareAmount !== undefined && squareAmount !== transaction.total) {
          discrepancies.amountMismatches.push({
            paymentId: transaction.id.toString(),
            squarePaymentId: transaction.squarePaymentId,
            internalAmount: transaction.total,
            squareAmount,
          });
        }
      }
    }

    return discrepancies;
  }

  /**
   * Calculate total from internal transactions
   *
   * @param transactions - Internal transaction records
   * @returns Total amount
   */
  private calculateInternalTotal(
    transactions: Array<{ total: number }>
  ): number {
    return transactions.reduce((sum, t) => sum + t.total, 0);
  }

  /**
   * Calculate total from Square payments
   *
   * @param payments - Square payment records
   * @returns Total amount
   */
  private calculateSquareTotal(payments: SquarePayment[]): number {
    return payments.reduce(
      (sum, p) => sum + p.amount_money.amount / 100,
      0
    );
  }

  /**
   * Run reconciliation for a specific date
   *
   * @param date - Date to reconcile (defaults to today)
   * @returns Reconciliation result
   */
  async runReconciliation(date: Date = new Date()): Promise<ReconciliationResult> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    logger.info({ date: startDate }, "Starting payment reconciliation");

    // Fetch data from both sources
    const [internalTransactions, squarePayments] = await Promise.all([
      this.fetchInternalTransactions(startDate, endDate),
      this.fetchSquarePayments(startDate, endDate),
    ]);

    // Calculate totals
    const totalInternal = this.calculateInternalTotal(internalTransactions);
    const totalSquare = this.calculateSquareTotal(squarePayments);

    // Detect discrepancies
    const discrepancies = this.detectDiscrepancies(internalTransactions, squarePayments);

    // Determine status
    const hasDiscrepancies =
      discrepancies.missingInSquare.length > 0 ||
      discrepancies.missingInInternal.length > 0 ||
      discrepancies.amountMismatches.length > 0;

    const status: "matched" | "discrepancy" | "pending" = hasDiscrepancies
      ? "discrepancy"
      : "matched";

    const result: ReconciliationResult = {
      date: startDate,
      totalInternal,
      totalSquare,
      discrepancies,
      status,
    };

    // Store result in database
    await db.insert(reconciliationResultsTable).values({
      date: startDate,
      totalInternal: totalInternal.toString(),
      totalSquare: totalSquare.toString(),
      discrepancies: discrepancies as any,
      status,
    });

    logger.info(
      {
        date: startDate,
        totalInternal,
        totalSquare,
        status,
        discrepancyCount:
          discrepancies.missingInSquare.length +
          discrepancies.missingInInternal.length +
          discrepancies.amountMismatches.length,
      },
      "Reconciliation completed"
    );

    return result;
  }

  /**
   * Get reconciliation results for a date range
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of reconciliation results
   */
  async getReconciliationHistory(
    startDate: Date,
    endDate: Date
  ): Promise<ReconciliationResult[]> {
    const results = await db
      .select()
      .from(reconciliationResultsTable)
      .where(
        and(
          gte(reconciliationResultsTable.date, startDate),
          lte(reconciliationResultsTable.date, endDate)
        )
      )
      .orderBy(reconciliationResultsTable.date);

    return results.map((r) => ({
      date: r.date,
      totalInternal: parseFloat(r.totalInternal),
      totalSquare: parseFloat(r.totalSquare),
      discrepancies: r.discrepancies as Discrepancies,
      status: r.status,
    }));
  }

  /**
   * Process a refund for a transaction
   * Calls Square refund API and creates a refund transaction record
   *
   * @param transactionId - Internal transaction ID to refund
   * @param amount - Amount to refund (in dollars)
   * @param reason - Reason for refund
   * @param userId - User ID processing the refund
   * @returns Refund transaction record
   */
  async processRefund(
    transactionId: number,
    amount: number,
    reason: string,
    userId: string
  ): Promise<{ refundTransactionId: number; squareRefundId?: string }> {
    const env = getEnv();
    const accessToken = env.SQUARE_ACCESS_TOKEN;
    const environment = env.SQUARE_ENVIRONMENT;
    const apiVersion = env.SQUARE_API_VERSION;

    // Fetch the original transaction
    const [originalTransaction] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .limit(1);

    if (!originalTransaction) {
      throw new Error("Transaction not found");
    }

    if (!originalTransaction.squarePaymentId) {
      throw new Error("Transaction has no Square payment ID, cannot refund");
    }

    // Validate refund amount
    const originalTotal = parseFloat(originalTransaction.total);
    if (amount > originalTotal) {
      throw new Error(`Refund amount ${amount} exceeds original transaction total ${originalTotal}`);
    }

    // If no Square token configured, create mock refund record for dev
    if (!accessToken) {
      logger.info("Square refund mock (no credentials configured)");
      
      const [refundTransaction] = await db
        .insert(transactionsTable)
        .values({
          clientId: originalTransaction.clientId,
          amount: (-amount).toString(),
          tax: "0",
          total: (-amount).toString(),
          type: "refund",
          status: "completed",
          description: `Refund: ${reason}`,
          sessionId: originalTransaction.sessionId,
          originalTransactionId: originalTransaction.id,
        })
        .returning();

      // Update original transaction status
      await db
        .update(transactionsTable)
        .set({ status: "refunded" })
        .where(eq(transactionsTable.id, transactionId));

      // Add audit log
      await writeAuditLog({
        userId: parseInt(userId, 10),
        action: "refund_processed",
        resourceType: "transaction",
        resourceId: transactionId,
        description: `Refund of $${amount}: ${reason}`,
      });

      return { refundTransactionId: refundTransaction.id };
    }

    // Call Square refund API
    const baseUrl =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const refundAmountCents = Math.round(amount * 100);
    const response = await fetch(`${baseUrl}/v2/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": apiVersion,
      },
      body: JSON.stringify({
        idempotency_key: `refund-${transactionId}-${Date.now()}`,
        amount_money: {
          amount: refundAmountCents,
          currency: "USD",
        },
        payment_id: originalTransaction.squarePaymentId,
        reason,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      logger.error({ squareError: err, transactionId, amount }, "Square refund failed");
      throw new Error("Failed to process refund via Square");
    }

    const data = (await response.json()) as { refund: { id: string } };
    const squareRefundId = data.refund.id;

    // Create refund transaction record
    const [refundTransaction] = await db
      .insert(transactionsTable)
      .values({
        clientId: originalTransaction.clientId,
        amount: (-amount).toString(),
        tax: "0",
        total: (-amount).toString(),
        type: "refund",
        status: "completed",
        squarePaymentId: squareRefundId,
        description: `Refund: ${reason}`,
        sessionId: originalTransaction.sessionId,
        originalTransactionId: originalTransaction.id,
      })
      .returning();

    // Update original transaction status
    await db
      .update(transactionsTable)
      .set({ status: "refunded" })
      .where(eq(transactionsTable.id, transactionId));

    // Add audit log
    await writeAuditLog({
      userId: parseInt(userId, 10),
      action: "refund_processed",
      resourceType: "transaction",
      resourceId: transactionId,
      description: `Refund of $${amount}: ${reason}`,
    });

    logger.info(
      {
        transactionId,
        refundTransactionId: refundTransaction.id,
        squareRefundId,
        amount,
      },
      "Refund processed successfully"
    );

    return { refundTransactionId: refundTransaction.id, squareRefundId };
  }
}

export const reconciliationService = new ReconciliationService();
