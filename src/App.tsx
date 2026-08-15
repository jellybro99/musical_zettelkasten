import { useState } from 'react'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditor } from './components/SlipEditor'
import { TopNav } from './components/TopNav'

type Screen = { screen: 'dashboard' } | { screen: 'editor'; slipId: string }

function App() {
  const [screen, setScreen] = useState<Screen>({ screen: 'dashboard' })

  function openSlip(slipId: string) {
    setScreen({ screen: 'editor', slipId })
  }

  function goToDashboard() {
    setScreen({ screen: 'dashboard' })
  }

  return (
    <main>
      <TopNav onSlipBoxClick={goToDashboard} />
      {screen.screen === 'dashboard' ? (
        <SlipDashboard onOpenSlip={openSlip} />
      ) : (
        <SlipEditor slipId={screen.slipId} onBack={goToDashboard} />
      )}
    </main>
  )
}

export default App
