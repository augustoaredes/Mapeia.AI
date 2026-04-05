'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import {
  ChevronLeft, Download, ImageIcon, AlertCircle,
  Clock, CheckCircle2, Loader2,
} from 'lucide-react'
import { isApiAvailable, apiGetProject } from '@/lib/api'
import { getProject } from '@/lib/store'
import { Project } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'

const MapViewer = dynamic(() => import('@/components/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center">
      <p className="text-slate-600 text-sm">Carregando mapa...</p>
    </div>
  ),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_INFO: Record<string, { title: string; desc: string }> = {
  pending:    { title: 'Aguardando na fila',    desc: 'Seu projeto está na fila e será iniciado em breve.' },
  uploading:  { title: 'Enviando fotos...',      desc: 'As fotos estão sendo transferidas para o servidor.' },
  processing: { title: 'Gerando o mapa...',      desc: 'Estamos processando as imagens. Isso pode levar alguns minutos.' },
  failed:     { title: 'Falha no processamento', desc: 'Ocorreu um erro. Verifique a qualidade das imagens e tente novamente.' },
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const token = session?.backendToken

    async function fetchProject() {
      const p = isApiAvailable()
        ? await apiGetProject(id, token)
        : getProject(id)

      if (!p) { setNotFound(true); return }
      setProject(p)
    }

    fetchProject()

    const interval = setInterval(async () => {
      const fresh = isApiAvailable()
        ? await apiGetProject(id, token)
        : getProject(id)
      if (!fresh) return
      setProject({ ...fresh })
      if (fresh.status === 'completed' || fresh.status === 'failed') {
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [id, session?.backendToken])

  if (notFound) return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
      <h1 className="text-xl font-bold text-slate-100 mb-2">Projeto não encontrado</h1>
      <p className="text-slate-500 text-sm mb-6">Este projeto não existe ou foi excluído.</p>
      <Link href="/dashboard" className="text-brand hover:underline text-sm cursor-pointer">← Voltar para meus mapas</Link>
    </main>
  )

  if (!project) return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
    </main>
  )

  const isCompleted = project.status === 'completed'
  const isActive    = project.status === 'uploading' || project.status === 'processing'
  const info        = STATUS_INFO[project.status]

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

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-50 truncate">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> {project.imageCount} fotos
              </span>
              <span>·</span>
              <span>{formatDate(project.createdAt)}</span>
            </p>
          </div>

          {isCompleted && project.downloadUrl && (
            <a
              href={project.downloadUrl}
              download
              className="flex items-center gap-2 bg-brand text-slate-900 font-semibold px-5 py-2.5 rounded-xl
                hover:bg-green-400 transition-colors text-sm flex-shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Baixar mapa (.zip)
            </a>
          )}
        </div>

        {/* Mapa */}
        {isCompleted ? (
          <div className="glass rounded-2xl border border-slate-700/60 overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-slate-200">Mapa gerado com sucesso</span>
              <span className="text-xs text-slate-600 ml-auto hidden sm:block">
                Ortomosaico disponível no download
              </span>
            </div>
            <div className="p-4 h-[480px]">
              <MapViewer
                tilesUrl={project.tilesUrl}
                zoom={project.tilesUrl ? 15 : 13}
              />
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-slate-700/60 p-12 text-center mb-6">
            <div className="flex justify-center mb-5">
              {project.status === 'pending'  && <Clock      className="w-12 h-12 text-slate-600" />}
              {isActive                      && <Loader2    className="w-12 h-12 text-brand animate-spin" />}
              {project.status === 'failed'   && <AlertCircle className="w-12 h-12 text-red-400" />}
            </div>
            <h2 className="font-bold text-slate-100 text-xl mb-2">{info?.title}</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">{info?.desc}</p>

            {isActive && (
              <div className="mt-8 max-w-xs mx-auto">
                <div className="w-full bg-slate-800 rounded-full h-1">
                  <div className="bg-brand h-1 rounded-full w-2/3 animate-pulse" />
                </div>
                <p className="text-xs text-slate-600 mt-2.5">Atualiza automaticamente</p>
              </div>
            )}

            {project.status === 'failed' && (
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 mt-7 bg-brand text-slate-900 font-semibold
                  px-6 py-3 rounded-xl hover:bg-green-400 transition-colors text-sm cursor-pointer"
              >
                Tentar novamente
              </Link>
            )}
          </div>
        )}

        {/* Detalhes */}
        <div className="glass rounded-2xl border border-slate-700/60 p-6">
          <h3 className="font-semibold text-slate-200 mb-5 text-sm uppercase tracking-wide">Detalhes do projeto</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
            {[
              { label: 'Nome',       value: project.name },
              { label: 'Status',     value: <StatusBadge status={project.status} /> },
              { label: 'Fotos',      value: `${project.imageCount}` },
              { label: 'Criado em',  value: formatDate(project.createdAt) },
              { label: 'Atualizado', value: formatDate(project.updatedAt) },
              { label: 'ID',         value: <span className="font-mono text-xs text-slate-600">{project.id.slice(0, 8)}…</span> },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-slate-600 mb-0.5 text-xs">{label}</dt>
                <dd className="font-medium text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </main>
  )
}
