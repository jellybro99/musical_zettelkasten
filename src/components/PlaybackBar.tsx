import { Play, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { computePlaybackProgress, formatPlaybackTime } from '../domain/playback'
import './PlaybackBar.css'

export interface NowPlaying {
  slipId: string
  title: string
  tempo: number
  durationMs: number
  startedAt: number
}

export interface PlaybackBarProps {
  nowPlaying: NowPlaying | null
  onStop: () => void
}

const TICK_MS = 100

export function PlaybackBar({ nowPlaying, onStop }: PlaybackBarProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!nowPlaying) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(interval)
  }, [nowPlaying])

  const progress = nowPlaying
    ? computePlaybackProgress(nowPlaying.durationMs, now - nowPlaying.startedAt)
    : { elapsedMs: 0, remainingMs: 0, ratio: 0 }

  return (
    <div className="playback-bar">
      <button
        type="button"
        className="btn btn-primary btn-icon playback-bar-toggle"
        onClick={onStop}
        disabled={!nowPlaying}
        aria-label={nowPlaying ? `Stop ${nowPlaying.title}` : 'Nothing playing'}
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
