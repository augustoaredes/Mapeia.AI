'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, User, AlertCircle, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function RegisterPage() {
  const router = useRouter()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      // 1. Criar conta no backend
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao criar conta')
      }

      // 2. Autenticar automaticamente
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInRes?.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
      setLoading(false)
    }
  }

  const passwordStrong = password.length >= 8

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-brand font-bold text-2xl tracking-tight">Mapeia.AI</Link>
          <p className="text-slate-500 text-sm mt-2">Crie sua conta grátis — 3 projetos incluídos</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-slate-700/60 p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Nome</label>
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
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
                    transition-all disabled:opacity-50"
                />
              </div>
              {password.length > 0 && (
                <p className={`text-xs mt-1.5 flex items-center gap-1 ${passwordStrong ? 'text-brand' : 'text-slate-500'}`}>
                  {passwordStrong
                    ? <><Check className="w-3 h-3" /> Senha válida</>
                    : `Faltam ${8 - password.length} caracteres`
                  }
                </p>
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

          {/* Benefícios */}
          <div className="mt-5 pt-5 border-t border-slate-700/60 space-y-1.5">
            {['3 projetos gratuitos incluídos', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
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
      </div>
    </main>
  )
}
