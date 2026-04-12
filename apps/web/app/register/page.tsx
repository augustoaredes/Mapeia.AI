'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, User, AlertCircle, Check, MailCheck, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function RegisterPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/dashboard'

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)  // mostra tela "verifique seu e-mail"
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const passwordStrong  = password.length >= 8
  const hasUpper        = /[A-Z]/.test(password)
  const hasNumber       = /[0-9]/.test(password)
  const passwordScore   = (passwordStrong ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0)
  const passwordColor   = passwordScore === 3 ? 'bg-brand' : passwordScore === 2 ? 'bg-yellow-400' : 'bg-red-500'
  const passwordLabel   = passwordScore === 3 ? 'Forte' : passwordScore === 2 ? 'Média' : 'Fraca'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!passwordStrong) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao criar conta')
      }

      // Cadastro OK — mostra tela de "verifique seu e-mail"
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resending || resendSent) return
    setResending(true)
    try {
      await fetch(`${API_URL}/api/auth/resend-verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      setResendSent(true)
    } catch { /* noop */ } finally {
      setResending(false)
    }
  }

  // ── Tela de confirmação de e-mail ────────────────────────────────────────
  if (done) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="text-brand font-bold text-2xl tracking-tight">Mapeia.AI</Link>

          <div className="mt-10 glass rounded-2xl border border-slate-700/60 p-10">
            <div className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center mx-auto mb-5">
              <MailCheck className="w-8 h-8 text-brand" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Verifique seu e-mail</h1>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              Enviamos um link de ativação para:
            </p>
            <p className="font-semibold text-slate-200 text-sm mb-6 break-all">{email}</p>
            <p className="text-slate-600 text-xs mb-8 leading-relaxed">
              Clique no link do e-mail para ativar sua conta.
              O link expira em 24 horas.
            </p>

            {!resendSent ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-2 mx-auto text-sm text-slate-400 hover:text-brand transition-colors cursor-pointer disabled:opacity-60"
              >
                {resending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Não recebeu? Reenviar e-mail
              </button>
            ) : (
              <p className="text-xs text-brand flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> E-mail reenviado!
              </p>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já verificou?{' '}
            <Link href="/login" className="text-brand hover:underline cursor-pointer">Entrar</Link>
          </p>
        </div>
      </main>
    )
  }

  // ── Tela de cadastro ─────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-brand font-bold text-2xl tracking-tight">Mapeia.AI</Link>
          <p className="text-slate-500 text-sm mt-2">Crie sua conta — 1 projeto gratuito incluído</p>
        </div>

        <div className="glass rounded-2xl border border-slate-700/60 p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
                    transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">E-mail profissional</label>
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
              <p className="text-xs text-slate-600 mt-1.5">Apenas e-mails reais. Será necessário verificar.</p>
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
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
                    transition-all disabled:opacity-50"
                />
              </div>

              {/* Barra de força da senha */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordScore ? passwordColor : 'bg-slate-800'}`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${passwordScore === 3 ? 'text-brand' : passwordScore === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                      Força: {passwordLabel}
                    </p>
                    <div className="flex gap-2 text-xs text-slate-600">
                      <span className={passwordStrong ? 'text-brand' : ''}>8+ chars</span>
                      <span className={hasUpper ? 'text-brand' : ''}>A-Z</span>
                      <span className={hasNumber ? 'text-brand' : ''}>0-9</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name || !email || !passwordStrong}
              className="w-full flex items-center justify-center gap-2 bg-brand text-slate-900 font-bold
                py-3.5 rounded-xl hover:bg-green-400 transition-all disabled:opacity-40
                disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                : 'Criar conta grátis'
              }
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-700/60 space-y-1.5">
            {[
              '1 projeto gratuito · verificação de e-mail obrigatória',
              'Sem cartão de crédito',
              'Cancele quando quiser',
            ].map((item) => (
              <p key={item} className="text-xs text-slate-500 flex items-center gap-2">
                <Check className="w-3 h-3 text-brand flex-shrink-0" /> {item}
              </p>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand hover:underline cursor-pointer">Entrar</Link>
        </p>
        <p className="text-center text-xs text-slate-700 mt-3">
          Ao criar conta você concorda com os{' '}
          <Link href="/terms" className="hover:text-slate-500 underline cursor-pointer">Termos de Uso</Link>
          {' '}e a{' '}
          <Link href="/privacy" className="hover:text-slate-500 underline cursor-pointer">Política de Privacidade</Link>
        </p>
      </div>
    </main>
  )
}

export default function RegisterPageWrapper() { return <Suspense><RegisterPage /></Suspense> }
