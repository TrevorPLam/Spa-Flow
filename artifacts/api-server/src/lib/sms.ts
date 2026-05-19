import { logger } from "./logger";
import { getEnv } from "./env";

export async function sendSms(to: string, message: string): Promise<void> {
  const env = getEnv();
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    logger.info({ to, message }, "SMS not sent - Twilio not configured");
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!resp.ok) {
      const err = await resp.text();
      logger.error({ err, to }, "Twilio SMS failed");
    } else {
      logger.info({ to }, "SMS sent successfully");
    }
  } catch (err) {
    logger.error({ err, to }, "Error sending SMS");
  }
}

export const WAITLIST_ROOM_MSG =
  "SpaFlow: A private dressing room is now available for you. Please proceed to the front desk within 15 minutes.";
