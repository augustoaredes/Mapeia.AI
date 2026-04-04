import type { Metadata, Viewport } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mapeia.AI — Transforme fotos de drone em mapa',
  description:
    'Envie suas fotos de drone e receba um mapa profissional em minutos. Sem instalar nada. Sem complicação.',
  keywords: 'mapa drone, ortomosaico, fotogrametria, mapas aéreos, SaaS',
  openGraph: {
    title: 'Mapeia.AI',
    description: 'Transforme fotos de drone em mapa em minutos',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        {children}

        <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-brand font-bold text-lg">Mapeia.AI</span>
              <span className="text-slate-600 text-xs">© {new Date().getFullYear()}</span>
            </div>
            <nav className="flex gap-6 text-sm text-slate-500">
              <Link href="/terms"   className="hover:text-slate-200 transition-colors cursor-pointer">Termos de Uso</Link>
              <Link href="/privacy" className="hover:text-slate-200 transition-colors cursor-pointer">Privacidade</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}
