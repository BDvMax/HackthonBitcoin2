"use client";

import { useCallback, useRef } from 'react';

export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volume = 0.1) => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore errors (e.g. autoplay restrictions)
    }
  }, []);

  const playClick = useCallback(() => playTone(600, 'sine', 0.05, 0.05), [playTone]);
  const playHover = useCallback(() => playTone(800, 'sine', 0.03, 0.01), [playTone]);
  const playSuccess = useCallback(() => {
    playTone(440, 'sine', 0.1, 0.05);
    setTimeout(() => playTone(880, 'sine', 0.15, 0.05), 100);
  }, [playTone]);
  const playError = useCallback(() => {
    playTone(200, 'sawtooth', 0.1, 0.05);
    setTimeout(() => playTone(150, 'sawtooth', 0.2, 0.05), 100);
  }, [playTone]);
  const playToggle = useCallback(() => playTone(500, 'square', 0.08, 0.03), [playTone]);

  return { playClick, playHover, playSuccess, playError, playToggle };
}
