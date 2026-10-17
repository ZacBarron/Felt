import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.ts';
import { createCoachClient } from './coach.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { runPauseResumes } from './billing.ts';
import { runLifecycleEmails } from './emails.ts';
import { createPushSender, runReminders, runTrialNotices } from './push.ts';
import { createMailer, createStripe } from './services.ts';
import { runAnalyticsRetention } from './analytics.ts';
import { createFlags } from './flags.ts';
import { runJob } from './ops.ts';

const config = loadConfig();
const db = openDb(config.databasePath);
const mailer = createMailer(config.email.resendKey, config.email.from);
const stripe = config.stripe.secretKey ? createStripe(config.stripe.secretKey) : undefined;
// One flags instance for the API and the scheduler, so a change in the console applies to both at once.
const flags = createFlags(db, config);
const app = createApp({
  db,
  config,
  mailer,
  stripe,
  flags,
  coach: config.coach.apiKey ? createCoachClient(config.coach.apiKey) : undefined,
});

// The web app, when built next to the server: one service hosts both.
const webDir = config.webDir ? resolve(config.webDir) : undefined;
if (webDir && existsSync(join(webDir, 'index.html'))) {
  const index = readFileSync(join(webDir, 'index.html'), 'utf8');
  app.use('*', async (c, next) => {
    await next();
    // Entry files must always be revalidated so updates reach players; hashed assets never change.
    const path = c.req.path;
    if (path === '/' || path.endsWith('.html') || path === '/sw.js' || path === '/registerSW.js' || path.endsWith('.webmanifest'))
      c.header('Cache-Control', 'no-cache');
    else if (path.startsWith('/assets/')) c.header('Cache-Control', 'public, max-age=31536000, immutable');
  });
  // serveStatic resolves its root against the working directory.
  app.use('*', serveStatic({ root: relative(process.cwd(), webDir) || '.' }));
  // Client side routes such as /learn load the app.
  app.get('*', (c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'Not found.' }, 404) : c.html(index)));
}

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`Aced server on http://localhost:${port}${webDir ? ` serving ${webDir}` : ''}`);
  if (!config.production && config.devCodes) console.log('Development mode: sign in codes are returned by the API and printed here.');
  if (config.proForEveryone) console.log('Testing: PRO_FOR_EVERYONE is on, so every signed in player has Aced Pro.');
});

// The scheduler: pushes when VAPID keys are set, lifecycle email always
// (transactional mail needs no opt in), and pauses that are due to end.
// Each run is recorded for the console's health screen (job_runs).
const sender = createPushSender(config);
const now = () => new Date();
let lastRetention = 0;
const tick = () => {
  if (sender) {
    void runJob(db, 'reminders', now, () => runReminders(db, sender, now(), flags));
    void runJob(db, 'trial_notices', now, () => runTrialNotices(db, sender, now(), flags));
  }
  void runJob(db, 'lifecycle_email', now, () => runLifecycleEmails(db, mailer, config, now(), stripe, flags));
  if (stripe) void runJob(db, 'pause_resumes', now, () => runPauseResumes(db, config, stripe));
  // Raw analytics events older than 13 months are deleted once a day.
  if (Date.now() - lastRetention > 86_400_000) {
    lastRetention = Date.now();
    void runJob(db, 'retention', now, () => runAnalyticsRetention(db, now()));
  }
};
setInterval(tick, 5 * 60 * 1000);
void tick();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    db.close();
    process.exit(0);
  });
}
