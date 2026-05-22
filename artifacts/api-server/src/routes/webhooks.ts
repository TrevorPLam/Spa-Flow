import { Router, type Request, type Response, type NextFunction } from "express";
import { createHmac } from "crypto";
import { logger } from "../lib/logger";
import { getEnv } from "../lib/env";
import { db, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Square webhook event types
 */
interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    object: {
      payment: {
        id: string;
        amount_money: {
          amount: number;
        };
        status: string;
        created_at: string;
        updated_at: string;
      };
    };
  };
}

/**
 * Verify Square webhook signature using HMAC-SHA256
 * Square sends a signature in the X-Square-Hmacsha256-Signature header
 * that should be verified against the webhook notification key
 *
 * @param signature - Signature from X-Square-Hmacsha256-Signature header
 * @param body - Raw request body (as string)
 * @param webhookKey - Square webhook notification key from environment
 * @returns True if signature is valid, false otherwise
 */
function verifySquareSignature(signature: string, body: string, webhookKey: string): boolean {
  if (!webhookKey) {
    logger.warn("Square webhook key not configured, skipping signature verification");
    return false;
  }

  const expectedSignature = createHmac("sha256", webhookKey)
    .update(body, "utf8")
    .digest("base64");

  // Use timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signatureBuffer.length; i++) {
    result |= signatureBuffer[i] ^ expectedBuffer[i];
  }

  return result === 0;
}

/**
 * Middleware to capture raw body for signature verification
 * Must be used before express.json() middleware
 */
const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.setEncoding("utf8");
  let data = "";

  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    (req as any).rawBody = data;
    next();
  });
};

/**
 * Process payment.updated webhook event from Square
 * Updates transaction status when payment status changes
 */
async function handlePaymentUpdated(event: SquareWebhookEvent): Promise<void> {
  const payment = event.data.object.payment;
  const squarePaymentId = payment.id;
  const status = payment.status;

  logger.info(
    {
      squarePaymentId,
      status,
      eventId: event.event_id,
    },
    "Processing payment.updated webhook"
  );

  // Map Square payment status to internal transaction status
  const statusMap: Record<string, "completed" | "cancelled" | "failed"> = {
    COMPLETED: "completed",
    APPROVED: "completed",
    CANCELED: "cancelled",
    FAILED: "failed",
  };

  const transactionStatus = statusMap[status];
  if (!transactionStatus) {
    logger.warn({ status, squarePaymentId }, "Unknown Square payment status");
    return;
  }

  // Update transaction status in database
  try {
    const result = await db
      .update(transactionsTable)
      .set({ status: transactionStatus })
      .where(eq(transactionsTable.squarePaymentId, squarePaymentId))
      .returning();

    if (result.length === 0) {
      logger.warn(
        { squarePaymentId, status },
        "No transaction found for Square payment ID"
      );
    } else {
      logger.info(
        {
          squarePaymentId,
          transactionId: result[0].id,
          newStatus: transactionStatus,
        },
        "Transaction status updated from webhook"
      );
    }
  } catch (error) {
    logger.error(
      { error, squarePaymentId, status },
      "Failed to update transaction status from webhook"
    );
    throw error;
  }
}

/**
 * Square webhook endpoint
 * Receives webhook notifications from Square and processes payment updates
 * Signature verification is performed to ensure webhook authenticity
 */
router.post(
  "/webhooks/square",
  rawBodyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-square-hmacsha256-signature"] as string;
    const rawBody = (req as any).rawBody;
    const webhookKey = getEnv().SQUARE_WEBHOOK_SIGNATURE_KEY;

    // Verify webhook signature
    if (!webhookKey || !verifySquareSignature(signature, rawBody, webhookKey)) {
      logger.warn(
        { signature: signature?.substring(0, 16), hasWebhookKey: !!webhookKey },
        "Invalid Square webhook signature"
      );
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    let event: SquareWebhookEvent;
    try {
      event = req.body as SquareWebhookEvent;
    } catch (error) {
      logger.error({ error }, "Failed to parse Square webhook event");
      res.status(400).json({ error: "Invalid event format" });
      return;
    }

    logger.info(
      {
        eventType: event.type,
        eventId: event.event_id,
        merchantId: event.merchant_id,
      },
      "Received Square webhook"
    );

    // Process payment.updated events
    if (event.type === "payment.updated") {
      try {
        await handlePaymentUpdated(event);
        res.status(200).json({ received: true });
      } catch (error) {
        logger.error(
          { error, eventId: event.event_id },
          "Failed to process payment.updated webhook"
        );
        res.status(500).json({ error: "Failed to process webhook" });
      }
    } else {
      // Acknowledge other event types without processing
      logger.info({ eventType: event.type }, "Webhook event type not processed");
      res.status(200).json({ received: true, processed: false });
    }
  }
);

export default router;
