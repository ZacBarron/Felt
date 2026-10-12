import { useEffect } from 'react';

/** Adds a class to <body> while the component is mounted (focus mode, bottom bar spacing). */
export function useBodyClass(className: string, active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className, active]);
}
