import { computeTriggerTimes } from '../domain/playback'
import type { Note } from '../domain/slip'

const RELEASE_SECONDS = 0.02
const TICK_MS = 100

function midiToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

export interface PlaybackCallbacks {
  durationMs: number
  onTick: (elapsedMs: number) => void
  onEnded: () => void
}

export interface PlaybackEngine {
  play(notes: Note[], tempo: number, callbacks: PlaybackCallbacks): void
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

  function play(notes: Note[], tempo: number, { durationMs, onTick, onEnded }: PlaybackCallbacks) {
    stop()
    void context.resume()

    const startTime = context.currentTime
    activeGains = computeTriggerTimes(notes, tempo).map((trigger) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'triangle'
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

  return { play, stop }
}
