const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const {
  generateToken,
  authenticateToken,
  requireAdmin,
  requireSupervisor,
  hashPassword,
  comparePassword
} = require('../middleware/auth');

// POST /api/auth/login - User login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { username: username }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Compare password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({ 
      success: true,
      message: 'Login successful',
      data: {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          pager_id: user.pager_id
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register - Create new user (Admin only)
router.post('/register', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { username, email, password, pager_id, role } = req.body;

    // Validate required fields
    if (!username || !email || !password || !pager_id) {
      return res.status(400).json({ 
        error: 'username, email, password, and pager_id are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.users.create({
      data: {
        username: username,
        email: email,
        password_hash: passwordHash,
        pager_id: pager_id,
        role: role || 'supervisor'
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        pager_id: user.pager_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json({ 
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password - Change password
router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: 'current_password and new_password are required' 
      });
    }

    // Get user with password hash
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isValid = await comparePassword(current_password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await prisma.users.update({
      where: { id: req.user.id },
      data: { password_hash: newPasswordHash }
    });

    res.json({ 
      success: true,
      message: 'Password updated successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/users - Get all users (Admin or Supervisor)
router.get('/users', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        pager_id: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ 
      success: true,
      count: users.length,
      data: users 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/users/:id - Delete user (Admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ 
        error: 'Cannot delete your own account' 
      });
    }

    await prisma.users.delete({
      where: { id: userId }
    });

    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
