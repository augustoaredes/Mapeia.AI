import Link from 'next/link'

export const metadata = {
  title: 'Enviar fotos — Mapeia.AI',
}

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="text-2xl font-bold text-green-600 mb-8">
        Mapeia.AI
      </Link>
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">📸</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Envie suas fotos</h1>
        <p className="text-gray-500 mb-6">Em breve — estamos preparando essa área para você.</p>
        <Link
          href="/"
          className="text-sm text-green-600 hover:underline"
        >
          ← Voltar para o início
        </Link>
      </div>
    </main>
  )
}
