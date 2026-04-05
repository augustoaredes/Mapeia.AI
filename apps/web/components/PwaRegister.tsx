'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Registra o Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.log('[PWA] SW registrado:', reg.scope))
        .catch((err) => console.warn('[PWA] Falha no SW:', err))
    }

    // Captura o prompt de instalação nativo
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)

      // Mostra banner só se não foi dispensado antes
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt()
    setShowBanner(false)
    setInstallPrompt(null)
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in">
      <div className="glass rounded-2xl border border-slate-700/60 p-4 shadow-modal flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm">Instalar Mapeia.AI</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Adicione à tela inicial para acesso rápido, mesmo sem internet.
          </p>
          <button
            onClick={handleInstall}
            className="mt-2.5 bg-brand text-slate-900 font-semibold text-xs px-4 py-1.5 rounded-lg hover:bg-green-400 transition-colors cursor-pointer"
          >
            Instalar agora
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
