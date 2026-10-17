import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication routes (login / register)
 * Max 15 requests per 15-minute window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for general API routes (documents, RAG, retrieval)
 * Max 100 requests per 15-minute window
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'API rate limit exceeded. Please try again after a few minutes.',
  },
});
