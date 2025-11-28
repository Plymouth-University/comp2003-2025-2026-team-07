const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { prisma } = require('../config/database');

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// Verify JWT token middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const user = await prisma.users.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Check if user is admin or supervisor
function requireSupervisor(req, res, next) {
  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Supervisor access required' });
  }
  next();
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
  requireSupervisor,
  hashPassword,
  comparePassword
};