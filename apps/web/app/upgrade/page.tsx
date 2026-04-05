'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Zap, ArrowRight, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const PLANS = [
  {
    id:       'avulso_100',
    label:    'Avulso',
    desc:     'Sem compromisso',
    items:    ['Até 100 fotos', 'Download do resultado', 'Válido por 30 dias'],
    price:    'R$ 29',
    sub:      'por projeto',
    featured: false,
  },
  {
    id:       'avulso_300',
    label:    'Avulso',
    desc:     'Projetos maiores',
    items:    ['Até 300 fotos', 'Download do resultado', 'Válido por 30 dias'],
    price:    'R$ 59',
    sub:      'por projeto',
    featured: false,
  },
  {
    id:       'avulso_1000',
    label:    'Avulso Pro',
    desc:     'Projetos grandes',
    items:    ['Até 1.000 fotos', 'Download do resultado', 'Válido por 30 dias'],
    price:    'R$ 99',
    sub:      'por projeto',
    featured: false,
  },
  {
    id:       'starter',
    label:    'Starter',
    desc:     'Uso regular',
    items:    ['5 projetos por mês', 'Até 500 fotos por projeto', 'Download incluso', 'Suporte por e-mail'],
    price:    'R$ 97',
    sub:      '/mês · cancele quando quiser',
    featured: true,
  },
  {
    id:       'pro',
    label:    'Pro',
    desc:     'Uso intensivo',
    items:    ['Projetos ilimitados', 'Até 1.000 fotos por projeto', 'Download incluso', 'Suporte prioritário'],
    price:    'R$ 197',
    sub:      '/mês · cancele quando quiser',
    featured: false,
  },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function handleCheckout(planId: string) {
    setLoading(planId)
    setError(null)

    try {
      if (!API_URL) {
        // Demo sem backend: simula redirect
        await new Promise((r) => setTimeout(r, 800))
        alert('Integração com Stripe disponível após configurar NEXT_PUBLIC_API_URL e as variáveis do Stripe.')
        setLoading(null)
        return
      }

      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard?upgraded=1`,
          cancelUrl:  `${window.location.origin}/upgrade`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao iniciar pagamento')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800/60 px-4 py-3.5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Meus mapas
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" /> Limite gratuito atingido
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-50 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Continue criando mapas profissionais sem limites.
            Pague pelo que usar ou assine e economize.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="max-w-lg mx-auto mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col transition-all duration-200
                ${plan.featured
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-brand/50 shadow-glow'
                  : 'glass border border-slate-700/60 hover:border-slate-600'
                }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </span>
              )}

              <div className="mb-5">
                <h3 className="font-bold text-slate-100 text-lg">{plan.label}</h3>
                <p className="text-slate-500 text-sm">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-black text-slate-50">{plan.price}</span>
                <span className="text-sm text-slate-500 ml-1">{plan.sub}</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading !== null}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl
                  transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  ${plan.featured
                    ? 'bg-brand text-slate-900 hover:bg-green-400'
                    : 'border border-brand text-brand hover:bg-brand/10'
                  }`}
              >
                {loading === plan.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                ) : (
                  <>Escolher plano <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Garantias */}
        <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-3">
          {[
            'Pagamento seguro via Stripe',
            'Cancele assinaturas quando quiser',
            'Sem fidelidade',
            'Suporte por e-mail incluso',
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-slate-600">
              <Check className="w-3.5 h-3.5 text-brand" /> {item}
            </span>
          ))}
        </div>

        {/* Link para voltar */}
        <div className="text-center mt-10">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">
            Voltar para meus mapas sem fazer upgrade
          </Link>
        </div>
      </div>
    </main>
  )
}
