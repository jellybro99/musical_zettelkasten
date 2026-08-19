import type { Arrangement, Track } from './arrangement'
import { getInstrument, type Waveform } from './instrument'
import { STEPS_PER_BEAT } from './playback'
import type { Slip } from './slip'

const PPQ = 480
const TICKS_PER_STEP = PPQ / STEPS_PER_BEAT
const MICROSECONDS_PER_MINUTE = 60_000_000

// Channel 9 is the General MIDI percussion channel — skipped so pitched
// tracks never get reinterpreted as a drum kit by the receiving DAW.
const PERCUSSION_CHANNEL = 9
const CHANNEL_COUNT = 16

function channelForTrackIndex(index: number): number {
  const usable = index % (CHANNEL_COUNT - 1)
  return usable >= PERCUSSION_CHANNEL ? usable + 1 : usable
}

interface MidiNoteEvent {
  tick: number
  type: 'on' | 'off'
  pitch: number
  velocity: number
  // Instrument lives on the Slip now, so different clips on the same Track
  // can carry different instruments — only set on 'on' events, since that's
  // the only place a program change is needed.
  instrument?: Waveform
}

// Mirrors computeArrangementPlayback's repeat/transpose logic (domain/playback.ts)
// but in steps/ticks rather than seconds, since a MIDI file is scheduled in ticks.
function trackNoteEvents(track: Track, slipsById: Map<string, Slip>): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = []

  for (const clip of track.clips) {
    const slip = slipsById.get(clip.slipId)
    if (!slip) continue

    const stepsPerBar = slip.grid.stepsPerBar
    const slipSteps = slip.grid.bars * stepsPerBar
    const clipSteps = clip.lengthBars * stepsPerBar
    const clipStartTick = clip.startBar * stepsPerBar * TICKS_PER_STEP
    if (slipSteps <= 0) continue

    for (let offsetSteps = 0; offsetSteps < clipSteps; offsetSteps += slipSteps) {
      for (const note of slip.notes) {
        const start = note.start + offsetSteps
        if (start >= clipSteps) continue
        const pitch = clip.transposeSemitones
          ? Math.min(127, Math.max(0, note.pitch + clip.transposeSemitones))
          : note.pitch
        // Matches computeArrangementPlayback: only a note's start is bounds-checked
        // against the clip, its length is never truncated at the clip edge.
        const startTick = clipStartTick + start * TICKS_PER_STEP
        const endTick = clipStartTick + (start + note.length) * TICKS_PER_STEP
        const velocity = Math.min(127, Math.max(1, Math.round(note.velocity * 127)))
        events.push({ tick: startTick, type: 'on', pitch, velocity, instrument: slip.instrument })
        events.push({ tick: endTick, type: 'off', pitch, velocity: 0 })
      }
    }
  }

  return events.sort((a, b) => a.tick - b.tick || (a.type === 'off' ? -1 : 1))
}

// The track's own instrument, used for the header program change written
// before any notes: the earliest clip's slip, by start bar.
function leadInstrument(track: Track, slipsById: Map<string, Slip>): Waveform | undefined {
  const sortedClips = [...track.clips].sort((a, b) => a.startBar - b.startBar)
  for (const clip of sortedClips) {
    const slip = slipsById.get(clip.slipId)
    if (slip) return slip.instrument
  }
  return undefined
}

function writeVarLen(value: number): number[] {
  let buffer = value & 0x7f
  let remaining = value >> 7
  const bytes: number[] = []
  while (remaining > 0) {
    buffer = (buffer << 8) | 0x80 | (remaining & 0x7f)
    remaining >>= 7
  }
  while (true) {
    bytes.push(buffer & 0xff)
    if (buffer & 0x80) buffer >>= 8
    else break
  }
  return bytes
}

function trackNameBytes(name: string): number[] {
  const nameBytes = Array.from(new TextEncoder().encode(name))
  return [0x00, 0xff, 0x03, ...writeVarLen(nameBytes.length), ...nameBytes]
}

function buildTrackChunk(track: Track, slipsById: Map<string, Slip>, channel: number): number[] {
  const events = trackNoteEvents(track, slipsById)
  let currentProgram = getInstrument(leadInstrument(track, slipsById)).gmProgram
  const data: number[] = [...trackNameBytes(track.name), 0x00, 0xc0 | channel, currentProgram]

  let lastTick = 0
  for (const event of events) {
    const delta = Math.max(0, Math.round(event.tick - lastTick))

    // A clip's slip can carry a different instrument than the track's lead
    // one — insert a program change right before the note-on that needs it.
    if (event.type === 'on') {
      const program = getInstrument(event.instrument).gmProgram
      if (program !== currentProgram) {
        data.push(...writeVarLen(delta), 0xc0 | channel, program)
        currentProgram = program
        data.push(...writeVarLen(0), 0x90 | channel, event.pitch, event.velocity)
        lastTick = event.tick
        continue
      }
    }

    const status = (event.type === 'on' ? 0x90 : 0x80) | channel
    data.push(...writeVarLen(delta), status, event.pitch, event.velocity)
    lastTick = event.tick
  }
  data.push(0x00, 0xff, 0x2f, 0x00)

  return [0x4d, 0x54, 0x72, 0x6b, ...uint32Bytes(data.length), ...data]
}

function buildTempoChunk(tempoBpm: number): number[] {
  const microsecondsPerQuarter = Math.round(MICROSECONDS_PER_MINUTE / tempoBpm)
  const data = [
    0x00,
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
    0x00,
    0xff,
    0x2f,
    0x00,
  ]
  return [0x4d, 0x54, 0x72, 0x6b, ...uint32Bytes(data.length), ...data]
}

function uint32Bytes(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

// Standard MIDI File, format 1: one tempo-only track followed by one track
// per arrangement Track. All tracks are included regardless of mute/solo —
// those are a playback-time concern, and muting is left to the destination DAW.
export function arrangementToMidiBytes(arrangement: Arrangement, slipsById: Map<string, Slip>) {
  const trackChunks = arrangement.tracks.map((track, index) =>
    buildTrackChunk(track, slipsById, channelForTrackIndex(index)),
  )
  const trackCount = 1 + trackChunks.length

  const header = [
    0x4d,
    0x54,
    0x68,
    0x64,
    ...uint32Bytes(6),
    0x00,
    0x01,
    (trackCount >> 8) & 0xff,
    trackCount & 0xff,
    (PPQ >> 8) & 0xff,
    PPQ & 0xff,
  ]

  const bytes = [...header, ...buildTempoChunk(arrangement.tempo), ...trackChunks.flat()]
  return new Uint8Array(bytes)
}

export function arrangementMidiFilename(arrangement: Arrangement): string {
  const slug = arrangement.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'arrangement'}.mid`
}
