// @ts-nocheck
import { logger } from "./logger";
import { getEnv } from "./env";

export interface PaymentResult {
  paymentId: string;
  status: string;
}

interface SquareError {
  errors?: Array<{
    category?: string;
    code?: string;
    detail?: string;
    field?: string;
  }>;
}

export async function processSquarePayment(
  paymentToken: string,
  amountCents: number,
  idempotencyKey: string,
  note?: string
): Promise<PaymentResult> {
  const env = getEnv();
  const accessToken = env.SQUARE_ACCESS_TOKEN;
  const environment = env.SQUARE_ENVIRONMENT;
  const apiVersion = env.SQUARE_API_VERSION;

  // If no Square token configured, return mock result for dev
  if (!accessToken || paymentToken.startsWith("SQUARE_MOCK_TOKEN_")) {
    logger.info({ amountCents, idempotencyKey }, "Square payment mock (no credentials configured)");
    return { paymentId: `mock_${idempotencyKey}`, status: "COMPLETED" };
  }

  const baseUrl =
    environment === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  const response = await fetch(`${baseUrl}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": apiVersion,
    },
    body: JSON.stringify({
      source_id: paymentToken,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: amountCents,
        currency: "USD",
      },
      note: note ?? "SpaFlow payment",
    }),
  });

  if (!response.ok) {
    const err = (await response.json()) as SquareError;
    
    // Log full error details server-side for debugging
    logger.error({ 
      squareError: err,
      amountCents,
      idempotencyKey 
    }, "Square payment failed");
    
    // Provide sanitized, user-friendly error message
    throw new Error(`Payment processing failed. Please try again or contact support.`);
  }

  const data = (await response.json()) as { payment: { id: string; status: string } };
  return { paymentId: data.payment.id, status: data.payment.status };
}
