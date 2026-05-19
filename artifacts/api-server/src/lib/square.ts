import { logger } from "./logger";

export interface PaymentResult {
  paymentId: string;
  status: string;
}

export async function processSquarePayment(
  paymentToken: string,
  amountCents: number,
  idempotencyKey: string,
  note?: string
): Promise<PaymentResult> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT ?? "sandbox";

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
      "Square-Version": "2024-01-18",
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
    const err = await response.json();
    throw new Error(`Square payment failed: ${JSON.stringify(err)}`);
  }

  const data = (await response.json()) as { payment: { id: string; status: string } };
  return { paymentId: data.payment.id, status: data.payment.status };
}
