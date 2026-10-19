import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

interface RestTimerOptions {
  /** Called once when the countdown reaches zero (also after returning from background). */
  onExpire?: () => void;
}

/**
 * Wall-clock rest timer built around a deadline (`endAt`), so it keeps
 * running while the app is in the background and never drifts. After the
 * deadline it keeps counting into negative overtime until stopped.
 */
export function useRestTimer({ onExpire }: RestTimerOptions = {}) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const endAtRef = useRef<number | null>(null);
  const expiredFiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Tick while running; recompute immediately when returning to the foreground.
  useEffect(() => {
    if (endAt === null) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [endAt]);

  const msLeft = endAt === null ? total * 1000 : endAt - now;
  const isOvertime = endAt !== null && msLeft <= 0;
  // Positive: seconds left (rounded up). Negative: whole seconds over.
  const remaining = msLeft > 0 ? Math.ceil(msLeft / 1000) : -Math.floor(-msLeft / 1000);

  useEffect(() => {
    if (isOvertime && !expiredFiredRef.current) {
      expiredFiredRef.current = true;
      onExpireRef.current?.();
    }
  }, [isOvertime]);

  /** Starts a rest of `durationSec`, or resumes one with a known deadline. */
  const start = useCallback((durationSec: number, existingEndAt?: number) => {
    const deadline = existingEndAt ?? Date.now() + durationSec * 1000;
    // Resuming a rest that already ran out should not re-fire the alert.
    expiredFiredRef.current = existingEndAt !== undefined && existingEndAt <= Date.now();
    endAtRef.current = deadline;
    setTotal(durationSec);
    setNow(Date.now());
    setEndAt(deadline);
  }, []);

  /** Shifts the deadline; returns the new deadline (null when not running). */
  const adjust = useCallback((deltaSec: number): number | null => {
    const current = endAtRef.current;
    if (current === null) return null;
    const nowMs = Date.now();
    let next = current + deltaSec * 1000;
    // Shortening never pushes the deadline further into the past than now.
    if (deltaSec < 0) next = Math.max(next, Math.min(current, nowMs));
    if (next > nowMs) expiredFiredRef.current = false;
    endAtRef.current = next;
    setTotal((t) => Math.max(1, t + deltaSec));
    setNow(nowMs);
    setEndAt(next);
    return next;
  }, []);

  const stop = useCallback(() => {
    endAtRef.current = null;
    setEndAt(null);
  }, []);

  return {
    remaining,
    total,
    endAt,
    isRunning: endAt !== null,
    isOvertime,
    start,
    adjust,
    stop,
  };
}
