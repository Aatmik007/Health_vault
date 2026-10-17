/**
 * Health check controller
 * @route GET /api/health
 * @desc  Returns status of the HealthVault API
 * @access Public
 */
export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "HealthVault API is running"
  });
};
