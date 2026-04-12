'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('redirect') ?? searchParams.get('callbackUrl') ?? '/dashboard'
  const justVerified = searchParams.get('verified') === '1'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading]     = useState(false)
  const [resendSent,    setResendSent]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setUnverifiedEmail(null)
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.ok) {
      router.push(callbackUrl)
      router.refresh()
      return
    }

    // Verifica se a causa é e-mail não verificado
    try {
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await loginRes.json()
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email ?? email)
        setError('E-mail ainda não verificado. Clique em "Reenviar" para receber um novo link.')
        return
      }
    } catch { /* fallback */ }

    setError('E-mail ou senha incorretos. Verifique e tente novamente.')
  }

  async function handleResend() {
    if (!unverifiedEmail || resendLoading) return
    setResendLoading(true)
    try {
      await fetch(`${API_URL}/api/auth/resend-verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: unverifiedEmail }),
      })
      setResendSent(true)
    } catch { /* noop */ } finally {
      setResendLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-brand font-bold text-2xl tracking-tight">Mapeia.AI</Link>
          <p className="text-slate-500 text-sm mt-2">Entre na sua conta para continuar</p>
        </div>

        {justVerified && (
          <div className="flex items-center gap-3 bg-brand/10 border border-brand/20 text-brand rounded-xl px-4 py-3 text-sm mb-5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            E-mail verificado com sucesso! Faça login para começar.
          </div>
        )}

        <div className="glass rounded-2xl border border-slate-700/60 p-8">

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm mb-5">
              <div className="flex items-start gap-3 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {unverifiedEmail && !resendSent && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-green-400 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {resendLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                  Reenviar e-mail de verificação
                </button>
              )}
              {resendSent && (
                <p className="mt-2 text-xs text-brand flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> E-mail reenviado! Verifique sua caixa de entrada.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
                    transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
                    transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 bg-brand text-slate-900 font-bold
                py-3.5 rounded-xl hover:bg-green-400 transition-all disabled:opacity-40
                disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-700/40 text-center">
            <p className="text-xs text-slate-600">
              Ao entrar você concorda com os{' '}
              <Link href="/terms" className="text-slate-500 hover:text-slate-300 underline cursor-pointer">Termos de Uso</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Não tem conta?{' '}
          <Link href="/register" className="text-brand hover:underline cursor-pointer">Criar conta grátis</Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPageWrapper() { return <Suspense><LoginPage /></Suspense> }
