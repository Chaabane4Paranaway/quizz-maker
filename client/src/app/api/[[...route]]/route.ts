import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const app = new Hono().basePath('/api');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_USERNAME = 'mindmaster2027';

function verifyAdmin(authHeader?: string): boolean {
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

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Auth Login
app.post('/auth/login', async (c) => {
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

// Create survey (admin only)
app.post('/surveys', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ title: string; choices: string }>();

  if (!body.title || !body.choices) {
    return c.json({ error: 'Title and choices required' }, 400);
  }

  const choicesArray = Array.isArray(body.choices) 
    ? body.choices 
    : body.choices.split(',').map((c: string) => c.trim()).filter(Boolean);

  if (choicesArray.length < 2) {
    return c.json({ error: 'At least 2 choices required' }, 400);
  }

  let token = generateToken();
  // Ensure uniqueness
  while (await db.prepare('SELECT id FROM surveys WHERE token = ?').get(token)) {
    token = generateToken();
  }

  await db.prepare('INSERT INTO surveys (token, title, choices) VALUES (?, ?, ?)').run(
    token,
    body.title,
    JSON.stringify(choicesArray)
  );

  return c.json({ token, title: body.title, choices: choicesArray });
});

// List all surveys (admin only)
app.get('/surveys', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rows = await db.prepare('SELECT token, title, choices, created_at FROM surveys ORDER BY created_at DESC').all() as any[];

  return c.json(
    rows.map((r) => ({
      ...r,
      choices: JSON.parse(r.choices),
    }))
  );
});

// Get survey by token (public)
app.get('/surveys/:token', async (c) => {
  const token = c.req.param('token').toUpperCase();
  const survey = await db.prepare('SELECT token, title, choices FROM surveys WHERE token = ?').get(token) as any;

  if (!survey) {
    return c.json({ error: 'Survey not found' }, 404);
  }

  return c.json({ ...survey, choices: JSON.parse(survey.choices) });
});

// Submit response (public)
app.post('/surveys/:token/respond', async (c) => {
  const token = c.req.param('token').toUpperCase();
  const survey = await db.prepare('SELECT token, choices FROM surveys WHERE token = ?').get(token) as any;

  if (!survey) {
    return c.json({ error: 'Survey not found' }, 404);
  }

  const body = await c.req.json<{ pseudo: string; votes: { choice: string; rank: number }[] }>();

  if (!body.pseudo || !body.votes || !Array.isArray(body.votes)) {
    return c.json({ error: 'Pseudo and votes required' }, 400);
  }

  const pseudo = body.pseudo.trim();
  if (!pseudo) return c.json({ error: 'Pseudo cannot be empty' }, 400);

  // Check if already responded
  const existing = await db
    .prepare('SELECT id FROM responses WHERE survey_token = ? AND pseudo = ?')
    .get(token, pseudo);
  if (existing) {
    return c.json({ error: 'You have already responded to this survey' }, 409);
  }

  await db.prepare('INSERT INTO responses (survey_token, pseudo, votes) VALUES (?, ?, ?)').run(
    token,
    pseudo,
    JSON.stringify(body.votes)
  );

  return c.json({ success: true });
});

// Get stats (admin only)
app.get('/surveys/:token/stats', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = c.req.param('token').toUpperCase();
  const survey = await db.prepare('SELECT token, title, choices FROM surveys WHERE token = ?').get(token) as any;

  if (!survey) {
    return c.json({ error: 'Survey not found' }, 404);
  }

  const choices: string[] = JSON.parse(survey.choices);

  const responses = await db
    .prepare('SELECT pseudo, votes FROM responses WHERE survey_token = ?')
    .all(token) as any[];

  // Aggregate weighted scores
  const scores: Record<string, number> = {};
  const voteCounts: Record<string, number> = {};

  choices.forEach((c) => {
    scores[c] = 0;
    voteCounts[c] = 0;
  });

  responses.forEach((r) => {
    const votes: { choice: string; rank: number }[] = JSON.parse(r.votes);
    const maxRank = votes.length;
    votes.forEach((v) => {
      if (scores[v.choice] !== undefined) {
        scores[v.choice] += maxRank - v.rank + 1;
        voteCounts[v.choice] += 1;
      }
    });
  });

  const stats = choices.map((choice) => ({
    choice,
    score: scores[choice],
    voteCount: voteCounts[choice],
  }));

  return c.json({
    survey: { ...survey, choices },
    stats,
    totalRespondents: responses.length,
    respondents: responses.map((r) => r.pseudo),
  });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
