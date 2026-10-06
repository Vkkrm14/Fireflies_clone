import { create } from "zustand";

interface SeekRequest {
  time: number;
  nonce: number;
}

interface PlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  rate: number;
  /** Set by transcript/chapter clicks; the audio element applies it and clears nothing (nonce makes repeats distinct). */
  seekRequest: SeekRequest | null;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setRate: (rate: number) => void;
  seekTo: (time: number) => void;
  reset: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  rate: 1,
  seekRequest: null,
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setRate: (rate) => set({ rate }),
  seekTo: (time) => set((s) => ({ currentTime: time, seekRequest: { time, nonce: (s.seekRequest?.nonce ?? 0) + 1 } })),
  reset: (duration) => set({ currentTime: 0, duration, isPlaying: false, rate: 1, seekRequest: null }),
}));
