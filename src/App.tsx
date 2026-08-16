import { useState } from 'react'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditor } from './components/SlipEditor'
import { TopNav } from './components/TopNav'
import { createSlip } from './domain/slip'

type Screen = { screen: 'dashboard' } | { screen: 'editor'; slipId: string }

function App() {
  const [screen, setScreen] = useState<Screen>({ screen: 'dashboard' })

  function openSlip(slipId: string) {
    setScreen({ screen: 'editor', slipId })
  }

  function goToDashboard() {
    setScreen({ screen: 'dashboard' })
  }

  function handleCapture() {
    const slip = createSlip()
    openSlip(slip.id)
  }

  return (
    <div className="app-shell">
      <TopNav onSlipBoxClick={goToDashboard} onCapture={handleCapture} />
      <main className="app-shell-body">
        {screen.screen === 'dashboard' ? (
          <SlipDashboard onOpenSlip={openSlip} />
        ) : (
          <SlipEditor slipId={screen.slipId} onBack={goToDashboard} />
        )}
      </main>
    </div>
  )
}

export default App
