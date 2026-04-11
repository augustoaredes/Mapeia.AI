'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Loader2, AlertCircle, ImageIcon, AreaChart, ZoomIn,
  Calendar, Layers, Mountain, Box, Thermometer, Clock,
} from 'lucide-react'
import { apiGetShareProject, normalizeProject } from '@/lib/api'
import { Project } from '@/lib/types'

const MapViewer = dynamic(() => import('@/components/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center" style={{ height: '480px' }}>
      <p className="text-slate-600 text-sm">Carregando mapa...</p>
    </div>
  ),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-200">{value}</span>
    </div>
  )
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [shareInfo, setShareInfo] = useState<{ label: string | null; expiresAt: string | null; viewCount: number } | null>(null)
  const [error, setError] = useState<'not_found' | 'expired' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGetShareProject(token).then(data => {
      if (!data) { setError('not_found'); setLoading(false); return }
      setProject(normalizeProject(data.project as Record<string, unknown>))
      setShareInfo(data.share)
      setLoading(false)
    }).catch(() => {
      setError('not_found'); setLoading(false)
    })
  }, [token])

  if (loading) return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
    </main>
  )

  if (error === 'expired') return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <Clock className="w-12 h-12 text-slate-700 mb-4" />
      <h1 className="text-xl font-bold text-slate-100 mb-2">Link expirado</h1>
      <p className="text-slate-500 text-sm mb-6">Este link de compartilhamento não está mais disponível.</p>
      <Link href="/" className="text-brand hover:underline text-sm cursor-pointer">Conheça o Mapeia.AI →</Link>
    </main>
  )

  if (error || !project) return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
      <h1 className="text-xl font-bold text-slate-100 mb-2">Link não encontrado</h1>
      <p className="text-slate-500 text-sm mb-6">Este link não existe ou foi revogado.</p>
      <Link href="/" className="text-brand hover:underline text-sm cursor-pointer">Conheça o Mapeia.AI →</Link>
    </main>
  )

  const pInfo = project.processingInfo

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="glass border-b border-slate-800/60 px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <Link
            href="/register"
            className="flex items-center gap-2 text-sm bg-brand text-slate-900 font-bold px-4 py-2 rounded-xl hover:bg-green-400 transition-colors cursor-pointer"
          >
            Criar conta gratuita
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-50 truncate">{project.name}</h1>
            {shareInfo?.label && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {shareInfo.label}
              </span>
            )}
            {pInfo?.isThermal && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5
                rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <Thermometer className="w-3 h-3" /> Thermal
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> {project.imageCount} fotos</span>
            <span>·</span>
            <span>{formatDate(project.createdAt)}</span>
            {shareInfo && (
              <>
                <span>·</span>
                <span>{shareInfo.viewCount} visualizações</span>
              </>
            )}
          </p>
        </div>

        {/* Layout principal */}
        {project.tilesUrl ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">

            {/* Mapa */}
            <div className="glass rounded-2xl border border-slate-700/60 overflow-hidden self-start">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ortomosaico</span>
              </div>
              <MapViewer
                tilesUrl={project.tilesUrl}
                dsmTilesUrl={project.dsmTilesUrl}
                tileBounds={project.tileBounds}
              />
            </div>

            {/* Painel lateral */}
            <div className="space-y-4">

              {/* Dados do levantamento */}
              <div className="glass rounded-2xl border border-slate-700/60 p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Levantamento
                </h3>
                <div>
                  <InfoRow label="Imagens" value={`${pInfo?.imageCount ?? project.imageCount} fotos`} />
                  {pInfo?.gsdCm != null && (
                    <InfoRow
                      label="GSD"
                      value={
                        <span className="flex items-center gap-1 text-brand font-bold">
                          <ZoomIn className="w-3 h-3" />
                          {pInfo.gsdCm} cm/pixel
                        </span>
                      }
                    />
                  )}
                  {pInfo?.areaHa != null && (
                    <InfoRow
                      label="Área coberta"
                      value={
                        <span className="flex items-center gap-1">
                          <AreaChart className="w-3 h-3 text-brand" />
                          {pInfo.areaHa.toLocaleString('pt-BR')} ha
                        </span>
                      }
                    />
                  )}
                  {pInfo?.zoomRange && (
                    <InfoRow
                      label="Zoom máx."
                      value={
                        <span className="flex items-center gap-1">
                          <ZoomIn className="w-3 h-3 text-slate-500" />
                          {pInfo.zoomRange.max}×
                        </span>
                      }
                    />
                  )}
                  <InfoRow
                    label="DSM"
                    value={
                      <span className={pInfo?.hasDsm ? 'text-brand' : 'text-slate-600'}>
                        <Mountain className="w-3 h-3 inline mr-1" />
                        {pInfo?.hasDsm ? 'Sim' : 'Não'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Modelo 3D"
                    value={
                      <span className={pInfo?.has3dModel ? 'text-brand' : 'text-slate-600'}>
                        <Box className="w-3 h-3 inline mr-1" />
                        {pInfo?.has3dModel ? 'Sim' : 'Não'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Data"
                    value={
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(project.createdAt)}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="glass rounded-2xl border border-brand/20 p-5 bg-brand/5 text-center">
                <p className="text-sm font-bold text-slate-100 mb-1">Mapeie sua área</p>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Transforme fotos de drone em ortomosaicos, MDT, MDS e nuvem de pontos em minutos.
                </p>
                <Link
                  href="/register"
                  className="block w-full py-2.5 rounded-xl bg-brand text-slate-900 font-bold text-sm
                    hover:bg-green-400 transition-colors cursor-pointer"
                >
                  Começar grátis
                </Link>
                <p className="text-xs text-slate-600 mt-2">Sem cartão de crédito</p>
              </div>

              {/* Crédito do link */}
              {shareInfo?.expiresAt && (
                <p className="text-xs text-slate-700 text-center">
                  Link válido até {new Date(shareInfo.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-slate-700/60 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Mapa não disponível para visualização pública.</p>
          </div>
        )}
      </div>
    </main>
  )
}
