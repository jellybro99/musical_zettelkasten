import { useEffect, useRef, useState } from 'react'
import { NEW_TRACK, type Arrangement, type PlaceClipInput } from '../domain/arrangement'
import type { Slip } from '../domain/slip'
import './ArrangementTimeline.css'

export const BAR_WIDTH = 48
export const TRACK_LABEL_WIDTH = 120
const TRACK_HEIGHT = 56
const RULER_HEIGHT = 24
const MIN_BARS = 16
const BAR_BUFFER = 4

interface DropPreview {
  trackId: string
  startBar: number
}

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
}

export function ArrangementTimeline({
  arrangement,
  slipsById,
  draggingSlip,
  onPlaceClip,
  onDragEnd,
}: ArrangementTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<DropPreview | null>(null)
  const [preview, setPreview] = useState<DropPreview | null>(null)

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

  const activePreview = draggingSlip ? preview : null
  const barCount = computeBarCount(
    arrangement,
    activePreview && draggingSlip ? activePreview.startBar + draggingSlip.grid.bars : 0,
  )

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
      <div className="arrangement-timeline-ruler" style={{ height: RULER_HEIGHT }}>
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
          style={{ height: TRACK_HEIGHT }}
        >
          <div className="arrangement-track-label" style={{ width: TRACK_LABEL_WIDTH }}>
            {track.name}
          </div>
          <div className="arrangement-track-lane" style={{ width: barCount * BAR_WIDTH }}>
            {track.clips.map((clip) => {
              const slip = slipsById.get(clip.slipId)
              return (
                <div
                  key={clip.id}
                  className="arrangement-clip"
                  style={{ left: clip.startBar * BAR_WIDTH, width: clip.lengthBars * BAR_WIDTH }}
                >
                  {slip?.title ?? 'Missing slip'}
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
        style={{ height: TRACK_HEIGHT }}
      >
        <div className="arrangement-track-label" style={{ width: TRACK_LABEL_WIDTH }}>
          + New track
        </div>
        <div className="arrangement-track-lane" style={{ width: barCount * BAR_WIDTH }}>
          {renderDropOverlay(NEW_TRACK)}
        </div>
      </div>
    </div>
  )
}
