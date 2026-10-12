// Turns the artifact build's index.html into a page body: the host adds the
// document skeleton, so only the title, styles, scripts and root stay. The
// app sits in a phone sized frame so it looks and behaves like the phone app
// on any screen.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-artifact/', import.meta.url);
const html = readFileSync(new URL('index.html', dir), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const keep = head
  .split('\n')
  .filter((l) => /<title>|<link rel="stylesheet"|<script|<link rel="modulepreload"/.test(l))
  .join('\n');

const frame = `
<style>
  /* The frame is a containing block for the app's fixed bars (transform), and #root scrolls inside it. */
  html, body { height: 100%; }
  html { background: color-mix(in srgb, var(--label) 7%, var(--bg)); }
  body { margin: 0; overflow: hidden; background: transparent; }
  #phone {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0 auto;
    transform: translateZ(0);
    overflow: hidden;
    background: var(--bg);
  }
  #root { height: 100%; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  @media (min-width: 520px) and (min-height: 640px) {
    body { display: grid; place-items: center; }
    #phone {
      width: 390px;
      height: min(844px, calc(100% - 32px));
      border-radius: 44px;
      box-shadow: 0 0 0 10px #111, 0 0 0 11px #333, 0 30px 80px rgba(0, 0, 0, 0.35);
    }
  }
</style>
<script>
  // The app scrolls #root, not the window; keep its scroll calls working.
  window.scrollTo = function (a, b) {
    var root = document.getElementById('root');
    if (!root) return;
    if (typeof a === 'object') root.scrollTo(a);
    else root.scrollTo(a || 0, b || 0);
  };
</script>
<div id="phone"><div id="root"></div></div>
`;
writeFileSync(new URL('page.html', dir), `${keep}\n${frame}`);
console.log('dist-artifact/page.html written');
