import { useEffect, useState } from 'react'
import { getInstallPrompt, clearInstallPrompt, subscribeInstall, isStandalone, isIOS } from '../lib/install'

const DISMISS_KEY = 'a2hs-dismissed'

// A dismissible "Add to Home Screen" banner. On Android/desktop it triggers the
// native install prompt; on iOS it shows the Share -> Add to Home Screen steps.
export function InstallBanner() {
  const [prompt, setPrompt] = useState(getInstallPrompt())
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => subscribeInstall(() => setPrompt(getInstallPrompt())), [])

  // Already installed (running standalone) or the man dismissed it.
  if (isStandalone() || dismissed) return null

  const ios = isIOS()
  // Nothing to offer on a non-iOS browser that hasn't signaled installability.
  if (!ios && !prompt) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    if (ios) { setShowIosHelp((v) => !v); return }
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    clearInstallPrompt()
    setPrompt(null)
  }

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
          <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  )
}
