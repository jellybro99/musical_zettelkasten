import { ExternalLink, GripVertical, Plus, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  computeLoopMarks,
  NEW_TRACK,
  type Arrangement,
  type Clip,
  type MoveClipInput,
  type PlaceClipInput,
  type ResizeClipLoopInput,
} from '../domain/arrangement'
import type { Slip } from '../domain/slip'
import './ArrangementTimeline.css'

export const BAR_WIDTH = 48
export const TRACK_LABEL_WIDTH = 120
const TRACK_HEIGHT = 60
const RULER_HEIGHT = 24
const MIN_BARS = 16
const BAR_BUFFER = 4

interface DropPreview {
  trackId: string
  startBar: number
}

type ClipDragState =
  | { type: 'move'; clipId: string; startX: number; startY: number; origStartBar: number; origTrackId: string }
  | { type: 'resize'; clipId: string; startX: number; origLengthBars: number }

function computeBarCount(arrangement: Arrangement, extraBar: number): number {
  const clipEnds = arrangement.tracks.flatMap((track) => track.clips.map((clip) => clip.startBar + clip.lengthBars))
  return Math.max(MIN_BARS, extraBar, ...clipEnds) + BAR_BUFFER
}

export interface ArrangementTimelineProps {
  arrangement: Arrangement
  slipsById: Map<string, Slip>
  draggingSlip: Slip | null
  onPlaceClip: (input: PlaceClipInput) => void
  onDragEnd: () => void
  onMoveClip: (input: MoveClipInput) => void
  onResizeClipLoop: (input: ResizeClipLoopInput) => void
  onRemoveClip: (clipId: string) => void
  onRemoveTrack: (trackId: string) => void
  onAddTrack: () => void
  onRenameTrack: (trackId: string, name: string) => void
  onToggleMute: (trackId: string) => void
  onToggleSolo: (trackId: string) => void
  onOpenVariation: (clip: Clip) => void
  onOpenSlip: (clip: Clip) => void
}

