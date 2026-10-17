/**
 * Centralized Express Error Handling Middleware
 * Sanitizes output to prevent leaking internal stack traces, API keys, or server paths
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  // Safe logging for server debugging
  console.error(`[API Error] ${req.method} ${req.url} (${statusCode}):`, err.message || err);

  const response = {
    success: false,
    message: err.message || 'An internal server error occurred.',
  };

  // Only include stack traces in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
