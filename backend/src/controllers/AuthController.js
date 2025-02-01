const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production
const SALT_ROUNDS = 10;

class AuthController {
  async register(req, res) {
    const { username, password, role } = req.body;

    try {
      // Check if user already exists
      const userExists = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (userExists.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert new user
      const result = await db.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING user_id, username, role`,
        [username, passwordHash, role]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Error registering user' });
    }
  }

  async login(req, res) {
    const { username, password } = req.body;

    try {
      // Find user
      const result = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
        [user.user_id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.user_id, 
          username: user.username,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Error logging in' });
    }
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    try {
      // Get user from database
      const result = await db.query(
        'SELECT * FROM users WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password in database
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE user_id = $2',
        [newPasswordHash, userId]
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Error changing password' });
    }
  }

  async guestLogin(req, res) {
    try {
      // Create a guest user object (no database entry needed)
      const timestamp = Date.now();
      const guestUser = {
        userId: `guest_${timestamp}`,
        username: 'Guest User',
        role: 'guest',
        iat: Math.floor(timestamp / 1000),
        exp: Math.floor(timestamp / 1000) + (24 * 60 * 60) // 24 hours
      };

      // Generate JWT token
      const token = jwt.sign(guestUser, JWT_SECRET);

      // Log successful guest login
      console.log('Guest login successful:', {
        userId: guestUser.userId,
        role: guestUser.role,
        tokenStart: token.substring(0, 20) + '...'
      });

      res.json({
        token,
        user: {
          userId: guestUser.userId,
          username: guestUser.username,
          role: guestUser.role
        }
      });
    } catch (error) {
      console.error('Error creating guest session:', error);
      res.status(500).json({ error: 'Error creating guest session' });
    }
  }

  async createInitialAdmin() {
    try {
      // Check if admin already exists
      const adminExists = await db.query(
        "SELECT * FROM users WHERE role = 'admin'"
      );

      if (adminExists.rows.length === 0) {
        const defaultPassword = 'admin123'; // Change this in production
        const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

        await db.query(
          `INSERT INTO users (username, password_hash, role)
           VALUES ($1, $2, $3)`,
          ['admin', passwordHash, 'admin']
        );

        console.log('Initial admin user created');
      }
    } catch (error) {
      console.error('Error creating initial admin:', error);
    }
  }
}

module.exports = AuthController;
