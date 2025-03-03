import pool from '../lib/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const { rows } = await pool.query(query, [email]);
      
      if (rows.length === 0) {
        return null;
      }

      const user = rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        return null;
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          tenant_id: user.tenant_id 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id,
          mfaEnabled: user.mfa_enabled
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    tenant_id: string;
  }): Promise<User> {
    try {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      const query = `
        INSERT INTO users (email, password_hash, name, role, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role, tenant_id
      `;
      
      const values = [
        userData.email,
        passwordHash,
        userData.name,
        userData.role,
        userData.tenant_id
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const query = 'SELECT * FROM users WHERE id = $1';
      const { rows } = await pool.query(query, [decoded.id]);
      
      if (rows.length === 0) {
        return null;
      }

      const user = rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
        mfaEnabled: user.mfa_enabled
      };
    } catch (error) {
      return null;
    }
  }
}; 