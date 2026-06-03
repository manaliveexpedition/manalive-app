import { useEffect, useState } from 'react'
import { getInstallPrompt, clearInstallPrompt, subscribeInstall, isStandalone, isIOS } from '../lib/install'

const DISMISS_KEY = 'a2hs-dismissed'

// "Install the app" call to action. Always offers an install path so it works
// from the first screen:
//   - native one-tap prompt when the browser has signaled it's ready (Android/desktop Chrome)
//   - iOS Safari steps (Apple has no install API)
//   - otherwise, generic "use the browser menu" steps as a fallback
// Hidden once the app is installed (running standalone) or dismissed.
export function InstallBanner() {
  const [prompt, setPrompt] = useState(getInstallPrompt())
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [showSteps, setShowSteps] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => subscribeInstall(() => setPrompt(getInstallPrompt())), [])

  const ios = isIOS()

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function clickInstall() {
    if (prompt) {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      clearInstallPrompt()
      setPrompt(null)
      if (outcome === 'accepted') setInstalled(true)
      return
    }
    // No native prompt available yet: reveal manual steps.
    setShowSteps((v) => !v)
  }

  if (isStandalone() || dismissed) return null

  if (installed) {
    return (
      <div className="install-banner">
        <button type="button" className="install-x" onClick={dismiss} aria-label="Dismiss">×</button>
        <p className="install-text">
          Installed. Open <strong>The Journey</strong> from your home screen or app drawer to keep going
          — if it's not on your home screen, your screen may be full and it's in the app drawer / App Library.
        </p>
      </div>
    )
  }

  return (
    <div className="install-banner">
      <button type="button" className="install-x" onClick={dismiss} aria-label="Dismiss">×</button>
      <p className="install-text">Install The Journey on your phone so it opens like an app.</p>
      <button type="button" className="install-cta" onClick={clickInstall}>
        Install the app
      </button>
      {showSteps && (
        <p className="install-ios">
          {ios ? (
            <>In Safari, tap the Share icon (the square with an up arrow), then choose <strong>Add to Home Screen</strong>.</>
          ) : (
            <>Open your browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>
          )}
        </p>
      )}
    </div>
  )
}
