/**
 * Email Service using Resend
 * Handles transactional email sending with proper error handling and logging
 */

import { logger } from "../lib/logger";
import { getEnv } from "../lib/env";
import {
  getPasswordResetTemplate,
  getPasswordResetConfirmationTemplate,
} from "./email-templates";

/**
 * EmailService handles sending transactional emails using Resend
 */
export class EmailService {
  /**
   * Send a password reset email
   * @param to - Recipient email address
   * @param resetLink - Password reset link
   * @param expiryMinutes - Token expiry time in minutes
   */
  async sendPasswordReset(
    to: string,
    resetLink: string,
    expiryMinutes: number = 30
  ): Promise<void> {
    const env = getEnv();
    const apiKey = env.RESEND_API_KEY;
    const fromAddress = env.EMAIL_FROM_ADDRESS;
    const fromName = env.EMAIL_FROM_NAME;

    if (!apiKey || !fromAddress) {
      logger.info(
        { to },
        "Password reset email not sent - Resend not configured"
      );
      return;
    }

    try {
      const template = getPasswordResetTemplate({ resetLink, expiryMinutes });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          to: [to],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ error, to }, "Resend password reset email failed");
        throw new Error(`Failed to send password reset email: ${error}`);
      }

      logger.info({ to }, "Password reset email sent successfully");
    } catch (error) {
      logger.error({ error, to }, "Error sending password reset email");
      throw error;
    }
  }

  /**
   * Send a password reset confirmation email
   * @param to - Recipient email address
   */
  async sendPasswordResetConfirmation(to: string): Promise<void> {
    const env = getEnv();
    const apiKey = env.RESEND_API_KEY;
    const fromAddress = env.EMAIL_FROM_ADDRESS;
    const fromName = env.EMAIL_FROM_NAME;

    if (!apiKey || !fromAddress) {
      logger.info(
        { to },
        "Password reset confirmation email not sent - Resend not configured"
      );
      return;
    }

    try {
      const template = getPasswordResetConfirmationTemplate({
        appName: fromName,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          to: [to],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error(
          { error, to },
          "Resend password reset confirmation email failed"
        );
        throw new Error(
          `Failed to send password reset confirmation email: ${error}`
        );
      }

      logger.info({ to }, "Password reset confirmation email sent successfully");
    } catch (error) {
      logger.error(
        { error, to },
        "Error sending password reset confirmation email"
      );
      throw error;
    }
  }
}

export const emailService = new EmailService();
