import { useState, useEffect, useRef } from 'react';
import { formatKobo, koboToNairaInput, parseNairaToKobo } from '../../lib/money';

export interface MoneyInputProps {
  id?: string;
  value?: number | null; // in kobo
  onChange?: (kobo: number | null) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  chips?: number[]; // list of kobo amounts
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MoneyInput({
  id,
  value,
  onChange,
  onBlur,
  chips,
  hasError = false,
  disabled = false,
  placeholder = '0',
  className = '',
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value !== undefined && value !== null ? koboToNairaInput(value) : ''
  );
  const displayValueRef = useRef(displayValue);
  displayValueRef.current = displayValue;

  useEffect(() => {
    if (value !== undefined && value !== null) {
      // Check if current displayValue parses to same kobo
      const currentParsed = parseNairaToKobo(displayValueRef.current);
      if (currentParsed !== value) {
        setDisplayValue(koboToNairaInput(value));
      }
    } else if (value === null && displayValueRef.current !== '') {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseNairaToKobo(raw);
    onChange?.(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseNairaToKobo(displayValue);
    if (parsed !== null) {
      setDisplayValue(koboToNairaInput(parsed));
    }
    onBlur?.(e);
  };

  const handleChipClick = (chipKobo: number) => {
    setDisplayValue(koboToNairaInput(chipKobo));
    onChange?.(chipKobo);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-muted select-none">
          ₦
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`h-11 w-full rounded-xl border pl-8 pr-3.5 text-[15px] font-medium tabular-nums text-ink bg-surface placeholder:text-muted outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${
            hasError
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
          } ${className}`}
        />
      </div>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {chips.map((chipKobo) => (
            <button
              key={chipKobo}
              type="button"
              disabled={disabled}
              onClick={() => handleChipClick(chipKobo)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-surface-muted transition select-none disabled:opacity-50"
            >
              {formatKobo(chipKobo)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
