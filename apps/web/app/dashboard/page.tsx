'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, MapPin, RefreshCw } from 'lucide-react'
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
    // Atualiza o status automaticamente a cada 3s (polling local)
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">Mapeia.AI</Link>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo mapa
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus mapas</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {projects.length === 0
                ? 'Nenhum projeto ainda'
                : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Banner de projetos em processamento */}
        {processing.length > 0 && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
            {processing.length === 1
              ? '1 projeto está sendo processado...'
              : `${processing.length} projetos estão sendo processados...`}
            <span className="text-yellow-600 ml-auto">Esta página atualiza automaticamente.</span>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="font-bold text-gray-900 mb-1">Nenhum mapa ainda</h2>
            <p className="text-gray-500 text-sm mb-6">
              Envie as fotos do seu drone para criar seu primeiro mapa.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar primeiro mapa
            </Link>
          </div>
        )}

        {/* Grade de projetos */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* CTA upgrade */}
        {projects.length >= 3 && (
          <div className="mt-10 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="font-semibold text-green-900 mb-1">
              Você usou seus 3 projetos gratuitos
            </p>
            <p className="text-sm text-green-700 mb-4">
              Faça upgrade para continuar gerando mapas ilimitados.
            </p>
            <Link
              href="/#preco"
              className="inline-block bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm"
            >
              Ver planos →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
