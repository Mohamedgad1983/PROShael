import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required but not configured');
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has admin role
    const { data: member, error } = await supabase
      .from('members')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (error || !member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['admin', 'super_admin', 'financial_manager'].includes(member.role)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

export const requireSuperAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has super admin role
    const { data: member, error } = await supabase
      .from('members')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (error || !member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (member.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin privileges required' });
    }

    next();
  } catch (error) {
    console.error('Super Admin check error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};