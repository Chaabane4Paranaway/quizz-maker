import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs';
import { initDb } from './db';
import auth from './routes/auth';
import surveys from './routes/surveys';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// API routes
app.route('/api/auth', auth);
app.route('/api/surveys', surveys);

// Serve Next.js static export
const staticRoot = path.join(__dirname, '../../client/out');

if (fs.existsSync(staticRoot)) {
  app.use('/*', serveStatic({ root: staticRoot }));

  // SPA fallback for all non-API routes
  app.get('*', (c) => {
    const url = c.req.path;
    // Try to serve specific page file first
    const pageMappings: Record<string, string> = {
      '/admin': 'admin/index.html',
      '/survey': 'survey/index.html',
      '/results': 'results/index.html',
    };

    const pageKey = Object.keys(pageMappings).find(
      (k) => url === k || url.startsWith(k + '?') || url.startsWith(k + '/')
    );

    const filePath = pageKey
      ? path.join(staticRoot, pageMappings[pageKey])
      : path.join(staticRoot, 'index.html');

    const finalPath = fs.existsSync(filePath) ? filePath : path.join(staticRoot, 'index.html');

    const content = fs.readFileSync(finalPath, 'utf-8');
    return c.html(content);
  });
} else {
  app.get('/', (c) => c.text('Frontend not built yet. Run npm run build.'));
}

const port = parseInt(process.env.PORT || '3000');

// Initialize database and start server
initDb().then(() => {
  serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 Survey app running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
