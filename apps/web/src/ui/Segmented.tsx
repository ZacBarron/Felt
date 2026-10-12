interface Props<T extends string | number> {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  stretch?: boolean;
}

/** iOS style segmented control. */
export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel, stretch }: Props<T>) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel} style={stretch ? { display: 'grid', width: '100%' } : undefined}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          data-haptic="select"
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
