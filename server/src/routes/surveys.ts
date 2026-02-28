import { Hono } from 'hono';
import db from '../db';
import { verifyAdmin } from './auth';

const surveys = new Hono();

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create survey (admin only)
surveys.post('/', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ title: string; choices: string }>();

  if (!body.title || !body.choices) {
    return c.json({ error: 'Title and choices required' }, 400);
  }

  const choicesArray = body.choices
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);

  if (choicesArray.length < 2) {
    return c.json({ error: 'At least 2 choices required' }, 400);
  }

  let token = generateToken();
  // Ensure uniqueness
  while (db.prepare('SELECT id FROM surveys WHERE token = ?').get(token)) {
    token = generateToken();
  }

  db.prepare('INSERT INTO surveys (token, title, choices) VALUES (?, ?, ?)').run(
    token,
    body.title,
    JSON.stringify(choicesArray)
  );

  return c.json({ token, title: body.title, choices: choicesArray });
});

// List all surveys (admin only)
surveys.get('/', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rows = db.prepare('SELECT token, title, choices, created_at FROM surveys ORDER BY created_at DESC').all() as {
    token: string;
    title: string;
    choices: string;
    created_at: string;
  }[];

  return c.json(
    rows.map((r) => ({
      ...r,
      choices: JSON.parse(r.choices),
    }))
  );
});

// Get survey by token (public)
surveys.get('/:token', async (c) => {
  const token = c.req.param('token').toUpperCase();
  const survey = db.prepare('SELECT token, title, choices FROM surveys WHERE token = ?').get(token) as
    | { token: string; title: string; choices: string }
    | undefined;

  if (!survey) {
    return c.json({ error: 'Survey not found' }, 404);
  }

  return c.json({ ...survey, choices: JSON.parse(survey.choices) });
});

// Submit response (public)
surveys.post('/:token/respond', async (c) => {
  const token = c.req.param('token').toUpperCase();
  const survey = db.prepare('SELECT token, choices FROM surveys WHERE token = ?').get(token) as
    | { token: string; choices: string }
    | undefined;

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
  const existing = db
    .prepare('SELECT id FROM responses WHERE survey_token = ? AND pseudo = ?')
    .get(token, pseudo);
  if (existing) {
    return c.json({ error: 'You have already responded to this survey' }, 409);
  }

  db.prepare('INSERT INTO responses (survey_token, pseudo, votes) VALUES (?, ?, ?)').run(
    token,
    pseudo,
    JSON.stringify(body.votes)
  );

  return c.json({ success: true });
});

// Get stats (admin only)
surveys.get('/:token/stats', async (c) => {
  if (!verifyAdmin(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = c.req.param('token').toUpperCase();
  const survey = db.prepare('SELECT token, title, choices FROM surveys WHERE token = ?').get(token) as
    | { token: string; title: string; choices: string }
    | undefined;

  if (!survey) {
    return c.json({ error: 'Survey not found' }, 404);
  }

  const choices: string[] = JSON.parse(survey.choices);

  const responses = db
    .prepare('SELECT pseudo, votes FROM responses WHERE survey_token = ?')
    .all(token) as { pseudo: string; votes: string }[];

  // Aggregate weighted scores
  // Weight = (participant's total votes - rank + 1)
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

export default surveys;
