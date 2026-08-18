import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router'
import { createPlaybackEngine, type PlaybackEngine } from '../audio/playbackEngine'
import type { Arrangement } from '../domain/arrangement'
import { computeArrangementPlayback, computePlaybackDurationMs, type ArrangementNoteTrigger } from '../domain/playback'
import { createSlip, totalSteps, type Note, type Slip } from '../domain/slip'
import { PlaybackBar, type NowPlaying } from './PlaybackBar'
import { TopNav } from './TopNav'

export interface AppOutletContext {
  onStopPlayback: () => void
  onPreviewNote: (pitch: number, durationMs: number) => void
  onSlipChange: (slip: Slip) => void
  onArrangementChange: (state: { arrangement: Arrangement; slipsById: Map<string, Slip> }) => void
  playingSlipId: string | null
  onTogglePlaySlip: (slip: Slip) => void
  playingArrangementId: string | null
  onTogglePlayArrangement: (arrangement: Arrangement, slipsById: Map<string, Slip>) => void
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [currentEditorSlip, setCurrentEditorSlip] = useState<Slip | null>(null)
  const [currentArrangement, setCurrentArrangement] = useState<{
    arrangement: Arrangement
    slipsById: Map<string, Slip>
  } | null>(null)
  const [loop, setLoop] = useState(false)
  const engineRef = useRef<PlaybackEngine | null>(null)
  const loopRef = useRef(false)

  const editorMatch = matchPath('/slips/:slipId', location.pathname)
  const arrangementMatch = matchPath('/arrange/:arrangementId', location.pathname)

  function toggleLoop() {
    loopRef.current = !loopRef.current
    setLoop(loopRef.current)
  }

  const stopPlayback = useCallback(() => {
    engineRef.current?.stop()
    setNowPlaying(null)
  }, [])

  // Playback always stops the moment the user navigates to a different
  // screen; a single effect keyed on the route replaces the conditional
  // stopPlayback() calls that used to be repeated at every navigation
  // function.
  useEffect(() => {
    stopPlayback()
  }, [location.pathname, stopPlayback])

  const previewNote = useCallback((pitch: number, durationMs: number) => {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()
    engineRef.current.previewPitch(pitch, durationMs)
    setNowPlaying(null)
  }, [])

  function makeTriggerCallbacks(onEnded: () => void) {
    return {
      onTick: (elapsedMs: number) => setNowPlaying((prev) => (prev ? { ...prev, elapsedMs } : prev)),
      onEnded,
    }
  }

  function startEngine(notes: Note[], tempo: number, durationMs: number) {
    engineRef.current?.play(notes, tempo, {
      durationMs,
      ...makeTriggerCallbacks(() => {
        if (loopRef.current) {
          setNowPlaying((prev) => (prev ? { ...prev, elapsedMs: 0 } : prev))
          startEngine(notes, tempo, durationMs)
        } else {
          setNowPlaying(null)
        }
      }),
    })
  }

  function startArrangementTriggers(triggers: ArrangementNoteTrigger[], durationMs: number) {
    engineRef.current?.playTriggers(
      triggers,
      durationMs,
      makeTriggerCallbacks(() => {
        if (loopRef.current) {
          setNowPlaying((prev) => (prev ? { ...prev, elapsedMs: 0 } : prev))
          startArrangementTriggers(triggers, durationMs)
        } else {
          setNowPlaying(null)
        }
      }),
    )
  }

  function playSlip(slip: Slip) {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()

    const durationMs = computePlaybackDurationMs(slip.tempo, totalSteps(slip.grid))
    setNowPlaying({ kind: 'slip', slipId: slip.id, title: slip.title, tempo: slip.tempo, durationMs, elapsedMs: 0 })
    startEngine(slip.notes, slip.tempo, durationMs)
  }

  const togglePlaySlip = useCallback(
    (slip: Slip) => {
      if (nowPlaying?.kind === 'slip' && nowPlaying.slipId === slip.id) {
        stopPlayback()
      } else {
        playSlip(slip)
      }
    },
    [nowPlaying, stopPlayback],
  )

  function playArrangement(arrangement: Arrangement, slipsById: Map<string, Slip>) {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()

    const { triggers, durationMs } = computeArrangementPlayback(arrangement, slipsById)
    setNowPlaying({
      kind: 'arrangement',
      arrangementId: arrangement.id,
      title: arrangement.name,
      tempo: arrangement.tempo,
      durationMs,
      elapsedMs: 0,
    })
    startArrangementTriggers(triggers, durationMs)
  }

  const togglePlayArrangement = useCallback(
    (arrangement: Arrangement, slipsById: Map<string, Slip>) => {
      if (nowPlaying?.kind === 'arrangement' && nowPlaying.arrangementId === arrangement.id) {
        stopPlayback()
      } else {
        playArrangement(arrangement, slipsById)
      }
    },
    [nowPlaying, stopPlayback],
  )

  function handleCapture() {
    const slip = createSlip()
    navigate(`/slips/${slip.id}`, { state: { isNewCapture: true } })
  }

  function handleBarToggle() {
    if (nowPlaying) {
      stopPlayback()
    } else if (editorMatch && currentEditorSlip) {
      playSlip(currentEditorSlip)
    } else if (arrangementMatch && currentArrangement) {
      playArrangement(currentArrangement.arrangement, currentArrangement.slipsById)
    }
  }

  const outletContext = useMemo<AppOutletContext>(
    () => ({
      onStopPlayback: stopPlayback,
      onPreviewNote: previewNote,
      onSlipChange: setCurrentEditorSlip,
      onArrangementChange: setCurrentArrangement,
      playingSlipId: nowPlaying?.kind === 'slip' ? nowPlaying.slipId : null,
      onTogglePlaySlip: togglePlaySlip,
      playingArrangementId: nowPlaying?.kind === 'arrangement' ? nowPlaying.arrangementId : null,
      onTogglePlayArrangement: togglePlayArrangement,
    }),
    [stopPlayback, previewNote, nowPlaying, togglePlaySlip, togglePlayArrangement],
  )

  return (
    <div className="app-shell">
      <TopNav
        onSlipBoxClick={() => navigate('/slips')}
        onArrangeClick={() => navigate('/arrange')}
        onCapture={handleCapture}
        activeScreen={
          location.pathname.startsWith('/arrange') ? 'arrange' : location.pathname.startsWith('/desk') ? 'desk' : 'dashboard'
        }
      />
      <main className="app-shell-body app-shell-body-flush">
        <Outlet context={outletContext} />
      </main>
      <PlaybackBar
        nowPlaying={nowPlaying}
        canPlay={Boolean(editorMatch || arrangementMatch)}
        loop={loop}
        onToggle={handleBarToggle}
        onToggleLoop={toggleLoop}
      />
    </div>
  )
}
