import { describe, expect, it } from 'vitest'
import { addTrack, createArrangement, placeClip, setClipTranspose } from './arrangement'
import { arrangementMidiFilename, arrangementToMidiBytes } from './midiExport'
import { createSlip, DEFAULT_GRID, type Note, type Slip } from './slip'

function note(overrides: Partial<Note>): Note {
  return { id: 'n1', pitch: 60, start: 0, length: 4, velocity: 0.8, ...overrides }
}

function slip(overrides: Partial<Slip>): Slip {
  return createSlip({ tempo: 120, grid: DEFAULT_GRID, ...overrides })
}

// Minimal Standard MIDI File reader, just enough to assert on what
// arrangementToMidiBytes produced without hardcoding raw byte offsets.
function readVarLen(bytes: Uint8Array, offset: number): { value: number; next: number } {
  let value = 0
  let index = offset
  while (true) {
    const byte = bytes[index]
    value = (value << 7) | (byte & 0x7f)
    index += 1
    if (!(byte & 0x80)) break
  }
  return { value, next: index }
}

interface ParsedNoteEvent {
  tick: number
  type: 'on' | 'off'
  pitch: number
  velocity: number
}

interface ParsedTrack {
  name: string
  program: number
  channel: number
  events: ParsedNoteEvent[]
}

function parseMidi(bytes: Uint8Array): { trackCount: number; ppq: number; tempoMicroseconds: number; tracks: ParsedTrack[] } {
  const trackCount = (bytes[10] << 8) | bytes[11]
  const ppq = (bytes[12] << 8) | bytes[13]

  let offset = 14
  let tempoMicroseconds = 0
  const tracks: ParsedTrack[] = []

  for (let chunkIndex = 0; chunkIndex < trackCount; chunkIndex++) {
    offset += 4 // 'MTrk'
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
    offset += 4
    const end = offset + length

    let name = ''
    let program = -1
    let channel = -1
    let tick = 0
    const events: ParsedNoteEvent[] = []

    while (offset < end) {
      const { value: delta, next } = readVarLen(bytes, offset)
      offset = next
      tick += delta

      const status = bytes[offset]
      if (status === 0xff) {
        const metaType = bytes[offset + 1]
        const { value: len, next: dataStart } = readVarLen(bytes, offset + 2)
        if (metaType === 0x03) name = new TextDecoder().decode(bytes.slice(dataStart, dataStart + len))
        if (metaType === 0x51) {
          tempoMicroseconds = (bytes[dataStart] << 16) | (bytes[dataStart + 1] << 8) | bytes[dataStart + 2]
        }
        offset = dataStart + len
      } else if ((status & 0xf0) === 0xc0) {
        program = bytes[offset + 1]
        channel = status & 0x0f
        offset += 2
      } else if ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80) {
        channel = status & 0x0f
        events.push({
          tick,
          type: (status & 0xf0) === 0x90 ? 'on' : 'off',
          pitch: bytes[offset + 1],
          velocity: bytes[offset + 2],
        })
        offset += 3
      } else {
        throw new Error(`Unexpected status byte 0x${status.toString(16)} at offset ${offset}`)
      }
    }

    // Chunk 0 is always the tempo-only track written by arrangementToMidiBytes.
    if (chunkIndex > 0) tracks.push({ name, program, channel, events })
  }

  return { trackCount, ppq, tempoMicroseconds, tracks }
}

