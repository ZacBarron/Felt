import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import './fonts';
import { Chart } from './scenes/Chart';
import { Drill } from './scenes/Drill';
import { End } from './scenes/End';
import { Intro } from './scenes/Intro';
import { Phone } from './scenes/Phone';
import { Rating } from './scenes/Rating';
import { CUES, DURATION, SCENES } from './timeline';
import { Felt } from './ui/Background';
import { Scene } from './ui/Stage';

export function Promo({ audio = true }: { audio?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b2421' }}>
      <Felt />
      <Sequence from={SCENES.mark.from} durationInFrames={SCENES.mark.dur}>
        <Scene dur={SCENES.mark.dur} fadeIn={0}>
          <Intro />
        </Scene>
      </Sequence>
      <Sequence from={SCENES.chart.from} durationInFrames={SCENES.chart.dur}>
        <Scene dur={SCENES.chart.dur}>
          <Chart />
        </Scene>
      </Sequence>
      <Sequence from={SCENES.drill.from} durationInFrames={SCENES.drill.dur}>
        <Scene dur={SCENES.drill.dur}>
          <Drill />
        </Scene>
      </Sequence>
      <Sequence from={SCENES.rating.from} durationInFrames={SCENES.rating.dur}>
        <Scene dur={SCENES.rating.dur}>
          <Rating />
        </Scene>
      </Sequence>
      <Sequence from={SCENES.phone.from} durationInFrames={SCENES.phone.dur}>
        <Scene dur={SCENES.phone.dur}>
          <Phone />
        </Scene>
      </Sequence>
      <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
        <Scene dur={SCENES.end.dur} fadeOut={0}>
          <End />
        </Scene>
      </Sequence>
      {audio && <Sound />}
    </AbsoluteFill>
  );
}

/** Calm, low sound: a soft pad plus a few quiet effects tied to the motion. */
function Sound() {
  const sfx = (name: string, at: number, volume: number, key?: string) => (
    <Sequence key={key ?? `${name}-${at}`} from={at} layout="none">
      <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
    </Sequence>
  );
  return (
    <>
      <Audio
        src={staticFile('audio/pad.wav')}
        volume={(f) => interpolate(f, [0, 30, DURATION - 45, DURATION], [0, 0.55, 0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
      {sfx('chime', CUES.markLight, 0.35)}
      {sfx('brush', CUES.brush, 0.5)}
      {sfx('tap', CUES.callout, 0.35)}
      {CUES.deal.map((f) => sfx('deal', f, 0.55))}
      {CUES.flip.map((f) => sfx('flip', f, 0.5))}
      {sfx('tap', CUES.tap, 0.7)}
      {sfx('correct', CUES.correct, 0.4)}
      {sfx('chime', CUES.tier, 0.3)}
      {CUES.checks.map((f) => sfx('tap', f, 0.45))}
      {sfx('resolve', CUES.end, 0.4)}
    </>
  );
}
