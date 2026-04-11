'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ImageIcon, ArrowRight, Trash2, Thermometer, AreaChart, Loader2, Clock, AlertCircle, XCircle } from 'lucide-react'
import { Project } from '@/lib/types'
import StatusBadge from './StatusBadge'
import { apiCancelProject } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

interface Props {
  project: Project
  onDelete?: (id: string) => void
  onCancel?: (id: string) => void
  token?: string
}

export default function ProjectCard({ project, onDelete, onCancel, token }: Props) {
  const [imgError, setImgError]         = useState(false)
  const [cardProgress, setCardProgress] = useState(5)
  const [cancelling, setCancelling]     = useState(false)

  const hasThumbnail = project.status === 'completed' && project.tilesUrl && !imgError
  const isProcessing = project.status === 'uploading' || project.status === 'processing'
  const isFailed     = project.status === 'failed' || project.status === 'cancelled'
  const pInfo        = project.processingInfo

  useEffect(() => {
    if (!isProcessing) { setCardProgress(5); return }
    const t = setInterval(() => {
      setCardProgress(prev => prev >= 85 ? 85 : prev + (prev < 40 ? 2 : 0.5))
    }, 1000)
    return () => clearInterval(t)
  }, [isProcessing])

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Cancelar o processamento?')) return
    setCancelling(true)
    try {
      await apiCancelProject(project.id, token)
      onCancel?.(project.id)
    } catch { /* ignora */ } finally { setCancelling(false) }
  }

  return (
    <div className="glass rounded-2xl border border-slate-700/60 hover:border-slate-600 transition-all duration-200 overflow-hidden group">

      {/* Thumbnail / status visual */}
      <div className="h-36 relative overflow-hidden bg-slate-900">

        {hasThumbnail ? (
          /* Ortomosaico real como thumbnail */
          <img
            src={`${API_URL}/api/projects/${project.id}/thumbnail`}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Placeholder animado dependendo do status */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {isProcessing && (
                <div className="flex flex-col items-center gap-2 w-full px-6">
                  <Loader2 className="w-9 h-9 text-brand animate-spin mb-1" />
                  <div className="flex items-center gap-1.5 max-w-full px-2">
                    <span className="text-xs font-semibold text-brand truncate text-center">
                      {project.phase ?? (project.status === 'uploading' ? 'Enviando fotos...' : 'Gerando mapa...')}
                    </span>
                    {(project.progress ?? 0) > 0 && (
                      <span className="text-xs font-mono text-brand/70 shrink-0">{project.progress}%</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden relative">
                    {(project.progress ?? 0) > 0 ? (
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${project.progress}%` }}
                      />
                    ) : (
                      <>
                        <style>{`@keyframes bar-slide{0%{left:-35%;width:30%}60%{width:40%}100%{left:110%;width:30%}}.bar-slide{position:absolute;top:0;height:100%;background:#22c55e;border-radius:9999px;animation:bar-slide 1.8s ease-in-out infinite}`}</style>
                        <div className="bar-slide" />
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center gap-1 text-[10px] text-slate-700 hover:text-red-400 transition-colors cursor-pointer mt-1"
                  >
                    {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    Cancelar
                  </button>
                </div>
              )}
              {project.status === 'pending' && (
                <>
                  <Clock className="w-8 h-8 text-slate-600" />
                  <span className="text-xs text-slate-600">Na fila</span>
                </>
              )}
              {isFailed && (
                <>
                  {project.status === 'cancelled'
                    ? <XCircle className="w-8 h-8 text-slate-500/60" />
                    : <AlertCircle className="w-8 h-8 text-red-500/60" />}
                  <span className={`text-xs ${project.status === 'cancelled' ? 'text-slate-500' : 'text-red-500/60'}`}>
                    {project.status === 'cancelled' ? 'Cancelado' : 'Falha no processamento'}
                  </span>
                </>
              )}
              {project.status === 'completed' && (
                /* Concluído mas sem tiles */
                <div className="text-center px-4">
                  <div className="text-2xl mb-1">🗺️</div>
                  <span className="text-xs text-slate-600">Sem prévia disponível</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overlay gradient no fundo para legibilidade das badges */}
        {hasThumbnail && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        )}

        {/* Status badge — canto superior direito */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {pInfo?.isThermal && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5
              rounded-full bg-orange-500/80 text-white backdrop-blur">
              <Thermometer className="w-2.5 h-2.5" /> Thermal
            </span>
          )}
          <StatusBadge status={project.status} />
        </div>

        {/* Área coberta — canto inferior esquerdo (só quando há thumbnail) */}
        {hasThumbnail && pInfo?.areaHa != null && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1
            text-[10px] font-semibold text-white/80 bg-slate-950/60 backdrop-blur
            px-2 py-0.5 rounded-full">
            <AreaChart className="w-2.5 h-2.5" />
            {pInfo.areaHa.toLocaleString('pt-BR')} ha
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-100 truncate mb-1 group-hover:text-white transition-colors">
          {project.name}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {project.imageCount} fotos
          </span>
          <span>{formatDate(project.createdAt)}</span>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/project/${project.id}`}
            className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-green-400 transition-colors cursor-pointer"
          >
            {project.status === 'completed' ? 'Ver mapa' : 'Ver status'}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg cursor-pointer"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
