'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Map, LayoutGrid } from 'lucide-react'
import { getProjects, deleteProject } from '@/lib/store'
import { Project } from '@/lib/types'
import ProjectCard from '@/components/ProjectCard'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setProjects(getProjects())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  function handleDelete(id: string) {
    if (!confirm('Excluir este projeto? Esta ação não pode ser desfeita.')) return
    deleteProject(id)
    load()
  }

  const processing = projects.filter(
    (p) => p.status === 'uploading' || p.status === 'processing'
  )
  const completed = projects.filter((p) => p.status === 'completed').length
  const total = projects.length

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800/60 px-4 py-3.5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 bg-brand text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-400 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo mapa
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header + stats */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-50 mb-1">Meus mapas</h1>
            <p className="text-slate-500 text-sm">{total === 0 ? 'Nenhum projeto ainda' : `${total} projeto${total !== 1 ? 's' : ''}`}</p>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-4">
              {[
                { label: 'Total',      value: total,     color: 'text-slate-200' },
                { label: 'Concluídos', value: completed, color: 'text-brand'     },
                { label: 'Em processo', value: processing.length, color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-slate-600">{label}</p>
                </div>
              ))}
              <button
                onClick={load}
                className="p-2 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-2"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Banner de processamento */}
        {processing.length > 0 && (
          <div className="flex items-center gap-3 glass border border-yellow-500/20 text-yellow-300 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
            {processing.length === 1 ? '1 projeto está sendo processado' : `${processing.length} projetos estão sendo processados`}
            <span className="text-yellow-600 ml-auto hidden sm:block">Atualiza automaticamente</span>
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

        {/* Grade de projetos */}
        {total > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-600">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Projetos recentes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}

        {/* CTA upgrade */}
        {total >= 3 && (
          <div className="mt-10 glass rounded-2xl border border-brand/20 p-6 text-center">
            <p className="font-bold text-slate-100 mb-1">
              Você usou seus 3 projetos gratuitos
            </p>
            <p className="text-sm text-slate-400 mb-5">
              Faça upgrade para continuar criando mapas sem limite.
            </p>
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
