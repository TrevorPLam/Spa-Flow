/**
 * Email templates for SpaFlow
 * Provides plain text and HTML templates for transactional emails
 */

export interface PasswordResetTemplateData {
  resetLink: string;
  expiryMinutes: number;
}

export interface PasswordResetConfirmationTemplateData {
  appName: string;
}

/**
 * Generate password reset email content
 */
export function getPasswordResetTemplate(data: PasswordResetTemplateData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Reset Your SpaFlow Password';
  
  const text = `You requested a password reset for your SpaFlow account.

Click the link below to reset your password:
${data.resetLink}

This link will expire in ${data.expiryMinutes} minutes.

If you did not request a password reset, please ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your SpaFlow Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
    }
    .content {
      background-color: white;
      padding: 25px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background-color: #3498db;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SpaFlow</h1>
    </div>
    <div class="content">
      <p>You requested a password reset for your SpaFlow account.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${data.resetLink}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #3498db;">${data.resetLink}</p>
      <p><strong>This link will expire in ${data.expiryMinutes} minutes.</strong></p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} SpaFlow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Generate password reset confirmation email content
 */
export function getPasswordResetConfirmationTemplate(
  data: PasswordResetConfirmationTemplateData
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Your SpaFlow Password Has Been Reset';
  
  const text = `Your ${data.appName} password has been successfully reset.

If you did not make this change, please contact support immediately.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
    }
    .content {
      background-color: white;
      padding: 25px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .success {
      color: #27ae60;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SpaFlow</h1>
    </div>
    <div class="content">
      <p class="success">✓ Your password has been successfully reset</p>
      <p>Your ${data.appName} password has been changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} SpaFlow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
