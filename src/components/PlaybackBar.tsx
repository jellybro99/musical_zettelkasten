import { Play, Square } from 'lucide-react'
import { computePlaybackProgress, formatPlaybackTime } from '../domain/playback'
import './PlaybackBar.css'

export interface NowPlaying {
  slipId: string
  title: string
  tempo: number
  durationMs: number
  elapsedMs: number
}

export interface PlaybackBarProps {
  nowPlaying: NowPlaying | null
  canPlay: boolean
  onToggle: () => void
}

export function PlaybackBar({ nowPlaying, canPlay, onToggle }: PlaybackBarProps) {
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
