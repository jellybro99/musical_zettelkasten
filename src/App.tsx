import { useRef, useState } from 'react'
import { createPlaybackEngine, type PlaybackEngine } from './audio/playbackEngine'
import { PlaybackBar, type NowPlaying } from './components/PlaybackBar'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditor } from './components/SlipEditor'
import { TopNav } from './components/TopNav'
import { computePlaybackDurationMs } from './domain/playback'
import { createSlip, resolveSlipNotes, totalSteps, type Note, type Slip } from './domain/slip'
import { listSlips } from './persistence/slipStorage'

type Screen = { screen: 'dashboard' } | { screen: 'editor'; slipId: string }

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

  async function playSlip(slip: Slip) {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()

    let allSlips: Slip[]
    try {
      allSlips = await listSlips()
    } catch (error) {
      console.error('Failed to load slips for playback', error)
      return
    }

    const notes = resolveSlipNotes(slip, allSlips)
    const durationMs = computePlaybackDurationMs(slip.tempo, totalSteps(slip.grid))
    setNowPlaying({ slipId: slip.id, title: slip.title, tempo: slip.tempo, durationMs, elapsedMs: 0 })
    startEngine(notes, slip.tempo, durationMs)
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
    setBackStack([])
    setScreen({ screen: 'editor', slipId })
  }

  function goToDashboard() {
    if (screen.screen !== 'dashboard') stopPlayback()
    setCurrentEditorSlip(null)
    setBackStack([])
    setScreen({ screen: 'dashboard' })
  }

  function handleCapture() {
    const slip = createSlip()
    openSlip(slip.id)
  }

  function handleOpenReference(currentSlipId: string, targetSlipId: string) {
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
      <TopNav onSlipBoxClick={goToDashboard} onCapture={handleCapture} />
      <main className="app-shell-body app-shell-body-flush">
        {screen.screen === 'dashboard' ? (
          <SlipDashboard onOpenSlip={openSlip} playingId={nowPlaying?.slipId ?? null} onTogglePlay={togglePlay} />
        ) : (
          <SlipEditor
            slipId={screen.slipId}
            onBack={handleEditorBack}
            onSlipChange={setCurrentEditorSlip}
            onStopPlayback={stopPlayback}
            onOpenReference={handleOpenReference}
            onCopySlip={openSlip}
          />
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
