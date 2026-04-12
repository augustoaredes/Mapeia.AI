'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import {
  Plus, Map, LogOut, CheckCircle2, Loader2, AlertCircle,
  Clock, XCircle, X, CreditCard, Zap, ChevronRight,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { isApiAvailable, apiGetProjects, apiDeleteProject, apiGetMe, UserProfile } from '@/lib/api'
import { getProjects, deleteProject as deleteProjectLocal } from '@/lib/store'
import { Project } from '@/lib/types'
import ProjectCard from '@/components/ProjectCard'

type Filter = 'all' | 'processing' | 'completed' | 'failed'

const PLAN_LABELS: Record<string, string> = {
  free:         'Gratuito',
  avulso_150:   'Avulso · 150 fotos',
  avulso_400:   'Avulso · 400 fotos',
  avulso_1200:  'Avulso · 1.200 fotos',
  starter:      'Starter',
  pro:          'Pro',
  business:     'Business',
}

function DashboardPage() {
  const { data: session } = useSession()
  const searchParams  = useSearchParams()
  const cancelledName = searchParams.get('cancelled')

  const [showCancelBanner, setShowCancelBanner] = useState(!!cancelledName)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<Filter>('all')
  const [me, setMe]             = useState<UserProfile | null>(null)

  const load = useCallback(async () => {
    try {
      const data = isApiAvailable()
        ? await apiGetProjects(session?.backendToken)
        : getProjects()
      setProjects(data)
    } catch {
      setProjects(getProjects())
    } finally {
      setLoading(false)
    }
  }, [session?.backendToken])

  // Carrega perfil do usuário (plano, créditos)
  useEffect(() => {
    if (!session?.backendToken || !isApiAvailable()) return
    apiGetMe(session.backendToken).then(setMe)
  }, [session?.backendToken])

  useEffect(() => {
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Excluir este projeto? Esta ação não pode ser desfeita.')) return
    if (isApiAvailable()) {
      await apiDeleteProject(id, session?.backendToken)
    } else {
      deleteProjectLocal(id)
    }
    load()
  }

  const processing = projects.filter(p => p.status === 'uploading' || p.status === 'processing')
  const completed  = projects.filter(p => p.status === 'completed')
  const failed     = projects.filter(p => p.status === 'failed')
  const pending    = projects.filter(p => p.status === 'pending')
  const total      = projects.length

  const filtered = filter === 'all'       ? projects
                 : filter === 'processing' ? [...processing, ...pending]
                 : filter === 'completed'  ? completed
                 : failed

  const isSubscription = me && ['starter', 'pro', 'business'].includes(me.planId)
  const isAvulso       = me && me.planId.startsWith('avulso')
  const isFree         = me && me.planId === 'free'

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="glass border-b border-slate-800/60 px-4 py-3.5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <span className="text-sm text-slate-400 hidden sm:block">{session.user.name}</span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <Link
              href="/upload"
              className="flex items-center gap-1.5 bg-brand text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo mapa
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Banner de cancelamento */}
        {showCancelBanner && cancelledName && (
          <div className="flex items-center gap-3 glass border border-slate-600/40 rounded-xl px-4 py-3 mb-6 text-sm">
            <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300">
              Processamento de <span className="font-semibold text-slate-100">"{cancelledName}"</span> foi cancelado.
            </span>
            <Link href="/upload" className="ml-auto text-brand hover:underline text-xs font-semibold shrink-0 cursor-pointer">
              Tentar novamente →
            </Link>
            <button onClick={() => setShowCancelBanner(false)} className="text-slate-600 hover:text-slate-400 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner de plano */}
        {me && (
          <div className="glass border border-slate-700/60 rounded-2xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isSubscription ? 'bg-brand/15 text-brand' : 'bg-slate-800 text-slate-400'
              }`}>
                {isSubscription ? <Zap className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {PLAN_LABELS[me.planId] ?? me.planId}
                </p>
                <p className="text-xs text-slate-500">
                  {isSubscription && 'Projetos ilimitados · '}
                  {isAvulso && me.projectCredits > 0 && `${me.projectCredits} projeto${me.projectCredits > 1 ? 's' : ''} restante${me.projectCredits > 1 ? 's' : ''} · `}
                  {isFree && me.totalProjectsCreated > 0 && 'Plano gratuito — 1 projeto · '}
                  {me.totalProjectsCreated} criado{me.totalProjectsCreated !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {(isFree || isAvulso) && (
              <Link
                href="/#preco"
                className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-green-400 transition-colors cursor-pointer shrink-0"
              >
                Upgrade <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* Header + stats */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-50 mb-1">Meus mapas</h1>
            <p className="text-slate-500 text-sm">
              {loading ? 'Carregando...' : total === 0 ? 'Nenhum projeto ainda' : `${total} projeto${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-5">
              <StatBadge icon={<CheckCircle2 className="w-3.5 h-3.5" />} value={completed.length} label="Concluídos" color="text-brand" />
              {processing.length > 0 && (
                <StatBadge icon={<Loader2 className="w-3.5 h-3.5 animate-spin" />} value={processing.length} label="Processando" color="text-yellow-400" />
              )}
              {pending.length > 0 && (
                <StatBadge icon={<Clock className="w-3.5 h-3.5" />} value={pending.length} label="Na fila" color="text-slate-400" />
              )}
              {failed.length > 0 && (
                <StatBadge icon={<AlertCircle className="w-3.5 h-3.5" />} value={failed.length} label="Falha" color="text-red-400" />
              )}
            </div>
          )}
        </div>

        {/* Filtros */}
        {total > 0 && (
          <div className="flex items-center gap-1 mb-6 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
            {([
              { key: 'all',        label: 'Todos',       count: total },
              { key: 'processing', label: 'Em andamento', count: processing.length + pending.length },
              { key: 'completed',  label: 'Concluídos',   count: completed.length },
              { key: 'failed',     label: 'Falha',        count: failed.length },
            ] as { key: Filter; label: string; count: number }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === tab.key
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filter === tab.key ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Banner processando */}
        {processing.length > 0 && (filter === 'all' || filter === 'processing') && (
          <div className="glass border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
              <span className="text-sm font-semibold text-yellow-300">
                {processing.length === 1 ? '1 projeto sendo processado' : `${processing.length} projetos sendo processados`}
              </span>
              <span className="text-xs text-yellow-700 ml-auto">Atualiza automaticamente</span>
            </div>
            <div className="space-y-1">
              {processing.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-slate-500 pl-5">
                  <span className="w-1 h-1 rounded-full bg-yellow-700 flex-shrink-0" />
                  <span className="truncate">{p.name}</span>
                  {(p.progress ?? 0) > 0 ? (
                    <span className="ml-auto text-brand font-mono shrink-0">{p.progress}%</span>
                  ) : (
                    <span className="ml-auto text-slate-700 font-medium shrink-0">
                      {p.status === 'uploading' ? 'enviando fotos' : p.phase ?? 'gerando mapa'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
              <Map className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="font-bold text-slate-100 text-xl mb-2">Nenhum mapa ainda</h2>
            <p className="text-slate-500 text-sm mb-8 max-w-xs">
              Envie fotos do seu drone para criar seu primeiro mapa ortomosaico.
            </p>
            <Link
              href="/upload"
              className="flex items-center gap-2 bg-brand text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Criar primeiro mapa
            </Link>
          </div>
        )}

        {/* Estado vazio do filtro */}
        {!loading && total > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-600 text-sm">Nenhum projeto nesta categoria</p>
            <button onClick={() => setFilter('all')} className="text-brand text-xs mt-2 hover:underline cursor-pointer">
              Ver todos →
            </button>
          </div>
        )}

        {/* Grade de projetos */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                onCancel={() => load()}
                token={session?.backendToken ?? undefined}
              />
            ))}
          </div>
        )}

        {/* CTA upgrade */}
        {total >= 1 && completed.length >= 1 && isFree && (
          <div className="mt-10 glass rounded-2xl border border-brand/20 p-6 text-center">
            <p className="font-bold text-slate-100 mb-1">Gostou do resultado?</p>
            <p className="text-sm text-slate-400 mb-5">Faça upgrade para criar mapas ilimitados e acessar recursos avançados.</p>
            <Link
              href="/#preco"
              className="inline-block bg-brand text-slate-900 font-semibold px-6 py-2.5 rounded-xl hover:bg-green-400 transition-colors text-sm cursor-pointer"
            >
              Ver planos →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function StatBadge({
  icon, value, label, color,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      <div>
        <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
        <p className="text-[10px] text-slate-600 leading-none mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPageWrapper() { return <Suspense><DashboardPage /></Suspense> }
