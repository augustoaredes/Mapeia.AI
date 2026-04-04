import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mapeia.AI — Transforme fotos de drone em mapa',
  description:
    'Envie suas fotos de drone e receba um mapa profissional em minutos. Sem instalar nada. Sem complicação.',
  keywords: 'mapa drone, ortomosaico, fotogrametria, mapas aéreos',
  openGraph: {
    title: 'Mapeia.AI',
    description: 'Transforme fotos de drone em mapa em minutos',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-gray-900 antialiased">
        {children}
        <footer className="bg-gray-900 text-gray-400 py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} Mapeia.AI. Todos os direitos reservados.</p>
            <nav className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacidade
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}
