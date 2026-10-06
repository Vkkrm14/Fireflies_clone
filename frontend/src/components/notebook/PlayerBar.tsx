"use client";

import { useEffect, useRef } from "react";
import { Download, Pause, Play, RotateCcw, RotateCw, Star, SquareCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { usePlayerStore } from "@/lib/store/player";
import { useToast } from "@/components/ui/Toast";
import styles from "./PlayerBar.module.css";

const RATES = [1, 1.25, 1.5, 2, 0.75];

export interface PlayerBarProps {
  mediaUrl: string | null;
  duration: number;
  onDownload: () => void;
  /** Seconds to jump to once the player is ready (search results deep-link with ?t=). */
  startAt?: number | null;
}

export function PlayerBar({ mediaUrl, duration, onDownload, startAt = null }: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const toast = useToast();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const total = usePlayerStore((s) => s.duration) || duration;
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const rate = usePlayerStore((s) => s.rate);
  const seekRequest = usePlayerStore((s) => s.seekRequest);
  const { setCurrentTime, setDuration, setPlaying, setRate, seekTo } = usePlayerStore.getState();
  const src = mediaUrl ? (mediaUrl.startsWith("http") ? mediaUrl : `${BASE_URL}${mediaUrl}`) : undefined;

  useEffect(() => {
    const store = usePlayerStore.getState();
    store.reset(duration);
    if (startAt !== null) store.seekTo(startAt);
    return () => usePlayerStore.getState().reset(0);
  }, [duration, mediaUrl, startAt]);

  useEffect(() => {
    const audio = audioRef.current;
    // Before the metadata loads the element would snap back to 0; onLoadedMetadata applies the request then
    if (audio && seekRequest && audio.readyState >= 1) audio.currentTime = Math.min(seekRequest.time, audio.duration || seekRequest.time);
  }, [seekRequest]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => toast.error("Playback blocked", "Click play again to start the audio."));
    else audio.pause();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.ctrlKey || event.metaKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) return;
      event.preventDefault();
      const audio = audioRef.current;
      if (!audio || !audio.src) return;
      if (audio.paused) audio.play().catch(() => undefined);
      else audio.pause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const skip = (delta: number) => seekTo(Math.max(0, Math.min(total, currentTime + delta)));
  const cycleRate = () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);
  const pct = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  return (
    <footer className={styles.bar}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          // Placeholder track may be longer than the meeting; prefer the meeting's own length
          if (!duration) setDuration(e.currentTarget.duration);
          const pending = usePlayerStore.getState().seekRequest;
          if (pending) e.currentTarget.currentTime = Math.min(pending.time, e.currentTarget.duration || pending.time);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className={styles.time}>
        <span>{formatTimestamp(currentTime)}</span> / {formatTimestamp(total)}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.rate} onClick={cycleRate} aria-label={`Playback speed ${rate}x`}>
          {rate}x
        </button>
        <button type="button" onClick={() => skip(-10)} aria-label="Back 10 seconds"><RotateCcw size={18} /></button>
        <button type="button" className={styles.play} onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"} disabled={!src}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button type="button" onClick={() => skip(10)} aria-label="Forward 10 seconds"><RotateCw size={18} /></button>
        <button type="button" onClick={onDownload} aria-label="Download transcript"><Download size={18} /></button>
      </div>

      <div className={styles.reactions}>
        <button type="button" aria-label="Star"><Star size={18} /></button>
        <button type="button" aria-label="Mark done"><SquareCheck size={18} /></button>
        <button type="button" aria-label="Helpful"><ThumbsUp size={18} /></button>
        <button type="button" aria-label="Not helpful"><ThumbsDown size={18} /></button>
      </div>

      <input
        type="range"
        className={styles.seek}
        min={0}
        max={Math.max(total, 1)}
        step={0.1}
        value={Math.min(currentTime, Math.max(total, 1))}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="Seek"
        style={{ ["--pct" as string]: `${pct}%` }}
      />
    </footer>
  );
}
