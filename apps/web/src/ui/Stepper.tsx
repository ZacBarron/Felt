import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  label: string;
}

/** Minus / value / plus. Faster than typing on a phone. */
export function Stepper({ value, min, max, step = 1, onChange, format = String, label }: Props) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }} role="group" aria-label={label}>
      <button className="btn icon-btn" aria-label={`Fewer ${label}`} disabled={value <= min} data-haptic="select" onClick={() => onChange(Math.max(min, value - step))}>
        <Minus size={18} />
      </button>
      <span className="num" style={{ minWidth: 44, textAlign: 'center', fontWeight: 800, fontSize: '1.05rem' }}>
        {format(value)}
      </span>
      <button className="btn icon-btn" aria-label={`More ${label}`} disabled={value >= max} data-haptic="select" onClick={() => onChange(Math.min(max, value + step))}>
        <Plus size={18} />
      </button>
    </div>
  );
}
