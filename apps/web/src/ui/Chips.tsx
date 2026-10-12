interface Props<T extends string> {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/** A horizontally scrolling row of choices; thumb friendly where a select is not. */
export function Chips<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="chips" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={o.value === value}
          data-haptic="select"
          onClick={(e) => {
            onChange(o.value);
            e.currentTarget.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
