import { useRef, useState } from 'react'
import { createPlaybackEngine, type PlaybackEngine } from './audio/playbackEngine'
import { ArrangementDashboard } from './components/ArrangementDashboard'
import { ArrangementView } from './components/ArrangementView'
import { PlaybackBar, type NowPlaying } from './components/PlaybackBar'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditor } from './components/SlipEditor'
import { TopNav } from './components/TopNav'
import { computePlaybackDurationMs } from './domain/playback'
import { createSlip, totalSteps, type Note, type Slip } from './domain/slip'

type Screen =
  | { screen: 'dashboard' }
  | { screen: 'editor'; slipId: string }
  | { screen: 'arrangement-list' }
  | { screen: 'arrangement'; arrangementId: string }

function App() {
  const [screen, setScreen] = useState<Screen>({ screen: 'dashboard' })
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [currentEditorSlip, setCurrentEditorSlip] = useState<Slip | null>(null)
  const [backStack, setBackStack] = useState<string[]>([])
  const [loop, setLoop] = useState(false)
  const engineRef = useRef<PlaybackEngine | null>(null)
  const loopRef = useRef(false)

  function toggleLoop() {
    loopRef.current = !loopRef.current
    setLoop(loopRef.current)
  }

  function stopPlayback() {
    engineRef.current?.stop()
    setNowPlaying(null)
  }

  function previewNote(pitch: number, durationMs: number) {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()
    engineRef.current.previewPitch(pitch, durationMs)
    setNowPlaying(null)
  }

  function startEngine(notes: Note[], tempo: number, durationMs: number) {
    engineRef.current?.play(notes, tempo, {
      durationMs,
      onTick: (elapsedMs) => setNowPlaying((prev) => (prev ? { ...prev, elapsedMs } : prev)),
      onEnded: () => {
        if (loopRef.current) {
          setNowPlaying((prev) => (prev ? { ...prev, elapsedMs: 0 } : prev))
          startEngine(notes, tempo, durationMs)
        } else {
          setNowPlaying(null)
        }
      },
    })
  }

  function playSlip(slip: Slip) {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()

    const durationMs = computePlaybackDurationMs(slip.tempo, totalSteps(slip.grid))
    setNowPlaying({ kind: 'slip', slipId: slip.id, title: slip.title, tempo: slip.tempo, durationMs, elapsedMs: 0 })
    startEngine(slip.notes, slip.tempo, durationMs)
  }

  function togglePlay(slip: Slip) {
    if (nowPlaying?.kind === 'slip' && nowPlaying.slipId === slip.id) {
      stopPlayback()
    } else {
      playSlip(slip)
    }
  }

  function openSlip(slipId: string) {
    stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack([])
    setScreen({ screen: 'editor', slipId })
  }

  function goToDashboard() {
    if (screen.screen !== 'dashboard') stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack([])
    setScreen({ screen: 'dashboard' })
  }

  function goToArrangements() {
    if (screen.screen !== 'arrangement-list') stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack([])
    setScreen({ screen: 'arrangement-list' })
  }

  function openArrangement(arrangementId: string) {
    stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack([])
    setScreen({ screen: 'arrangement', arrangementId })
  }

  function handleCapture() {
    const slip = createSlip()
    openSlip(slip.id)
  }

  function handleNavigateToSlip(currentSlipId: string, targetSlipId: string) {
    setCurrentEditorSlip(null)
    setBackStack((prev) => [...prev, currentSlipId])
    setScreen({ screen: 'editor', slipId: targetSlipId })
  }

  function handleEditorBack() {
    if (backStack.length === 0) {
      goToDashboard()
      return
    }
    const previousSlipId = backStack[backStack.length - 1]
    stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack((prev) => prev.slice(0, -1))
    setScreen({ screen: 'editor', slipId: previousSlipId })
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
      <TopNav
        onSlipBoxClick={goToDashboard}
        onArrangeClick={goToArrangements}
        onCapture={handleCapture}
        activeScreen={screen.screen === 'arrangement-list' || screen.screen === 'arrangement' ? 'arrange' : 'dashboard'}
      />
      <main className="app-shell-body app-shell-body-flush">
        {screen.screen === 'dashboard' ? (
          <SlipDashboard
            onOpenSlip={openSlip}
            playingId={nowPlaying?.kind === 'slip' ? nowPlaying.slipId : null}
            onTogglePlay={togglePlay}
          />
        ) : screen.screen === 'editor' ? (
          <SlipEditor
            slipId={screen.slipId}
            onBack={handleEditorBack}
            onSlipChange={setCurrentEditorSlip}
            onStopPlayback={stopPlayback}
            onPreviewNote={previewNote}
            onNavigateToSlip={handleNavigateToSlip}
            onCopySlip={openSlip}
          />
        ) : screen.screen === 'arrangement-list' ? (
          <ArrangementDashboard onOpenArrangement={openArrangement} />
        ) : (
          <ArrangementView arrangementId={screen.arrangementId} onBack={goToArrangements} />
        )}
      </main>
      <PlaybackBar
        nowPlaying={nowPlaying}
        canPlay={screen.screen === 'editor'}
        loop={loop}
        onToggle={handleBarToggle}
        onToggleLoop={toggleLoop}
      />
    </div>
  )
}

export default App
