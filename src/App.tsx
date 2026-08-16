import { useRef, useState } from 'react'
import { createPlaybackEngine, type PlaybackEngine } from './audio/playbackEngine'
import { PlaybackBar, type NowPlaying } from './components/PlaybackBar'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditor } from './components/SlipEditor'
import { TopNav } from './components/TopNav'
import { computePlaybackDurationMs } from './domain/playback'
import { createSlip, totalSteps, type Slip } from './domain/slip'

type Screen = { screen: 'dashboard' } | { screen: 'editor'; slipId: string }

function App() {
  const [screen, setScreen] = useState<Screen>({ screen: 'dashboard' })
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [currentEditorSlip, setCurrentEditorSlip] = useState<Slip | null>(null)
  const engineRef = useRef<PlaybackEngine | null>(null)
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function stopPlayback() {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
    engineRef.current?.stop()
    setNowPlaying(null)
  }

  function playSlip(slip: Slip) {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
    if (!engineRef.current) engineRef.current = createPlaybackEngine()
    engineRef.current.play(slip.notes, slip.tempo)

    const durationMs = computePlaybackDurationMs(slip.tempo, totalSteps(slip.grid))
    setNowPlaying({ slipId: slip.id, title: slip.title, tempo: slip.tempo, durationMs, startedAt: Date.now() })
    stopTimeoutRef.current = setTimeout(() => setNowPlaying(null), durationMs)
  }

  function togglePlay(slip: Slip) {
    if (nowPlaying?.slipId === slip.id) {
      stopPlayback()
    } else {
      playSlip(slip)
    }
  }

  function openSlip(slipId: string) {
    stopPlayback()
    setCurrentEditorSlip(null)
    setScreen({ screen: 'editor', slipId })
  }

  function goToDashboard() {
    if (screen.screen !== 'dashboard') stopPlayback()
    setCurrentEditorSlip(null)
    setScreen({ screen: 'dashboard' })
  }

  function handleCapture() {
    const slip = createSlip()
    openSlip(slip.id)
  }

  function handleBarToggle() {
    if (nowPlaying) {
      stopPlayback()
    } else if (currentEditorSlip) {
      playSlip(currentEditorSlip)
    }
  }

  return (
    <div className="app-shell">
      <TopNav onSlipBoxClick={goToDashboard} onCapture={handleCapture} />
      <main className="app-shell-body app-shell-body-flush">
        {screen.screen === 'dashboard' ? (
          <SlipDashboard onOpenSlip={openSlip} playingId={nowPlaying?.slipId ?? null} onTogglePlay={togglePlay} />
        ) : (
          <SlipEditor slipId={screen.slipId} onBack={goToDashboard} onSlipChange={setCurrentEditorSlip} />
        )}
      </main>
      <PlaybackBar nowPlaying={nowPlaying} canPlay={screen.screen === 'editor'} onToggle={handleBarToggle} />
    </div>
  )
}

export default App
