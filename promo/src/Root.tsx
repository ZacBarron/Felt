import { Composition } from 'remotion';
import { Promo } from './Promo';
import { DURATION, FPS } from './timeline';

export function Root() {
  return (
    <>
      <Composition id="FeltPromoVertical" component={Promo} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ audio: true }} />
      <Composition id="FeltPromoLandscape" component={Promo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ audio: true }} />
    </>
  );
}
