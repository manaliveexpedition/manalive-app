import { useEffect, useState } from 'react'
import { getInstallPrompt, clearInstallPrompt, subscribeInstall, isStandalone, isIOS } from '../lib/install'

const DISMISS_KEY = 'a2hs-dismissed'

// A dismissible "Add to Home Screen" banner. On Android/desktop it triggers the
// native install prompt; on iOS it shows the Share -> Add to Home Screen steps.
// After install it tells the man where to find the icon (in case his home
// screen is full and the icon lands in the app drawer / App Library).
export function InstallBanner() {
  const [prompt, setPrompt] = useState(getInstallPrompt())
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => subscribeInstall(() => setPrompt(getInstallPrompt())), [])

  const ios = isIOS()

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    if (ios) { setShowIosHelp((v) => !v); return }
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    clearInstallPrompt()
    setPrompt(null)
    if (outcome === 'accepted') setInstalled(true)
  }

  if (isStandalone() || dismissed) return null

  if (installed) {
    return (
      <div className="install-banner">
        <button type="button" className="install-x" onClick={dismiss} aria-label="Dismiss">×</button>
        <p className="install-text">
          Added. If you don't see it on your home screen, check your app drawer (Android) or
          App Library (iPhone) — your home screen may be full.
        </p>
      </div>
    )
  }

  // Nothing to offer on a non-iOS browser that hasn't signaled installability.
  if (!ios && !prompt) return null

  return (
    <div className="install-banner">
      <button type="button" className="install-x" onClick={dismiss} aria-label="Dismiss">×</button>
      <p className="install-text">Put The Journey on your home screen so it opens like an app.</p>
      <button type="button" className="install-cta" onClick={install}>
        {ios ? 'How to add it' : 'Add to Home Screen'}
      </button>
      {ios && showIosHelp && (
        <p className="install-ios">
          In Safari, tap the Share icon (the square with an up arrow), then choose{' '}
          <strong>Add to Home Screen</strong>. If your home screen is full it goes to your App Library.
        </p>
      )}
    </div>
  )
}
