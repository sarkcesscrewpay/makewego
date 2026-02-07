// server/sms.ts
// SMS Verification Service for phone number verification
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
  PhoneNumber
} from 'libphonenumber-js';

// Generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate code expiry (15 minutes from now)
export function generateCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return expiry;
}

// Validate phone number using libphonenumber-js
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string; formatted?: string } {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  try {
    // Check if it's a valid phone number
    if (!isValidPhoneNumber(phone)) {
      return { valid: false, error: 'Please enter a valid phone number with country code' };
    }

    const parsed = parsePhoneNumber(phone);
    if (!parsed) {
      return { valid: false, error: 'Could not parse phone number' };
    }

    return {
      valid: true,
      formatted: parsed.format('E.164') // Returns format like +233241234567
    };
  } catch (error) {
    return { valid: false, error: 'Invalid phone number format' };
  }
}

// Format phone number to E.164 international format
export function formatPhoneNumber(phone: string): string {
  try {
    // If already in E.164 format (starts with +), validate and return
    if (phone.startsWith('+')) {
      const parsed = parsePhoneNumber(phone);
      if (parsed) {
        return parsed.format('E.164');
      }
    }

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Try to parse as Ghana number if no country code
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.slice(1);
    } else if (!cleaned.startsWith('233') && cleaned.length <= 10) {
      // Assume Ghana if short local number
      cleaned = '233' + cleaned;
    }

    return '+' + cleaned;
  } catch (error) {
    // Fallback: return with + prefix
    return phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
  }
}

// Get country code from phone number
export function getCountryFromPhone(phone: string): CountryCode | undefined {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed?.country;
  } catch {
    return undefined;
  }
}

// Format phone number for display
export function formatPhoneForDisplay(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed ? parsed.formatInternational() : phone;
  } catch {
    return phone;
  }
}

// Send SMS verification code
// This uses a configurable SMS provider via environment variables
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(phone);
  const message = `MoGo verification code: ${code}. Valid for 15 minutes. Do not share this code with anyone.`;

  const smsProvider = process.env.SMS_PROVIDER || 'log';

  console.log(`[SMS] Sending verification to ${formattedPhone} via ${smsProvider}`);

  try {
    switch (smsProvider) {
      case 'twilio':
        return await sendViaTwilio(formattedPhone, message);

      case 'arkesel':
        return await sendViaArkesel(formattedPhone, message);

      case 'hubtel':
        return await sendViaHubtel(formattedPhone, message);

      case 'log':
      default:
        // Development mode - just log the code
        console.log(`[SMS DEV] Verification code for ${formattedPhone}: ${code}`);
        return true;
    }
  } catch (error) {
    console.error('[SMS] Failed to send verification:', error);
    return false;
  }
}

// Twilio SMS Provider
async function sendViaTwilio(phone: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[SMS] Twilio credentials not configured');
    return false;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[SMS Twilio] Error:', error);
    return false;
  }

  return true;
}

// Arkesel SMS Provider (Popular in Ghana)
async function sendViaArkesel(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || 'MoGo';

  if (!apiKey) {
    console.error('[SMS] Arkesel API key not configured');
    return false;
  }

  const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: senderId,
      message: message,
      recipients: [phone.replace('+', '')],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[SMS Arkesel] Error:', error);
    return false;
  }

  return true;
}

// Hubtel SMS Provider (Popular in Ghana)
async function sendViaHubtel(phone: string, message: string): Promise<boolean> {
  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const senderId = process.env.HUBTEL_SENDER_ID || 'MoGo';

  if (!clientId || !clientSecret) {
    console.error('[SMS] Hubtel credentials not configured');
    return false;
  }

  // Format phone number - remove + prefix for Hubtel
  const formattedTo = phone.replace('+', '');

  // Build URL with query parameters (Hubtel's simple API format)
  const url = new URL('https://smsc.hubtel.com/v1/messages/send');
  url.searchParams.append('clientid', clientId);
  url.searchParams.append('clientsecret', clientSecret);
  url.searchParams.append('from', senderId);
  url.searchParams.append('to', formattedTo);
  url.searchParams.append('content', message);

  console.log(`[SMS Hubtel] Sending to ${formattedTo} from ${senderId}`);
  console.log(`[SMS Hubtel] Message content: ${message}`);
  console.log(`[SMS Hubtel] Full URL: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const data = await response.json();
    console.log('[SMS Hubtel] Response:', JSON.stringify(data));

    if (!response.ok || data.status !== 0) {
      console.error('[SMS Hubtel] Error:', data);
      return false;
    }

    console.log(`[SMS Hubtel] Message sent successfully, ID: ${data.messageId}`);
    return true;
  } catch (error) {
    console.error('[SMS Hubtel] Exception:', error);
    return false;
  }
}

// ============================================
// TWILIO VERIFY API - Phone Verification
// ============================================

export interface TwilioVerifyResult {
  success: boolean;
  status?: string;
  error?: string;
}

// Send verification code via Twilio Verify API
export async function sendTwilioVerification(phone: string): Promise<TwilioVerifyResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    console.error('[Twilio Verify] Credentials not configured');
    return { success: false, error: 'Twilio Verify not configured' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[Twilio Verify] Sending verification to ${formattedPhone}`);

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Channel: 'sms',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio Verify] Error:', data);
      return {
        success: false,
        error: data.message || 'Failed to send verification code'
      };
    }

    console.log(`[Twilio Verify] Verification sent, status: ${data.status}`);
    return {
      success: true,
      status: data.status
    };
  } catch (error) {
    console.error('[Twilio Verify] Exception:', error);
    return {
      success: false,
      error: 'Failed to send verification code'
    };
  }
}

// Check verification code via Twilio Verify API
export async function checkTwilioVerification(phone: string, code: string): Promise<TwilioVerifyResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    console.error('[Twilio Verify] Credentials not configured');
    return { success: false, error: 'Twilio Verify not configured' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[Twilio Verify] Checking verification for ${formattedPhone}`);

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Code: code,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio Verify] Check error:', data);
      return {
        success: false,
        error: data.message || 'Verification failed'
      };
    }

    // Twilio returns status: 'approved' when code is correct
    const isApproved = data.status === 'approved';
    console.log(`[Twilio Verify] Verification check status: ${data.status}`);

    return {
      success: isApproved,
      status: data.status,
      error: isApproved ? undefined : 'Invalid verification code'
    };
  } catch (error) {
    console.error('[Twilio Verify] Check exception:', error);
    return {
      success: false,
      error: 'Failed to verify code'
    };
  }
}

// Check if Twilio Verify is configured with real credentials (not placeholders)
export function isTwilioVerifyConfigured(): boolean {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  // Check all required vars exist
  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  // Check auth token is not a placeholder value
  if (authToken.includes('your-') || authToken.includes('-here') || authToken.length < 20) {
    console.log('[Twilio Verify] Auth token appears to be a placeholder - falling back to SMS provider');
    return false;
  }

  return true;
}
