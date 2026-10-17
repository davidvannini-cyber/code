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
export function NumberInput({ value, onValue, min, step = 1, className, onCommit, autoFocus }: Props) {
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

  // − / + buttons for the pen: one tap steps by `step`, holding repeats. Latest
  // value/handler are kept in refs so the repeating timer never acts on stale ones.
  const stepSize = Number(step) || 1;
  const latest = useRef({ value, onValue, min, stepSize });
  latest.current = { value, onValue, min, stepSize };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = (dir: 1 | -1) => {
    const { value: cur, onValue: emit, min: lo, stepSize: st } = latest.current;
    let next = Number((cur + dir * st).toFixed(6));
    if (lo !== undefined && next < lo) next = lo;
    if (next === cur) return;
    latest.current.value = next; // the next repeat starts from here, before React re-renders
    setText(String(next));
    emit(next);
  };
  const stopRepeat = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const startRepeat = (dir: 1 | -1) => {
    stopRepeat();
    bump(dir);
    const tick = (delay: number) => {
      timer.current = setTimeout(() => {
        bump(dir);
        tick(70);
      }, delay);
    };
    tick(450);
  };
  useEffect(() => stopRepeat, []);

  const stepButton = (dir: 1 | -1) => (
    <button
      type="button"
      className="num-step"
      tabIndex={-1}
      aria-label={dir === 1 ? "Aumenta" : "Diminuisci"}
      // preventDefault keeps the focus in the field, so stepping never counts as "leaving" it
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        startRepeat(dir);
      }}
      onPointerUp={stopRepeat}
      onPointerCancel={stopRepeat}
      onLostPointerCapture={stopRepeat}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path d={dir === 1 ? "M2 6.5 5 3.5 8 6.5" : "M2 3.5 5 6.5 8 3.5"} />
      </svg>
    </button>
  );

  const parse = (t: string): number | null => {
    const v = parseFloat(t.replace(",", "."));
    if (!Number.isFinite(v) || (min !== undefined && v < min)) return null;
    return v;
  };

  return (
    <span className="num-field">
      <input
        ref={ref}
        type="text"
        inputMode={min !== undefined && min >= 0 ? "decimal" : "text"}
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
      <span className="num-stack">
        {stepButton(1)}
        {stepButton(-1)}
      </span>
    </span>
  );
}
