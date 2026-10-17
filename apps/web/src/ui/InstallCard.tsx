import { useEffect, useState } from 'react';
import { BrandMark } from './Brand';
import { CloseIcon } from './icons';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'felt.installDismissed';

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

function dismissedBefore() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Offers to put Aced on the home screen: one tap where the browser allows
 * it, the Share steps on iPhone. Hidden once installed or dismissed.
 */
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallPrompt>();
  const [hidden, setHidden] = useState(() => standalone() || dismissedBefore());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || (!prompt && !isIos())) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* Storage blocked: it shows again next visit. */
    }
  };

  return (
    <div className="card install-card reveal">
      <BrandMark size={44} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="install-title">Put Aced on your home screen</div>
        {prompt ? (
          <div className="footnote">It opens full screen and works offline.</div>
        ) : (
          <div className="footnote">
            Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
          </div>
        )}
        {prompt && (
          <button
            className="btn btn-tinted install-btn"
            onClick={async () => {
              await prompt.prompt();
              const choice = await prompt.userChoice.catch(() => undefined);
              if (choice?.outcome === 'accepted') setHidden(true);
              setPrompt(undefined);
            }}
          >
            Install Aced
          </button>
        )}
      </div>
      <button className="icon-btn install-close" aria-label="Not now" onClick={dismiss}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
