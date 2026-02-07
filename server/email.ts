// server/email.ts
import nodemailer from "nodemailer";
import crypto from "crypto";

// Email configuration - read fresh each time to support .env changes after restart
function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    appUrl: process.env.APP_URL || "https://makewego.unusualbeautymodel.com",

    appName: process.env.APP_NAME || "BusConnect",
  };
}

// Create transporter dynamically (reads fresh config each time)
function createTransporter() {
  const config = getEmailConfig();

  console.log(`[Email] Creating transporter - host: ${config.host}, port: ${config.port}, user: ${config.user ? config.user.substring(0, 5) + '***' : 'NOT SET'}`);

  // Use Gmail service for better compatibility
  if (config.host === "smtp.gmail.com") {
    console.log("[Email] Using Gmail service configuration");
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  // Generic SMTP for other providers
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

// Generate verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generate token expiry (24 hours from now)
export function generateTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const config = getEmailConfig();
  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

  console.log(`[Email] Attempting to send verification email to: ${email}`);
  console.log(`[Email] SMTP User configured: ${config.user ? 'YES (' + config.user + ')' : 'NO'}`);
  console.log(`[Email] SMTP Pass configured: ${config.pass ? 'YES' : 'NO'}`);

  const mailOptions = {
    from: `"${config.appName}" <${config.user}>`,
    to: email,
    subject: `Verify your ${config.appName} account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${config.appName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
          </div>

          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Hello ${firstName}!</h2>

            <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px;">
              Thank you for signing up for ${config.appName}. To complete your registration and start using your account, please verify your email address by clicking the button below.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #64748b; margin: 20px 0 0 0; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account with ${config.appName}, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

            <p style="color: #94a3b8; margin: 0; font-size: 12px; text-align: center;">
              If the button above doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            &copy; ${new Date().getFullYear()} ${config.appName}. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${firstName}!

Thank you for signing up for ${config.appName}. To complete your registration, please verify your email address by visiting the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with ${config.appName}, you can safely ignore this email.

- The ${config.appName} Team
    `,
  };

  try {
    if (!config.user || !config.pass) {
      console.warn("[Email] SMTP credentials not configured. Skipping email send.");
      console.log("[Email] Verification URL (for testing):", verificationUrl);
      return true; // Return true in dev mode so registration continues
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] SUCCESS: Verification email sent to ${email}`);
    console.log(`[Email] Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] FAILED to send verification email to ${email}:`, error.message);
    console.error("[Email] Full error details:", error);
    return false;
  }
}

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<boolean> {
  const config = getEmailConfig();

  console.log(`[Email] Testing connection - host: ${config.host}, user: ${config.user || 'NOT SET'}`);

  try {
    if (!config.user || !config.pass) {
      console.warn("[Email] SMTP credentials not configured");
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log("[Email] SMTP connection verified successfully!");
    return true;
  } catch (error: any) {
    console.error("[Email] SMTP connection failed:", error.message);
    return false;
  }
}