export function ArrangementTimeline({
  arrangement,
  slipsById,
  draggingSlip,
  onPlaceClip,
  onDragEnd,
  onMoveClip,
  onResizeClipLoop,
  onRemoveClip,
  onRemoveTrack,
  onAddTrack,
  onRenameTrack,
  onToggleMute,
  onToggleSolo,
  onOpenVariation,
  onOpenSlip,
}: ArrangementTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<DropPreview | null>(null)
  const [preview, setPreview] = useState<DropPreview | null>(null)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const clipDragRef = useRef<ClipDragState | null>(null)

  // Rail → timeline placement drag: only active while a slip is being
  // dragged in from the search rail, so this effect attaches/detaches with it.
  useEffect(() => {
    if (!draggingSlip) return
    const slip = draggingSlip

    function handleMouseMove(event: MouseEvent) {
      const container = containerRef.current
      if (!container) return

      const rows = container.querySelectorAll<HTMLElement>('[data-track-row]')
      let targetTrackId: string | null = null
      for (const row of rows) {
        const rect = row.getBoundingClientRect()
        if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
          targetTrackId = row.dataset.trackId ?? null
          break
        }
      }

      if (!targetTrackId) {
        previewRef.current = null
        setPreview(null)
        return
      }

      const containerRect = container.getBoundingClientRect()
      const rawBar = (event.clientX - containerRect.left - TRACK_LABEL_WIDTH) / BAR_WIDTH
      const next = { trackId: targetTrackId, startBar: Math.max(0, Math.round(rawBar)) }
      previewRef.current = next
      setPreview(next)
    }

    function handleMouseUp() {
      const drop = previewRef.current
      if (drop) {
        onPlaceClip({ trackId: drop.trackId, slipId: slip.id, startBar: drop.startBar, slipBars: slip.grid.bars })
      }
      previewRef.current = null
      setPreview(null)
      onDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingSlip, onPlaceClip, onDragEnd])

  // Already-placed clip move/resize drag: a persistent listener (like
  // PianoRoll's note drag) that only acts while clipDragRef is set.
  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = clipDragRef.current
      const container = containerRef.current
      if (!drag || !container) return

      if (drag.type === 'move') {
        const deltaBars = Math.round((event.clientX - drag.startX) / BAR_WIDTH)
        const startBar = Math.max(0, drag.origStartBar + deltaBars)

        let targetTrackId = drag.origTrackId
        const rows = container.querySelectorAll<HTMLElement>('[data-track-row]')
        for (const row of rows) {
          const rect = row.getBoundingClientRect()
          if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
            const id = row.dataset.trackId
            if (id && id !== NEW_TRACK) targetTrackId = id
            break
          }
        }

        onMoveClip({ clipId: drag.clipId, trackId: targetTrackId, startBar })
      } else {
        const deltaBars = Math.round((event.clientX - drag.startX) / BAR_WIDTH)
        onResizeClipLoop({ clipId: drag.clipId, lengthBars: drag.origLengthBars + deltaBars })
      }
    }

    function handleMouseUp() {
      clipDragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onMoveClip, onResizeClipLoop])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (selectedClipId) {
        event.preventDefault()
        onRemoveClip(selectedClipId)
        setSelectedClipId(null)
      } else if (selectedTrackId) {
        event.preventDefault()
        onRemoveTrack(selectedTrackId)
        setSelectedTrackId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedTrackId, onRemoveClip, onRemoveTrack])

  function handleClipMouseDown(event: ReactMouseEvent, clip: Clip, trackId: string) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedClipId(clip.id)
    setSelectedTrackId(null)
    clipDragRef.current = {
      type: 'move',
      clipId: clip.id,
      startX: event.clientX,
      startY: event.clientY,
      origStartBar: clip.startBar,
      origTrackId: trackId,
    }
  }

  function handleResizeMouseDown(event: ReactMouseEvent, clip: Clip) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedClipId(clip.id)
    setSelectedTrackId(null)
    clipDragRef.current = { type: 'resize', clipId: clip.id, startX: event.clientX, origLengthBars: clip.lengthBars }
  }

  function handleTrackLabelClick(trackId: string) {
    setSelectedTrackId(trackId)
    setSelectedClipId(null)
  }

  const activePreview = draggingSlip ? preview : null
  const barCount = computeBarCount(
    arrangement,
    activePreview && draggingSlip ? activePreview.startBar + draggingSlip.grid.bars : 0,
  )
  // Rows/ruler are plain block boxes, not flex/grid items, so width:auto
  // sizes them to the scroll container's viewport, not their real content —
  // an explicit width (like the lane already gets) is required for their
  // background/border to reach all the way across when bars overflow.
  const rowWidth = TRACK_LABEL_WIDTH + barCount * BAR_WIDTH

  function renderDropOverlay(trackId: string) {
    if (!activePreview || !draggingSlip || activePreview.trackId !== trackId) return null
    return (
      <>
        <div className="arrangement-drop-marker" style={{ left: activePreview.startBar * BAR_WIDTH }} />
        <div
          className="arrangement-drop-ghost"
          style={{ left: activePreview.startBar * BAR_WIDTH, width: draggingSlip.grid.bars * BAR_WIDTH }}
        >
          {draggingSlip.title}
        </div>
      </>
    )
  }

  return (
    <div className="arrangement-timeline" ref={containerRef}>
      <div className="arrangement-timeline-ruler" style={{ height: RULER_HEIGHT, width: rowWidth }}>
        {Array.from({ length: barCount }, (_, bar) => (
          <span
            key={bar}
            className="arrangement-timeline-ruler-number"
            style={{ left: TRACK_LABEL_WIDTH + bar * BAR_WIDTH }}
          >
            {bar + 1}
          </span>
        ))}
      </div>

      {arrangement.tracks.map((track) => (
        <div
          key={track.id}
          className="arrangement-track-row"
          data-track-row
          data-track-id={track.id}
          style={{ height: TRACK_HEIGHT, width: rowWidth }}
        >
          <div
            className={`arrangement-track-label${track.id === selectedTrackId ? ' is-selected' : ''}`}
            style={{ width: TRACK_LABEL_WIDTH }}
            tabIndex={-1}
            onClick={() => handleTrackLabelClick(track.id)}
            onBlur={() => setSelectedTrackId((current) => (current === track.id ? null : current))}
          >
            <input
              type="text"
              className="arrangement-track-name-input"
              value={track.name}
              onChange={(event) => onRenameTrack(track.id, event.target.value)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Track name for ${track.name}`}
            />
            <div className="arrangement-track-controls">
              <button
                type="button"
                className={`arrangement-track-toggle${track.muted ? ' is-active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMute(track.id)
                }}
                aria-pressed={track.muted}
                aria-label={track.muted ? `Unmute ${track.name}` : `Mute ${track.name}`}
              >
                M
              </button>
              <button
                type="button"
                className={`arrangement-track-toggle${track.solo ? ' is-active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleSolo(track.id)
                }}
                aria-pressed={track.solo}
                aria-label={track.solo ? `Unsolo ${track.name}` : `Solo ${track.name}`}
              >
                S
              </button>
            </div>
          </div>
          <div className="arrangement-track-lane" style={{ width: barCount * BAR_WIDTH }}>
            {track.clips.map((clip) => {
              const slip = slipsById.get(clip.slipId)
              const loopMarks = slip ? computeLoopMarks(clip, slip.grid.bars) : []
              return (
                <div
                  key={clip.id}
                  className={`arrangement-clip${clip.id === selectedClipId ? ' is-selected' : ''}`}
                  style={{ left: clip.startBar * BAR_WIDTH, width: clip.lengthBars * BAR_WIDTH }}
                  onMouseDown={(event) => handleClipMouseDown(event, clip, track.id)}
                >
                  <GripVertical size={12} className="arrangement-clip-grip" />
                  <span className="arrangement-clip-title">{slip?.title ?? 'Missing slip'}</span>
                  {!!clip.transposeSemitones && (
                    <span className="arrangement-clip-transpose-badge">
                      {clip.transposeSemitones > 0 ? `+${clip.transposeSemitones}` : clip.transposeSemitones}
                    </span>
                  )}
                  {slip && (
                    <>
                      <button
                        type="button"
                        className="arrangement-clip-variation-btn"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => onOpenSlip(clip)}
                        aria-label={`Open ${slip.title}`}
                        title={`Open ${slip.title}`}
                      >
                        <ExternalLink size={11} />
                      </button>
                      <button
                        type="button"
                        className="arrangement-clip-variation-btn"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => onOpenVariation(clip)}
                        aria-label={`Make a variation from ${slip.title}`}
                        title="Make a variation"
                      >
                        <Wand2 size={11} />
                      </button>
                    </>
                  )}
                  {loopMarks.map((bar) => (
                    <div key={bar} className="arrangement-clip-loop-mark" style={{ left: bar * BAR_WIDTH }} />
                  ))}
                  <div
                    className="arrangement-clip-resize-handle"
                    onMouseDown={(event) => handleResizeMouseDown(event, clip)}
                  />
                </div>
              )
            })}
            {renderDropOverlay(track.id)}
          </div>
        </div>
      ))}

      <div
        className="arrangement-track-row arrangement-new-track-row"
        data-track-row
        data-track-id={NEW_TRACK}
        style={{ height: TRACK_HEIGHT, width: rowWidth }}
      >
        <div className="arrangement-track-label" style={{ width: TRACK_LABEL_WIDTH }}>
          <button
            type="button"
            className="arrangement-add-track-btn"
            onClick={onAddTrack}
            aria-label="Add new track"
            title="Add new track"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="arrangement-track-lane" style={{ width: barCount * BAR_WIDTH }}>
          {renderDropOverlay(NEW_TRACK)}
        </div>
      </div>
    </div>
  )
}
