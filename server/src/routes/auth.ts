import { Hono } from 'hono';
import jwt from 'jsonwebtoken';

const auth = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_USERNAME = 'mindmaster2027';

export function verifyAdmin(authHeader?: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ username: string }>();

  if (!body.username) {
    return c.json({ error: 'Username required' }, 400);
  }

  if (body.username !== ADMIN_USERNAME) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' });

  return c.json({ token });
});

export default auth;