describe('arrangementToMidiBytes', () => {
  it('writes a header plus one tempo track for an arrangement with no tracks', () => {
    const arrangement = createArrangement({ tempo: 120 })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, new Map()))

    expect(parsed.trackCount).toBe(1)
    expect(parsed.ppq).toBe(480)
    expect(parsed.tempoMicroseconds).toBe(500_000) // 60_000_000 / 120 bpm
  })

  it('writes one MIDI track per arrangement track, named to match', () => {
    let arrangement = addTrack(addTrack(createArrangement(), { name: 'Bass' }), { name: 'Lead' })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, new Map()))

    expect(parsed.trackCount).toBe(3) // tempo track + 2 arrangement tracks
    expect(parsed.tracks.map((t) => t.name)).toEqual(['Bass', 'Lead'])
  })

  it('writes the earliest clip\'s slip instrument as a General MIDI program change', () => {
    const slipA = slip({ instrument: 'square', notes: [note({ start: 0 })] })
    const slipsById = new Map([[slipA.id, slipA]])
    let arrangement = addTrack(createArrangement())
    arrangement = placeClip(arrangement, { trackId: arrangement.tracks[0].id, slipId: slipA.id, startBar: 0, slipBars: 2 })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, slipsById))

    expect(parsed.tracks[0].program).toBe(80) // GM Lead 1 (square)
  })

  it('inserts a program change when a later clip on the same track uses a different instrument', () => {
    const slipA = slip({ instrument: 'square', notes: [note({ id: 'a', start: 0, length: 2, pitch: 60 })] })
    const slipB = slip({ instrument: 'sine', notes: [note({ id: 'b', start: 0, length: 2, pitch: 62 })] })
    const slipsById = new Map([
      [slipA.id, slipA],
      [slipB.id, slipB],
    ])
    let arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id
    arrangement = placeClip(arrangement, { trackId, slipId: slipA.id, startBar: 0, slipBars: 2 })
    arrangement = placeClip(arrangement, { trackId, slipId: slipB.id, startBar: 2, slipBars: 2 })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, slipsById))
    const onEvents = parsed.tracks[0].events.filter((event) => event.type === 'on')

    // Both note-on events still made it through despite the program change
    // inserted between them.
    expect(onEvents.map((event) => event.pitch)).toEqual([60, 62])
    // The last program change written reflects the second clip's instrument.
    expect(parsed.tracks[0].program).toBe(38) // GM Synth Bass 1 (sine)
  })

  it('emits a note-on/note-off pair per note, at the tick the note starts and ends', () => {
    const slipA = slip({ notes: [note({ start: 0, length: 4, pitch: 64, velocity: 1 })] })
    const slipsById = new Map([[slipA.id, slipA]])
    let arrangement = addTrack(createArrangement())
    arrangement = placeClip(arrangement, { trackId: arrangement.tracks[0].id, slipId: slipA.id, startBar: 0, slipBars: 2 })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, slipsById))
    const [track] = parsed.tracks

    // PPQ 480 / 4 steps-per-beat = 120 ticks/step; a 4-step note starts at
    // tick 0 and ends at tick 480.
    expect(track.events).toEqual([
      { tick: 0, type: 'on', pitch: 64, velocity: 127 },
      { tick: 480, type: 'off', pitch: 64, velocity: 0 },
    ])
  })

  it('applies a clip\'s transpose to exported note pitches', () => {
    const slipA = slip({ notes: [note({ start: 0, length: 4, pitch: 64 })] })
    const slipsById = new Map([[slipA.id, slipA]])
    let arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id
    arrangement = placeClip(arrangement, { trackId, slipId: slipA.id, startBar: 0, slipBars: 2 })
    const clipId = arrangement.tracks[0].clips[0].id
    arrangement = setClipTranspose(arrangement, { clipId, semitones: 3 })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, slipsById))

    expect(parsed.tracks[0].events[0]).toMatchObject({ pitch: 67 })
  })

  it('skips the General MIDI percussion channel (9) when assigning track channels', () => {
    let arrangement = createArrangement()
    for (let i = 0; i < 10; i++) arrangement = addTrack(arrangement, { name: `T${i}` })

    const parsed = parseMidi(arrangementToMidiBytes(arrangement, new Map()))

    // Program-change events assign the channel; with 10 pitched tracks and
    // channel 9 reserved for percussion, channels 0-8 and 10 are used.
    expect(parsed.tracks.map((t) => t.channel)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10])
  })
})

describe('arrangementMidiFilename', () => {
  it('slugifies the arrangement name into a .mid filename', () => {
    expect(arrangementMidiFilename(createArrangement({ name: 'My Song!! (Live Mix)' }))).toBe(
      'my-song-live-mix.mid',
    )
  })

  it('falls back to "arrangement" when the name has no usable characters', () => {
    expect(arrangementMidiFilename(createArrangement({ name: '   ' }))).toBe('arrangement.mid')
  })
})
