import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { dbConfig, healthcheckDb, initDatabase, pool } from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.SERVER_PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.AUTH_COOKIE_SECRET || 'change-me-in-env';
const COOKIE_NAME = 'studykit_auth';

const mapDbError = (error) => {
  if (!error || typeof error !== 'object') {
    return { status: 500, message: 'Unexpected server error.' };
  }

  const code = error.code;

  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return { status: 500, message: 'MySQL access denied. Check MYSQL_USER and MYSQL_PASSWORD in .env.' };
  }

  if (code === 'ECONNREFUSED') {
    return { status: 500, message: 'Cannot connect to MySQL. Ensure MySQL is running on configured host/port.' };
  }

  if (code === 'ER_NO_SUCH_TABLE') {
    return { status: 500, message: 'Users table is missing. Restart server to auto-create database schema.' };
  }

  if (code === 'ER_BAD_DB_ERROR') {
    return { status: 500, message: 'MySQL database does not exist. Restart server after updating MYSQL_DATABASE.' };
  }

  return { status: 500, message: 'Database operation failed.' };
};

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const createAuthToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });
};

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

app.get('/api/health', async (_req, res) => {
  try {
    await healthcheckDb();
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, message: 'Database connection failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ message: 'Account already exists. Please login.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);

    const userId = Number(result.insertId);
    const token = createAuthToken({ userId, email });
    setAuthCookie(res, token);

    return res.status(201).json({ message: 'Registration successful.', user: { id: userId, email } });
  } catch (error) {
    const mapped = mapDbError(error);
    console.error('Register error:', error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    return res.json({ message: 'Login successful.', user: { id: user.id, email: user.email } });
  } catch (error) {
    const mapped = mapDbError(error);
    console.error('Login error:', error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  return res.json({ message: 'Logged out.' });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.userId);
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    const [rows] = await pool.query('SELECT id, email, created_at FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      clearAuthCookie(res);
      return res.status(401).json({ message: 'User not found.' });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    const mapped = mapDbError(error);
    console.error('Profile error:', error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

app.post('/api/auth/resend-verification', (_req, res) => {
  return res.status(400).json({ message: 'Email verification is not used with local MySQL auth. Please login directly.' });
});

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Auth server running on http://localhost:${PORT}`);
      console.log(`MySQL connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    });
  } catch (error) {
    console.error('Failed to start auth server:', error);
    process.exit(1);
  }
};

startServer();
