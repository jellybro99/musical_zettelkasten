import { Play, Repeat, Square } from 'lucide-react'
import { computePlaybackProgress, formatPlaybackTime } from '../domain/playback'
import './PlaybackBar.css'

export type NowPlaying =
  | { kind: 'slip'; slipId: string; title: string; tempo: number; durationMs: number; elapsedMs: number }
  | { kind: 'arrangement'; arrangementId: string; title: string; tempo: number; durationMs: number; elapsedMs: number }

export interface PlaybackBarProps {
  nowPlaying: NowPlaying | null
  canPlay: boolean
  loop: boolean
  onToggle: () => void
  onToggleLoop: () => void
}

export function PlaybackBar({ nowPlaying, canPlay, loop, onToggle, onToggleLoop }: PlaybackBarProps) {
  const progress = nowPlaying
    ? computePlaybackProgress(nowPlaying.durationMs, nowPlaying.elapsedMs)
    : { elapsedMs: 0, remainingMs: 0, ratio: 0 }

  return (
    <div className="playback-bar">
      <button
        type="button"
        className="btn btn-primary btn-icon playback-bar-toggle"
        onClick={onToggle}
        disabled={!nowPlaying && !canPlay}
        aria-label={nowPlaying ? `Stop ${nowPlaying.title}` : 'Play'}
      >
        {nowPlaying ? <Square size={15} /> : <Play size={15} />}
      </button>
      <button
        type="button"
        className={`btn btn-icon playback-bar-loop ${loop ? 'btn-primary' : 'btn-secondary'}`}
        onClick={onToggleLoop}
        aria-pressed={loop}
        aria-label={loop ? 'Disable loop' : 'Enable loop'}
      >
        <Repeat size={15} />
      </button>
      <div className="playback-bar-title">{nowPlaying ? nowPlaying.title : 'Nothing playing'}</div>
      <div className="playback-bar-progress">
        <span className="playback-bar-time">{formatPlaybackTime(progress.elapsedMs)}</span>
        <div className="playback-bar-track">
          <div className="playback-bar-fill" style={{ width: `${progress.ratio * 100}%` }} />
        </div>
        <span className="playback-bar-time">{formatPlaybackTime(progress.remainingMs)}</span>
      </div>
      <div className="playback-bar-bpm">{nowPlaying ? `${nowPlaying.tempo} BPM` : '—'}</div>
    </div>
  )
}
