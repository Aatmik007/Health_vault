import express from 'express';
import {
  registerUser,
  verifyEmail,
  resendVerificationOtp,
  loginUser,
  getCurrentUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRegisterInput, validateLoginInput } from '../middleware/validationMiddleware.js';
import { authLimiter } from '../middleware/rateLimiterMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegisterInput, registerUser);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationOtp);
router.post('/login', authLimiter, validateLoginInput, loginUser);
router.get('/me', protect, getCurrentUser);

export default router;
