// Global error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Prisma errors
  if (err.code?.startsWith('P')) {
    return handlePrismaError(err, res);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: err.message 
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expired',
      message: 'Please login again' 
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error',
      details: err.details 
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Handle Prisma-specific errors
function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002':
      return res.status(409).json({ 
        error: 'Duplicate entry',
        field: err.meta?.target 
      });
    case 'P2025':
      return res.status(404).json({ 
        error: 'Record not found' 
      });
    case 'P2003':
      return res.status(400).json({ 
        error: 'Foreign key constraint failed' 
      });
    default:
      return res.status(500).json({ 
        error: 'Database error',
        code: err.code 
      });
  }
}

// 404 handler
function notFoundHandler(req, res) {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
}

module.exports = { errorHandler, notFoundHandler };