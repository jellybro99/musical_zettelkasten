// Waveform names double as the Web Audio OscillatorType used for playback,
// so no separate mapping table is needed between the two.
export type Waveform = 'triangle' | 'sine' | 'square' | 'sawtooth'

export interface Instrument {
  id: Waveform
  label: string
  waveform: Waveform
  // General MIDI program number (0-127), used when exporting an arrangement
  // to a .mid file so each track opens in another DAW under a roughly
  // matching patch instead of the GM default (0, Acoustic Grand Piano).
  gmProgram: number
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'triangle', label: 'Soft Lead', waveform: 'triangle', gmProgram: 73 },
  { id: 'sine', label: 'Sub Bass', waveform: 'sine', gmProgram: 38 },
  { id: 'square', label: 'Chip Lead', waveform: 'square', gmProgram: 80 },
  { id: 'sawtooth', label: 'Bright Saw', waveform: 'sawtooth', gmProgram: 81 },
]

export const DEFAULT_INSTRUMENT_ID: Waveform = 'triangle'

const INSTRUMENTS_BY_ID = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]))

export function getInstrument(id: Waveform | undefined): Instrument {
  return (id && INSTRUMENTS_BY_ID.get(id)) || INSTRUMENTS_BY_ID.get(DEFAULT_INSTRUMENT_ID)!
}
