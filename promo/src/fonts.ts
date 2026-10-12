import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { continueRender, delayRender, staticFile } from 'remotion';

/**
 * Instrument Serif is the display face (titles and hero numbers only).
 * Inter stands in for the system font, which a headless renderer lacks.
 */
const handle = delayRender('Load fonts');

const faces = [
  new FontFace('Instrument Serif', `url(${staticFile('fonts/instrument-serif-latin-400-normal.woff2')}) format('woff2')`),
  new FontFace('Instrument Serif', `url(${staticFile('fonts/instrument-serif-latin-400-italic.woff2')}) format('woff2')`, {
    style: 'italic',
  }),
];

Promise.all([
  ...faces.map((f) => f.load().then((loaded) => document.fonts.add(loaded))),
  ...['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 40px Inter`)),
])
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
