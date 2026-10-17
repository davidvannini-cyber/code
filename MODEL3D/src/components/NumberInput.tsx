import { useEffect, useRef, useState, type FocusEvent } from "react";

interface Props {
  value: number;
  onValue: (v: number) => void;
  /** Smallest accepted value; anything lower is ignored while typing. */
  min?: number;
  step?: number | string;
  className?: string;
  /** Called when the field is left (Tab, click outside, Enter) with a valid value. */
  onCommit?: (v: number, e: FocusEvent<HTMLInputElement>) => void;
  /** Focus and select the field as soon as it appears. */
  autoFocus?: boolean;
}

// Numeric field that can be emptied with backspace: the text is kept locally
// while typing, a value is sent up only when it parses (and respects `min`),
// and an empty/invalid text goes back to the last good value on blur. Focusing
// selects the whole value so typing replaces it.
export function NumberInput({ value, onValue, min, className, onCommit, autoFocus }: Props) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  const ref = useRef<HTMLInputElement>(null);

  // Delayed: the click that made this field appear (e.g. picking an edge in the
  // viewport) would otherwise take the focus right back and trigger a blur.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 250);
    return () => clearTimeout(t);
  }, [autoFocus]);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const parse = (t: string): number | null => {
    const v = parseFloat(t.replace(",", "."));
    if (!Number.isFinite(v) || (min !== undefined && v < min)) return null;
    return v;
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        setText(e.target.value);
        const v = parse(e.target.value);
        if (v !== null && v !== value) onValue(v);
      }}
      onBlur={(e) => {
        focused.current = false;
        const v = parse(e.target.value);
        setText(String(v ?? value));
        if (v !== null) onCommit?.(v, e);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
