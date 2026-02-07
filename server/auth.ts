// server/auth.ts
import { Router } from "express";
import type { IStorage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  generateVerificationToken,
  generateTokenExpiry,
  sendVerificationEmail
} from "./email";
import {
  generateVerificationCode,
  generateCodeExpiry,
  sendVerificationSMS,
  validatePhoneNumber,
  formatPhoneNumber,
  formatPhoneForDisplay
} from "./sms";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

console.log("[Auth] JWT_SECRET loaded:", process.env.JWT_SECRET ? "YES" : "NO");
console.log("[Auth] APP_URL for verification:", process.env.APP_URL || "NOT SET");
console.log("[Auth] NODE_ENV:", process.env.NODE_ENV || "development");

export interface AuthUser {
  _id: number;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  firstName: string;
  lastName: string;
  role: 'passenger' | 'driver';
  isLive?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function createAuthRouter(storage: IStorage) {
  const router = Router();

  function authenticateToken(req: any, res: any, next: any) {
    console.log(`[AUTH] Authenticating ${req.method} ${req.path}`);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  }

  // Register new user
  router.post('/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone, role, driverDetails } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (!['passenger', 'driver'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      if (role === 'driver') {
        if (!driverDetails ||
          !driverDetails.licenseNumber ||
          !driverDetails.vehicleParams ||
          !driverDetails.vehicleParams.make ||
          !driverDetails.vehicleParams.model ||
          !driverDetails.vehicleParams.plateNumber ||
          !driverDetails.vehicleParams.capacity) {
          return res.status(400).json({ message: 'Driver details and vehicle information are required for drivers' });
        }
      }

      const existingUser = await storage.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = generateTokenExpiry();

      const user = await storage.createUser({
        email,
        password,
        firstName,
        lastName,
        phone: phone || "",
        role,
        driverDetails: role === 'driver' ? driverDetails : undefined,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry
      });

      await sendVerificationEmail(email, firstName, verificationToken);

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        requiresVerification: true,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: false
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login user
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await storage.findUserByEmail(email);
      if (!user) {
        console.warn(`[Login] Failure: User not found (${email})`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.warn(`[Login] Failure: Invalid password for ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.emailVerified) {
        console.warn(`[Login] Failure: Email not verified for ${email}`);
        return res.status(403).json({
          message: 'Please verify your email before logging in',
          requiresVerification: true,
          email: user.email
        });
      }

      const token = jwt.sign(
        {
          _id: user._id,
          email: user.email,
          phone: user.phone || "",
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: {
          _id: user._id,
          email: user.email,
          phone: user.phone || "",
          phoneVerified: user.phoneVerified || false,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: true
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user
  router.get('/user', authenticateToken, async (req, res) => {
    try {
      const tokenUser = req.user;
      if (!tokenUser || !tokenUser._id) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const freshUser = await storage.findUserById(String(tokenUser._id));
      if (!freshUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        _id: freshUser._id,
        email: freshUser.email,
        phone: freshUser.phone || "",
        phoneVerified: freshUser.phoneVerified || false,
        firstName: freshUser.firstName,
        lastName: freshUser.lastName,
        role: freshUser.role,
        driverDetails: freshUser.driverDetails,
        isLive: freshUser.isLive || false
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });

  // Verify email
  router.get('/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      const user = await storage.findUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
        return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
      }

      if (user.emailVerified) {
        return res.json({ message: 'Email already verified', alreadyVerified: true });
      }

      await storage.updateUser(String(user._id), {
        emailVerified: true,
        verificationToken: undefined,
        verificationTokenExpiry: undefined
      });

      res.json({ message: 'Email verified successfully', verified: true });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Resend verification email
  router.post('/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.findUserByEmail(email);

      if (!user) {
        return res.json({ message: 'If your email is registered, you will receive a verification email.' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email is already verified' });
      }

      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = generateTokenExpiry();

      await storage.updateUser(String(user._id), {
        verificationToken,
        verificationTokenExpiry
      });

      await sendVerificationEmail(email, user.firstName, verificationToken);

      res.json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send phone verification code
  router.post('/send-phone-verification', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      const validation = validatePhoneNumber(phone);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error || 'Invalid phone number' });
      }

      const formattedPhone = validation.formatted || formatPhoneNumber(phone);
      console.log(`[Auth] Phone verification requested for: ${formattedPhone}`);
      console.log('[Auth] Using SMS provider for phone verification');

      const code = generateVerificationCode();
      const expiry = generateCodeExpiry();

      await storage.updateUser(String(userId), {
        phone: formattedPhone,
        phoneVerificationCode: code,
        phoneVerificationExpiry: expiry,
        phoneVerified: false,
      });

      const sent = await sendVerificationSMS(formattedPhone, code);
      if (!sent) {
        return res.status(500).json({ message: 'Failed to send verification SMS. Please try again.' });
      }

      res.json({
        message: `Verification code sent to ${formatPhoneForDisplay(formattedPhone)}`,
        phone: formattedPhone,
        provider: 'sms'
      });
    } catch (error) {
      console.error('Send phone verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify phone number with code
  router.post('/verify-phone', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Verification code is required' });
      }

      const user = await storage.findUserById(String(userId));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.phoneVerified) {
        return res.json({ message: 'Phone already verified', alreadyVerified: true });
      }

      if (!user.phone) {
        return res.status(400).json({ message: 'No phone number to verify. Please request a verification code first.' });
      }

      console.log('[Auth] Verifying code locally');

      if (user.phoneVerificationCode !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      if (user.phoneVerificationExpiry && new Date() > new Date(user.phoneVerificationExpiry)) {
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
      }

      await storage.updateUser(String(userId), {
        phoneVerified: true,
        phoneVerificationCode: undefined,
        phoneVerificationExpiry: undefined
      });

      res.json({ message: 'Phone number verified successfully', verified: true });
    } catch (error) {
      console.error('Verify phone error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update phone number
  router.put('/update-phone', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      const validation = validatePhoneNumber(phone);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error || 'Invalid phone number' });
      }

      const formattedPhone = validation.formatted || formatPhoneNumber(phone);
      console.log('[Auth] Using SMS provider for phone update verification');

      const code = generateVerificationCode();
      const expiry = generateCodeExpiry();

      await storage.updateUser(String(userId), {
        phone: formattedPhone,
        phoneVerificationCode: code,
        phoneVerificationExpiry: expiry,
        phoneVerified: false,
      });

      const sent = await sendVerificationSMS(formattedPhone, code);
      if (!sent) {
        return res.status(500).json({ message: 'Failed to send verification SMS. Please try again.' });
      }

      res.json({
        message: 'Phone number updated. Please verify with the code sent to your new number.',
        requiresVerification: true,
        provider: 'sms'
      });
    } catch (error) {
      console.error('Update phone error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return { router, authenticateToken };
}
