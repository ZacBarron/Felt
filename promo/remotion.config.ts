import { existsSync } from 'node:fs';
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setChromiumOpenGlRenderer('swiftshader');

// Use a preinstalled Chromium when Remotion cannot download its own.
// Override with REMOTION_BROWSER=/path/to/chrome.
const candidates = [
  process.env.REMOTION_BROWSER,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean) as string[];
const browser = candidates.find((p) => existsSync(p));
if (browser) Config.setBrowserExecutable(browser);
