import { computeTriggerTimes } from '../domain/playback'
import type { Note } from '../domain/slip'

const RELEASE_SECONDS = 0.02

function midiToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

export interface PlaybackEngine {
  play(notes: Note[], tempo: number): void
  stop(): void
}

export function createPlaybackEngine(context: AudioContext = new AudioContext()): PlaybackEngine {
  let activeGains: GainNode[] = []

  // Oscillators already carry their own scheduled stop() from play(), so
  // stop() only silences via the gain envelope — calling osc.stop() a
  // second time here would conflict with that schedule.
  function stop() {
    const now = context.currentTime
    for (const gain of activeGains) {
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS)
    }
    activeGains = []
  }

  function play(notes: Note[], tempo: number) {
    stop()
    void context.resume()

    const now = context.currentTime
    activeGains = computeTriggerTimes(notes, tempo).map((trigger) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'triangle'
      osc.frequency.value = midiToFrequency(trigger.pitch)
      gain.gain.value = trigger.velocity
      osc.connect(gain).connect(context.destination)
      osc.start(now + trigger.time)
      osc.stop(now + trigger.time + trigger.duration)
      return gain
    })
  }

  return { play, stop }
}
