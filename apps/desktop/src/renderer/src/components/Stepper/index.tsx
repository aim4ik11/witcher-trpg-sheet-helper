import { useCallback, useEffect, useRef } from "react";
import "./Stepper.css";

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onValClick?: () => void;
  disabled?: boolean;
  disableIncrease?: boolean;
  disableDecrease?: boolean;
  hideValue?: boolean;
  className?: string;
}

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 75;

function useRepeatAction(action: () => void, canAct: () => boolean) {
  const actionRef = useRef(action);
  const canActRef = useRef(canAct);
  actionRef.current = action;
  canActRef.current = canAct;

  const holdTimeout = useRef<ReturnType<typeof setTimeout>>();
  const repeatInterval = useRef<ReturnType<typeof setInterval>>();
  const skipClick = useRef(false);

  const stop = useCallback(() => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (repeatInterval.current) clearInterval(repeatInterval.current);
    holdTimeout.current = undefined;
    repeatInterval.current = undefined;
  }, []);

  const tick = useCallback(() => {
    if (!canActRef.current()) {
      stop();
      return;
    }
    actionRef.current();
  }, [stop]);

  const start = useCallback(() => {
    stop();
    if (!canActRef.current()) return;
    skipClick.current = true;
    tick();
    holdTimeout.current = setTimeout(() => {
      repeatInterval.current = setInterval(tick, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }, [stop, tick]);

  useEffect(() => {
    const onRelease = () => stop();
    window.addEventListener("pointerup", onRelease);
    window.addEventListener("pointercancel", onRelease);
    return () => {
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      stop();
    };
  }, [stop]);

  const onClick = useCallback(() => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    tick();
  }, [tick]);

  return { start, stop, onClick };
}

export default function Stepper({
  value,
  min,
  max,
  onChange,
  onValClick,
  disabled,
  disableIncrease,
  disableDecrease,
  hideValue,
  className = "",
}: Props) {
  const stateRef = useRef({
    value,
    min,
    max,
    disabled,
    disableIncrease,
    disableDecrease,
    onChange,
  });
  stateRef.current = {
    value,
    min,
    max,
    disabled,
    disableIncrease,
    disableDecrease,
    onChange,
  };

  const decrease = useCallback(() => {
    const s = stateRef.current;
    onChange(Math.max(s.min, s.value - 1));
  }, [onChange]);

  const increase = useCallback(() => {
    const s = stateRef.current;
    onChange(Math.min(s.max, s.value + 1));
  }, [onChange]);

  const canDecrease = useCallback(() => {
    const s = stateRef.current;
    return !s.disabled && !s.disableDecrease && s.value > s.min;
  }, []);

  const canIncrease = useCallback(() => {
    const s = stateRef.current;
    return !s.disabled && !s.disableIncrease && s.value < s.max;
  }, []);

  const dec = useRepeatAction(decrease, canDecrease);
  const inc = useRepeatAction(increase, canIncrease);

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={`stepper${disabled ? " stepper--disabled" : ""} ${className}`.trim()}>
      <button
        type="button"
        className="stepper-btn"
        disabled={disabled || disableDecrease || atMin}
        aria-label="Decrease"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          dec.start();
        }}
        onPointerLeave={dec.stop}
        onClick={dec.onClick}
      >
        −
      </button>
      {!hideValue && (
        <span
          className={"stepper-value " + (!!onValClick && 'clickable')}
          aria-live="polite"
          onClick={onValClick}
        >
          {value}
        </span>
      )}
      <button
        type="button"
        className="stepper-btn"
        disabled={disabled || disableIncrease || atMax}
        aria-label="Increase"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          inc.start();
        }}
        onPointerLeave={inc.stop}
        onClick={inc.onClick}
      >
        +
      </button>
    </div>
  );
}
