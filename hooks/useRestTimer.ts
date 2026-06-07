import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

interface RestTimerState {
  remaining: number;
  total: number;
  isRunning: boolean;
  isExpired: boolean;
}

export function useRestTimer(durationSeconds: number) {
  const [state, setState] = useState<RestTimerState>({
    remaining: durationSeconds,
    total: durationSeconds,
    isRunning: false,
    isExpired: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(durationSeconds);
  const backgroundTimestampRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    remainingRef.current = state.remaining;
    setState((prev) => ({ ...prev, isRunning: true, isExpired: false }));
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        remainingRef.current = 0;
        clearTimer();
        setState((prev) => ({
          ...prev,
          remaining: 0,
          isRunning: false,
          isExpired: true,
        }));
      } else {
        setState((prev) => ({ ...prev, remaining: remainingRef.current }));
      }
    }, 1000);
  }, [state.remaining, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const adjust = useCallback((delta: number) => {
    remainingRef.current = Math.max(0, remainingRef.current + delta);
    setState((prev) => ({
      ...prev,
      remaining: remainingRef.current,
      isExpired: remainingRef.current === 0,
    }));
  }, []);

  const reset = useCallback(
    (newDuration?: number) => {
      clearTimer();
      const dur = newDuration ?? durationSeconds;
      remainingRef.current = dur;
      setState({
        remaining: dur,
        total: dur,
        isRunning: false,
        isExpired: false,
      });
    },
    [durationSeconds, clearTimer],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        backgroundTimestampRef.current = Date.now();
        clearTimer();
        setState((prev) => ({ ...prev, isRunning: false }));
      } else if (nextState === 'active' && backgroundTimestampRef.current !== null) {
        const elapsedMs = Date.now() - backgroundTimestampRef.current;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        backgroundTimestampRef.current = null;

        if (elapsedSec > 0) {
          remainingRef.current = Math.max(0, remainingRef.current - elapsedSec);
          if (remainingRef.current <= 0) {
            remainingRef.current = 0;
            setState({
              remaining: 0,
              total: 0,
              isRunning: false,
              isExpired: true,
            });
            return;
          }
        }

        // Restart the interval since the timer was running before backgrounding
        setState((prev) => ({
          ...prev,
          remaining: remainingRef.current,
          isRunning: true,
        }));
        intervalRef.current = setInterval(() => {
          remainingRef.current -= 1;
          if (remainingRef.current <= 0) {
            remainingRef.current = 0;
            clearTimer();
            setState((prev) => ({
              ...prev,
              remaining: 0,
              isRunning: false,
              isExpired: true,
            }));
          } else {
            setState((prev) => ({ ...prev, remaining: remainingRef.current }));
          }
        }, 1000);
      }
    });
    return () => {
      sub.remove();
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { ...state, start, stop, adjust, reset };
}
