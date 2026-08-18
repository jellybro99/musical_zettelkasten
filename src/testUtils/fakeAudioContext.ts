// jsdom has no Web Audio implementation. This stub covers just the surface
// playbackEngine.ts touches, so tests that trigger playback (to then assert
// it stops) don't need a real audio backend.
class FakeAudioParam {
  value = 0
  cancelScheduledValues() {}
  setValueAtTime() {}
  linearRampToValueAtTime() {}
}

class FakeAudioNode {
  connect() {
    return this
  }
}

class FakeOscillatorNode extends FakeAudioNode {
  type = 'sine'
  frequency = new FakeAudioParam()
  onended: (() => void) | null = null
  start() {}
  stop() {}
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam()
}

export class FakeAudioContext {
  currentTime = 0
  destination = new FakeAudioNode()
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    return new FakeOscillatorNode()
  }
  createGain() {
    return new FakeGainNode()
  }
}

export function installFakeAudioContext() {
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext
}
