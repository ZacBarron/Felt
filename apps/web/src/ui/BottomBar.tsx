import type { ReactNode } from 'react';
import { useBodyClass } from './useBodyClass';

/** Primary actions pinned to the thumb zone on phones; inline on desktop. */
export function BottomBar({ children }: { children: ReactNode }) {
  useBodyClass('has-bottom-bar');
  return <div className="bottom-bar">{children}</div>;
}
