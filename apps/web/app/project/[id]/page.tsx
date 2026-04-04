'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Download,
  ImageIcon,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { getProject } from '@/lib/store'
import { Project } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'

// Leaflet não funciona no servidor — carrega somente no cliente
const MapViewer = dynamic(() => import('@/components/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando mapa...</p>
    </div>
  ),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusMessages: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
  pending: {
    title: 'Aguardando na fila',
    desc: 'Seu projeto está na fila e será processado em breve.',
    icon: <Clock className="w-8 h-8 text-gray-400" />,
  },
  uploading: {
    title: 'Enviando fotos...',
    desc: 'As fotos estão sendo transferidas para o servidor.',
    icon: <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />,
  },
  processing: {
    title: 'Gerando seu mapa...',
    desc: 'Estamos processando as imagens. Isso pode levar alguns minutos.',
    icon: <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />,
  },
  failed: {
    title: 'Falha no processamento',
    desc: 'Ocorreu um erro ao processar as imagens. Tente novamente.',
    icon: <AlertCircle className="w-8 h-8 text-red-400" />,
  },
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)

  function load() {
    const p = getProject(id)
    if (!p) {
      setNotFound(true)
      return
    }
    setProject(p)
  }

  useEffect(() => {
    load()
    // Polling enquanto ainda está processando
    const interval = setInterval(() => {
      const p = getProject(id)
      if (!p) return
      setProject({ ...p })
      if (p.status === 'completed' || p.status === 'failed') {
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Projeto não encontrado</h1>
        <p className="text-gray-500 mb-6 text-sm">Este projeto não existe ou foi excluído.</p>
        <Link href="/dashboard" className="text-green-600 hover:underline text-sm">
          ← Voltar para meus mapas
        </Link>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </main>
    )
  }

  const isCompleted = project.status === 'completed'
  const isProcessing =
    project.status === 'uploading' || project.status === 'processing'

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">Mapeia.AI</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Meus mapas
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cabeçalho do projeto */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-gray-400">
              Criado em {formatDate(project.createdAt)} ·{' '}
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> {project.imageCount} fotos
              </span>
            </p>
          </div>

          {isCompleted && project.downloadUrl && (
            <a
              href={project.downloadUrl}
              className="flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm"
              download
            >
              <Download className="w-4 h-4" />
              Baixar mapa (.zip)
            </a>
          )}
        </div>

        {/* Mapa — só exibe quando concluído */}
        {isCompleted ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-700">Mapa gerado com sucesso</span>
              <span className="text-xs text-gray-400 ml-auto">
                Visualização demonstrativa — mapa real disponível no download
              </span>
            </div>
            <div className="p-4">
              {/* TODO (Fase 7): passar tilesUrl real do ODM */}
              <MapViewer zoom={13} />
            </div>
          </div>
        ) : (
          /* Estado de processamento */
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center mb-6">
            <div className="flex justify-center mb-4">
              {statusMessages[project.status]?.icon}
            </div>
            <h2 className="font-bold text-gray-900 mb-2">
              {statusMessages[project.status]?.title}
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {statusMessages[project.status]?.desc}
            </p>

            {isProcessing && (
              <div className="mt-6 max-w-xs mx-auto">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full animate-pulse w-2/3" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Esta página atualiza automaticamente</p>
              </div>
            )}

            {project.status === 'failed' && (
              <Link
                href="/upload"
                className="inline-block mt-6 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                Tentar novamente
              </Link>
            )}
          </div>
        )}

        {/* Detalhes do projeto */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Detalhes</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Projeto', value: project.name },
              { label: 'Status', value: <StatusBadge status={project.status} /> },
              { label: 'Fotos', value: `${project.imageCount}` },
              { label: 'Criado em', value: formatDate(project.createdAt) },
              { label: 'Atualizado', value: formatDate(project.updatedAt) },
              { label: 'ID', value: <span className="font-mono text-xs text-gray-400">{project.id.slice(0, 8)}…</span> },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-gray-400 mb-0.5">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </main>
  )
}
