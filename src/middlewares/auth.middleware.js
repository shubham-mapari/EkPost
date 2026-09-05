import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserService } from '../services/user.service.js';

export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please login first.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = UserService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User account not found.' });
    }
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token. Please log in again.' });
  }
}
