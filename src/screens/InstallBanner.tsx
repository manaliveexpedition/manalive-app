import { useEffect, useState } from 'react'
import { getInstallPrompt, clearInstallPrompt, subscribeInstall, isStandalone, isIOS } from '../lib/install'

// A small, optional "add to home screen" link (beta only — the real app will be
// downloadable later). Shown quietly at the bottom of the daily page in week one.
// Native prompt on Android/desktop Chrome; Share/menu steps otherwise. Hidden
// once the app is running installed (standalone).
export function InstallLink() {
  const [prompt, setPrompt] = useState(getInstallPrompt())
  const [showSteps, setShowSteps] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => subscribeInstall(() => setPrompt(getInstallPrompt())), [])

  if (isStandalone() || installed) return null

  const ios = isIOS()

  async function click() {
    if (prompt) {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      clearInstallPrompt()
      setPrompt(null)
      if (outcome === 'accepted') setInstalled(true)
      return
    }
    setShowSteps((v) => !v)
  }

  return (
    <div className="install-link-wrap">
      <button type="button" className="link install-link" onClick={click}>
        Add The Journey to your home screen
      </button>
      {showSteps && (
        <p className="install-ios">
          {ios ? (
            <>In Safari, tap the Share icon, then <strong>Add to Home Screen</strong>.</>
          ) : (
            <>Open your browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>
          )}
        </p>
      )}
    </div>
  )
}
