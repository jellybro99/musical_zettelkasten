import { useEffect, useState } from 'react'
import { SlipEditor } from './components/SlipEditor'
import { createSlip } from './domain/slip'
import { listSlips, saveSlip } from './persistence/slipStorage'

function App() {
  const [slipId, setSlipId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSlips()
      .then(async (slips) => {
        if (cancelled) return
        if (slips.length > 0) {
          setSlipId(slips[0].id)
          return
        }
        const slip = createSlip()
        await saveSlip(slip)
        if (!cancelled) setSlipId(slip.id)
      })
      .catch((error) => {
        console.error('Failed to load slips', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      <h1>MIDI Editor</h1>
      {slipId && <SlipEditor slipId={slipId} />}
    </main>
  )
}

export default App
