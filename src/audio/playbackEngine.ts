import { getInstrument, type Waveform } from '../domain/instrument'
import { computeTriggerTimes, type NoteTrigger } from '../domain/playback'
import type { Note } from '../domain/slip'

const RELEASE_SECONDS = 0.02
const TICK_MS = 100

function midiToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

export interface TriggerCallbacks {
  onTick: (elapsedMs: number) => void
  onEnded: () => void
}

export interface PlaybackCallbacks extends TriggerCallbacks {
  durationMs: number
}

export interface PlaybackEngine {
  play(notes: Note[], tempo: number, instrument: Waveform | undefined, callbacks: PlaybackCallbacks): void
  playTriggers(triggers: NoteTrigger[], durationMs: number, callbacks: TriggerCallbacks): void
  previewPitch(pitch: number, durationMs: number, instrument?: Waveform): void
  stop(): void
}

export function createPlaybackEngine(context: AudioContext = new AudioContext()): PlaybackEngine {
  let activeGains: GainNode[] = []
  let endMarker: OscillatorNode | null = null
  let tickInterval: ReturnType<typeof setInterval> | null = null

  function clearTick() {
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
  }

  function clearEndMarker() {
    if (endMarker) {
      endMarker.onended = null
      endMarker = null
    }
  }

  // Oscillators already carry their own scheduled stop() from play(), so
  // stop() only silences via the gain envelope — calling osc.stop() a
  // second time here would conflict with that schedule.
  function stop() {
    clearTick()
    clearEndMarker()
    const now = context.currentTime
    for (const gain of activeGains) {
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS)
    }
    activeGains = []
  }

  // Single scheduling implementation: single-slip playback and arrangement
  // playback both reduce to "a flat list of note triggers plus a total
  // duration" before reaching here, regardless of how many slips they came from.
  function playTriggers(triggers: NoteTrigger[], durationMs: number, { onTick, onEnded }: TriggerCallbacks) {
    stop()
    void context.resume()

    const startTime = context.currentTime
    activeGains = triggers.map((trigger) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = getInstrument(trigger.instrument).waveform
      osc.frequency.value = midiToFrequency(trigger.pitch)
      gain.gain.value = trigger.velocity
      osc.connect(gain).connect(context.destination)
      osc.start(startTime + trigger.time)
      osc.stop(startTime + trigger.time + trigger.duration)
      return gain
    })

    // A silent oscillator scheduled to stop at durationMs is playback's own
    // end-of-schedule signal — onended fires off the real audio clock, not a
    // parallel guess (setTimeout/setInterval) about when that clock gets there.
    const marker = context.createOscillator()
    marker.frequency.value = 0
    marker.start(startTime)
    marker.stop(startTime + durationMs / 1000)
    marker.onended = () => {
      clearTick()
      clearEndMarker()
      activeGains = []
      onTick(durationMs)
      onEnded()
    }
    endMarker = marker

    tickInterval = setInterval(() => {
      const elapsedMs = (context.currentTime - startTime) * 1000
      onTick(Math.min(elapsedMs, durationMs))
    }, TICK_MS)
  }

  function play(notes: Note[], tempo: number, instrument: Waveform | undefined, { durationMs, onTick, onEnded }: PlaybackCallbacks) {
    const triggers = computeTriggerTimes(notes, tempo).map((trigger) => ({ ...trigger, instrument }))
    playTriggers(triggers, durationMs, { onTick, onEnded })
  }

  // A single-voice audition, independent of the notes/tempo playback schedule —
  // stop() first guarantees monophony (cuts off any prior preview) and that a
  // preview always interrupts full-slip playback.
  function previewPitch(pitch: number, durationMs: number, instrument?: Waveform) {
    stop()
    void context.resume()

    const startTime = context.currentTime
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = getInstrument(instrument).waveform
    osc.frequency.value = midiToFrequency(pitch)
    gain.gain.value = 1
    osc.connect(gain).connect(context.destination)
    osc.start(startTime)
    osc.stop(startTime + durationMs / 1000)
    activeGains = [gain]
  }

  return { play, playTriggers, previewPitch, stop }
}
