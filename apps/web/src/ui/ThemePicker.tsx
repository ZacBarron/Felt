import { PALETTES, type Palette } from '../state/settings';
import { CheckIcon } from './icons';

/** Theme swatches: a slice of each theme's felt with its accent. */
export function ThemePicker({ value, onChange }: { value: Palette; onChange: (p: Palette) => void }) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Theme">
      {PALETTES.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            role="radio"
            aria-checked={active}
            className={`theme-swatch${active ? ' active' : ''}`}
            data-haptic="select"
            onClick={() => onChange(p.id)}
          >
            <span className="swatch" style={{ background: `radial-gradient(130% 130% at 0% 0%, ${p.felt[0]}, ${p.felt[1]})` }}>
              <span className="swatch-accent" style={{ background: p.accent }} />
              {active && <CheckIcon size={16} style={{ color: p.accent, position: 'absolute', right: 8, top: 8 }} />}
            </span>
            <span className="swatch-name">{p.name}</span>
            <span className="caption">{p.note}</span>
          </button>
        );
      })}
    </div>
  );
}
