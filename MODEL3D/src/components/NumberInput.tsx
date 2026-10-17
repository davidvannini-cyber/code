import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onValue: (v: number) => void;
  /** Smallest accepted value; anything lower is ignored while typing. */
  min?: number;
  step?: number | string;
  className?: string;
}

// Numeric field that can be emptied with backspace: the text is kept locally
// while typing, a value is sent up only when it parses (and respects `min`),
// and an empty/invalid text goes back to the last good value on blur. Focusing
// selects the whole value so typing replaces it.
export function NumberInput({ value, onValue, min, className }: Props) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

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
      onBlur={() => {
        focused.current = false;
        setText(String(value));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
