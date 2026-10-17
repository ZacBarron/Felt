// Builds acedpoker.app as one static folder: the marketing site at "/" and the
// app at "/app/". Upload dist-domain/ to any static host, or point GitHub Pages
// at it (it includes the CNAME file). Set VITE_API_URL to the Aced server.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';

const api = process.env.VITE_API_URL ?? '';
const run = (cmd, env) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

run('pnpm --filter @felt/web build', { FELT_BASE: '/app/', VITE_API_URL: api });
run('pnpm --filter @felt/site build', { SITE_BASE: '/', VITE_APP_URL: '/app/', VITE_API_URL: api });

const out = 'dist-domain';
if (existsSync(out)) rmSync(out, { recursive: true });
cpSync('apps/site/dist', out, { recursive: true });
cpSync('apps/web/dist', `${out}/app`, { recursive: true });
// Static hosts have no rewrites. The app's own page answers unknown paths, so
// deep links into the app work and anything else shows the app's "page folded" screen.
cpSync('apps/web/dist/index.html', `${out}/404.html`);
writeFileSync(`${out}/CNAME`, 'acedpoker.app\n');
writeFileSync(`${out}/.nojekyll`, '');
console.log(`Built ${out}: the site at /, the app at /app/`);
