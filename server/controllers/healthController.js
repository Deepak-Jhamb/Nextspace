const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'NexusHub API Server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
};

module.exports = { getHealthStatus };
