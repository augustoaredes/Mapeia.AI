'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function VerifyPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'invalid' | 'expired'>('loading')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    fetch(`${API_URL}/api/auth/verify?token=${encodeURIComponent(token)}`, {
      redirect: 'manual',
    }).then(async (res) => {
      if (res.ok || res.status === 0 || res.type === 'opaqueredirect') {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        const msg = (data.error ?? '') as string
        setStatus(msg.includes('expirado') ? 'expired' : 'invalid')
      }
    }).catch(() => setStatus('invalid'))
  }, [token])

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-brand font-bold text-2xl tracking-tight">Mapeia.AI</Link>

        <div className="mt-10 glass rounded-2xl border border-slate-700/60 p-10">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-5" />
              <p className="text-slate-300 font-semibold text-lg">Verificando...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-brand" />
              </div>
              <h1 className="text-xl font-bold text-slate-100 mb-2">E-mail verificado!</h1>
              <p className="text-slate-500 text-sm mb-8">
                Sua conta está ativa. Faça login para começar a mapear.
              </p>
              <Link
                href="/login"
                className="inline-block w-full bg-brand text-slate-900 font-bold py-3 rounded-xl
                  hover:bg-green-400 transition-colors cursor-pointer text-sm"
              >
                Entrar na conta →
              </Link>
            </>
          )}

          {status === 'expired' && (
            <>
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-slate-100 mb-2">Link expirado</h1>
              <p className="text-slate-500 text-sm mb-8">
                O link de verificação expirou após 24 horas.
                Acesse o login e solicite um novo.
              </p>
              <Link
                href="/login"
                className="inline-block w-full border border-slate-700 text-slate-200 font-semibold py-3 rounded-xl
                  hover:bg-slate-800 transition-colors cursor-pointer text-sm"
              >
                Ir para login
              </Link>
            </>
          )}

          {status === 'invalid' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-slate-100 mb-2">Link inválido</h1>
              <p className="text-slate-500 text-sm mb-8">
                Este link de verificação não existe ou já foi utilizado.
              </p>
              <Link
                href="/login"
                className="inline-block w-full border border-slate-700 text-slate-200 font-semibold py-3 rounded-xl
                  hover:bg-slate-800 transition-colors cursor-pointer text-sm"
              >
                Ir para login
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function VerifyPageWrapper() { return <Suspense><VerifyPage /></Suspense> }
