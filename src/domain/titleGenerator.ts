const ADJECTIVES = [
  'Hazy',
  'Velvet',
  'Restless',
  'Crooked',
  'Fading',
  'Glass',
  'Molten',
  'Quiet',
  'Wandering',
  'Amber',
  'Smoky',
  'Feral',
  'Distant',
  'Tangled',
  'Hollow',
  'Neon',
]

const NOUNS = [
  'Riverbed',
  'Circuit',
  'Fable',
  'Static',
  'Orbit',
  'Ember',
  'Corridor',
  'Signal',
  'Thicket',
  'Wavelength',
  'Lantern',
  'Horizon',
  'Echo',
  'Fracture',
  'Tide',
  'Compass',
]

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateSlipTitle(seed: number): string {
  const random = mulberry32(seed)
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(random() * NOUNS.length)]
  return `${adjective} ${noun}`
}
