import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendVerificationOtpEmail } from '../services/email.service.js';

/**
 * Generate 6-digit cryptographically secure random OTP
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP using SHA-256 for secure non-plaintext storage
 */
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'healthvault_default_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, secret, {
    expiresIn,
  });
};

/**
 * @desc    Register new user & send email OTP verification
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address format' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    if (existingUser && !existingUser.emailVerified) {
      // Safe retry for unverified pending account
      // Enforce 60-second cooldown
      if (existingUser.emailVerificationLastSentAt) {
        const elapsedMs = Date.now() - existingUser.emailVerificationLastSentAt.getTime();
        if (elapsedMs < 60000) {
          const secondsRemaining = Math.ceil((60000 - elapsedMs) / 1000);
          return res.status(429).json({
            success: false,
            message: `Please wait ${secondsRemaining} seconds before requesting another verification code.`,
            email: normalizedEmail,
            requiresVerification: true,
          });
        }
      }

      existingUser.name = name.trim();
      existingUser.password = password; // Triggers pre-save bcrypt hash
      existingUser.emailVerificationOtpHash = otpHash;
      existingUser.emailVerificationOtpExpiresAt = otpExpiresAt;
      existingUser.emailVerificationAttempts = 0;
      existingUser.emailVerificationLastSentAt = new Date();
      await existingUser.save();

      await sendVerificationOtpEmail(normalizedEmail, otp);

      return res.status(200).json({
        success: true,
        message: 'Registration updated. A verification code has been sent to your email.',
        email: normalizedEmail,
        requiresVerification: true,
      });
    }

    // Create new unverified user
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      emailVerified: false,
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpiresAt: otpExpiresAt,
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: new Date(),
    });

    await sendVerificationOtpEmail(normalizedEmail, otp);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! A 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
    });
  }
};

/**
 * @desc    Verify email address using 6-digit OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit verification code' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Your email address is already verified. Please sign in.',
        alreadyVerified: true,
      });
    }

    // Check maximum attempts limit
    if (user.emailVerificationAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new verification code.',
      });
    }

    // Check expiration
    if (!user.emailVerificationOtpExpiresAt || new Date() > user.emailVerificationOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Verify OTP hash
    const enteredHash = hashOtp(otp.trim());
    if (enteredHash !== user.emailVerificationOtpHash) {
      user.emailVerificationAttempts += 1;
      await user.save();
      const remaining = 5 - user.emailVerificationAttempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts exceeded. Please request a new code.',
      });
    }

    // Code is valid! Activate account
    user.emailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationAttempts = 0;
    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to HealthVault.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Email Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during email verification.',
    });
  }
};

/**
 * @desc    Resend OTP verification code with rate-limit cooldown
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your email address is already verified. Please sign in.',
      });
    }

    // Enforce 60-second cooldown
    if (user.emailVerificationLastSentAt) {
      const elapsedMs = Date.now() - user.emailVerificationLastSentAt.getTime();
      if (elapsedMs < 60000) {
        const secondsRemaining = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsRemaining} seconds before requesting a new verification code.`,
        });
      }
    }

    const otp = generateOtp();
    user.emailVerificationOtpHash = hashOtp(otp);
    user.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    await user.save();

    await sendVerificationOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    });
  } catch (error) {
    console.error('Resend Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resending verification code.',
    });
  }
};

/**
 * @desc    Authenticate user & get token (Requires verified email)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify email activation
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your email address is not verified. Please verify your email before logging in.',
        isUnverified: true,
        email: user.email,
      });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};
