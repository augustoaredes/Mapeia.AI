'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Zap, ArrowRight, Loader2, Shield, Star } from 'lucide-react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// ── Planos de assinatura (ordem: Business → Pro → Starter, para âncora) ──────
const SUBSCRIPTION_PLANS = [
  {
    id:       'business',
    label:    'Business',
    badge:    null,
    desc:     'Empresas e equipes',
    price:    'R$ 547',
    sub:      '/mês',
    anchor:   null,
    featured: false,
    items: [
      'Até 3.000 fotos por projeto (≈ 500 ha)',
      'Projetos ilimitados',
      'Fila de alta prioridade',
      'Resultados em 90 dias',
      'Até 5 usuários na conta',
      'Suporte prioritário',
    ],
    cta: 'Assinar Business',
  },
  {
    id:       'pro',
    label:    'Pro',
    badge:    'MAIS POPULAR',
    desc:     'Profissionais e consultores',
    price:    'R$ 297',
    sub:      '/mês',
    anchor:   'Economize R$ 250 vs Business',
    featured: true,
    items: [
      'Até 1.000 fotos por projeto (≈ 165 ha)',
      'Projetos ilimitados',
      'Fila prioritária',
      'Resultados em 90 dias',
      'Suporte por chat',
    ],
    cta: 'Assinar Pro',
  },
  {
    id:       'starter',
    label:    'Starter',
    badge:    null,
    desc:     'Pilotos autônomos',
    price:    'R$ 149',
    sub:      '/mês',
    anchor:   null,
    featured: false,
    items: [
      'Até 500 fotos por projeto (≈ 83 ha)',
      'Projetos ilimitados',
      'Resultados em 30 dias',
      'Suporte por e-mail',
    ],
    cta: 'Assinar Starter',
  },
]

// ── Pay-per-use ───────────────────────────────────────────────────────────────
const PAYPERUSE_PLANS = [
  {
    id:    'avulso_150',
    fotos: 'Até 150 fotos',
    ha:    '≈ 25 ha',
    preco: 'R$ 59',
    desc:  'Projetos pequenos e testes',
  },
  {
    id:    'avulso_400',
    fotos: 'Até 400 fotos',
    ha:    '≈ 67 ha',
    preco: 'R$ 99',
    desc:  'Projetos médios',
    popular: true,
  },
  {
    id:    'avulso_1200',
    fotos: 'Até 1.200 fotos',
    ha:    '≈ 200 ha',
    preco: 'R$ 189',
    desc:  'Grandes áreas',
  },
]

export default function UpgradePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function handleCheckout(planId: string) {
    setLoading(planId)
    setError(null)

    try {
      if (!API_URL) {
        await new Promise((r) => setTimeout(r, 800))
        alert('Configure NEXT_PUBLIC_API_URL e as variáveis do Stripe para ativar pagamentos.')
        setLoading(null)
        return
      }

      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.backendToken ? { Authorization: `Bearer ${session.backendToken}` } : {}),
        },
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
            Um levantamento topográfico tradicional custa{' '}
            <span className="text-slate-200 font-semibold">R$ 2.000–8.000 por projeto</span>.
            Com o Mapeia.AI, você entrega o mesmo resultado e fica com a margem.
          </p>
        </div>

        {error && (
          <div className="max-w-lg mx-auto mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Assinaturas ─────────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col transition-all duration-200
                ${plan.featured
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-brand/50 shadow-glow scale-[1.02]'
                  : 'glass border border-slate-700/60 hover:border-slate-600'}`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand text-slate-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> {plan.badge}
                </span>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-slate-100 text-xl">{plan.label}</h3>
                <p className="text-slate-500 text-sm">{plan.desc}</p>
              </div>

              <div className="mb-1">
                <span className="text-4xl font-black text-slate-50">{plan.price}</span>
                <span className="text-sm text-slate-500 ml-1">{plan.sub}</span>
              </div>
              {plan.anchor && (
                <p className="text-xs text-brand font-semibold mb-4">{plan.anchor}</p>
              )}
              {!plan.anchor && <div className="mb-4" />}

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 mt-0.5" />
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
                    : 'border border-slate-600 text-slate-200 hover:border-brand hover:text-brand'}`}
              >
                {loading === plan.id
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                  : <>{plan.cta} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          ))}
        </div>

        {/* Anual */}
        <p className="text-center text-sm text-slate-600 mt-4">
          Quer pagar anual?{' '}
          <a href="mailto:contato@mapeia.ai" className="text-brand hover:underline cursor-pointer">
            Fale conosco e ganhe 2 meses grátis →
          </a>
        </p>

        {/* Divisor */}
        <div className="flex items-center gap-4 my-12">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-sm font-medium">ou pague por projeto</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* ── Pay-per-use ─────────────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-slate-700/60 p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-100 text-lg">Processamento avulso</h3>
              <p className="text-slate-500 text-sm">Sem assinatura. Pague por projeto, use quando quiser.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYPERUSE_PLANS.map((p) => (
              <div
                key={p.id}
                className={`relative rounded-xl p-4 border transition-all
                  ${p.popular
                    ? 'border-brand/40 bg-brand/5'
                    : 'border-slate-700/60 bg-slate-900/40'}`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 left-3 bg-brand text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    MAIS PEDIDO
                  </span>
                )}
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-slate-200 font-semibold text-sm">{p.fotos}</p>
                    <p className="text-slate-600 text-xs">{p.ha} · {p.desc}</p>
                  </div>
                  <span className="text-xl font-black text-slate-100 shrink-0 ml-2">{p.preco}</span>
                </div>
                <button
                  onClick={() => handleCheckout(p.id)}
                  disabled={loading !== null}
                  className="w-full mt-3 text-xs font-semibold py-2 rounded-lg border border-slate-600
                    text-slate-300 hover:border-brand hover:text-brand transition-colors
                    cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === p.id
                    ? <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Aguarde...</span>
                    : 'Comprar este processamento'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Garantias */}
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            { icon: Shield, text: 'Pagamento seguro via Stripe' },
            { icon: Check,  text: 'Cancele assinaturas quando quiser' },
            { icon: Check,  text: 'Sem fidelidade ou multa' },
            { icon: Zap,    text: 'Crédito devolvido se o processamento falhar' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-sm text-slate-600">
              <Icon className="w-3.5 h-3.5 text-brand" /> {text}
            </span>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-sm text-slate-700 hover:text-slate-400 transition-colors cursor-pointer">
            Voltar para meus mapas
          </Link>
        </div>
      </div>
    </main>
  )
}
