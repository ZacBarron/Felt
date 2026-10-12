// Turns the artifact build's index.html into a page body: the host adds the
// document skeleton, so only the title, styles, scripts and root stay.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-artifact/', import.meta.url);
const html = readFileSync(new URL('index.html', dir), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const keep = head
  .split('\n')
  .filter((l) => /<title>|<link rel="stylesheet"|<script|<link rel="modulepreload"/.test(l))
  .join('\n');
writeFileSync(new URL('page.html', dir), `${keep}\n${body.trim()}\n`);
console.log('dist-artifact/page.html written');
