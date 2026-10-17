import { CHART_OPEN_BB, MAX_OPEN_BB, MIN_OPEN_BB, openSize } from '@felt/core';
import { useSettings } from '../state/settings';
import { Stepper } from '../ui/Stepper';

/**
 * Your standard open, in Settings and at the Play table. Live games often
 * open to 4bb or more, so the charts' 2.5bb is only the default.
 */
export function OpenSizeRow() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const value = openSize(g);
  return (
    <div className="list-row">
      <span className="grow">
        <span style={{ display: 'block' }}>Your open</span>
        <span className="footnote">{value === CHART_OPEN_BB ? 'The size the charts assume' : 'Plus 1bb for each limper'}</span>
      </span>
      <Stepper
        label="big blinds"
        value={value}
        min={MIN_OPEN_BB}
        max={MAX_OPEN_BB}
        step={0.5}
        format={(v) => `${v}bb`}
        onChange={(openBb) => update({ ...settings, game: { ...g, openBb: openBb === CHART_OPEN_BB ? undefined : openBb } })}
      />
    </div>
  );
}
