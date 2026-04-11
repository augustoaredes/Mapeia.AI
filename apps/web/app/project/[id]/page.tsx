'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import {
  ChevronLeft, ImageIcon, AlertCircle, Clock, CheckCircle2,
  Loader2, FileArchive, Layers, ZoomIn, Maximize2, Box, Cpu,
  Calendar, Hash, AreaChart, Mountain, Thermometer, Camera,
  Download, Map, Globe, XCircle, Share2, Copy, Check,
  CloudRain, Scan, Package, X, Map as MapIcon, Box as BoxIcon, Wind,
} from 'lucide-react'
import {
  isApiAvailable, apiGetProject, apiCancelProject, PROJECT_NOT_FOUND,
  apiCreateShare, apiGetShares, apiDeleteShare, apiDownloadUrl,
} from '@/lib/api'
import { getProject } from '@/lib/store'
import { Project, ProjectShare } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { exportGeoJSON, exportKML, exportShapefile } from '@/lib/export'

type ViewTab = 'map' | 'model3d' | 'pointcloud'

const MapViewer = dynamic(() => import('@/components/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center" style={{ height: '480px' }}>
      <p className="text-slate-600 text-sm">Carregando mapa...</p>
    </div>
  ),
})

const Model3DViewer = dynamic(() => import('@/components/Model3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-900 rounded-2xl flex items-center justify-center" style={{ height: '480px' }}>
      <p className="text-slate-600 text-sm">Carregando visualizador 3D...</p>
    </div>
  ),
})

const PointCloudViewer = dynamic(() => import('@/components/PointCloudViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-900 rounded-2xl flex items-center justify-center" style={{ height: '480px' }}>
      <p className="text-slate-600 text-sm">Carregando nuvem de pontos...</p>
    </div>
  ),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const STATUS_INFO: Record<string, { title: string; desc: string }> = {
  pending:    { title: 'Aguardando na fila',    desc: 'Seu projeto está na fila e será iniciado em breve.' },
  uploading:  { title: 'Enviando fotos...',      desc: 'As fotos estão sendo transferidas para o servidor.' },
  processing: { title: 'Gerando o mapa...',      desc: 'Estamos processando as imagens. Isso pode levar alguns minutos.' },
  failed:     { title: 'Falha no processamento', desc: 'Ocorreu um erro. Verifique a qualidade das imagens e tente novamente.' },
  cancelled:  { title: 'Processamento cancelado', desc: 'O processamento foi cancelado. Você pode tentar novamente com as mesmas fotos.' },
}

// ── Modal de Compartilhamento ───────────────────────────────────────────────

function ShareModal({
  projectId,
  token: authToken,
  onClose,
}: {
  projectId: string
  token?: string
  onClose: () => void
}) {
  const [shares, setShares]     = useState<ProjectShare[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel]       = useState('')
  const [copied, setCopied]     = useState<string | null>(null)

  useEffect(() => {
    apiGetShares(projectId, authToken).then(data => {
      setShares(data); setLoading(false)
    })
  }, [projectId, authToken])

  async function handleCreate() {
    setCreating(true)
    try {
      const share = await apiCreateShare(projectId, label || undefined, authToken)
      setShares(prev => [{ ...share, viewCount: 0, expired: false }, ...prev])
      setLabel('')
    } catch { /* noop */ } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(shareId: string) {
    await apiDeleteShare(projectId, shareId, authToken)
    setShares(prev => prev.filter(s => s.id !== shareId))
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass rounded-2xl border border-slate-700/60 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brand" /> Compartilhar projeto
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Criar novo link */}
        <div className="mb-5">
          <p className="text-xs text-slate-500 mb-3">
            Links de compartilhamento expiram em 30 dias. O destinatário pode visualizar o mapa sem criar conta.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rótulo opcional (ex: cliente, equipe)"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand/50"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 bg-brand text-slate-900 font-bold px-4 py-2 rounded-lg text-sm hover:bg-green-400 transition-colors cursor-pointer disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              Gerar
            </button>
          </div>
        </div>

        {/* Lista de links */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading && <p className="text-xs text-slate-600 text-center py-4">Carregando...</p>}
          {!loading && shares.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">Nenhum link criado ainda</p>
          )}
          {shares.map(share => (
            <div key={share.id} className={`flex items-center gap-2 p-3 rounded-xl bg-slate-800/60 border ${share.expired ? 'border-red-900/40 opacity-60' : 'border-slate-700/60'}`}>
              <div className="flex-1 min-w-0">
                {share.label && <p className="text-xs font-medium text-slate-300 truncate">{share.label}</p>}
                <p className="text-xs text-slate-600 font-mono truncate">{share.url}</p>
                <p className="text-xs text-slate-700 mt-0.5">
                  {share.viewCount} visualizações
                  {share.expiresAt && ` · expira ${new Date(share.expiresAt).toLocaleDateString('pt-BR')}`}
                  {share.expired && <span className="text-red-500 ml-1">· expirado</span>}
                </p>
              </div>
              <button
                onClick={() => copyLink(share.url)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                title="Copiar link"
              >
                {copied === share.url ? <Check className="w-4 h-4 text-brand" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleRevoke(share.id)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-red-900/40 text-slate-600 hover:text-red-400 cursor-pointer transition-colors"
                title="Revogar link"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Botão de download individual ───────────────────────────────────────────

function DeliverableCard({
  icon,
  title,
  format,
  available,
  size,
  downloadUrl,
  filename,
  authToken,
}: {
  icon: React.ReactNode
  title: string
  format: string
  available: boolean
  size?: number
  downloadUrl: string
  filename: string
  authToken?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (!available) return
    setLoading(true)
    try {
      const res = await fetch(downloadUrl, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* noop */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`glass rounded-xl border p-4 flex flex-col gap-3 transition-all ${available ? 'border-slate-700/60 hover:border-slate-600/80' : 'border-slate-800/40 opacity-50'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${available ? 'text-brand' : 'text-slate-700'}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${available ? 'text-slate-100' : 'text-slate-600'}`}>{title}</p>
          <p className="text-xs text-slate-600 font-mono">{format}</p>
          {size != null && available && (
            <p className="text-xs text-slate-700 mt-0.5">{formatBytes(size)}</p>
          )}
        </div>
        {available && (
          <span className="text-xs bg-brand/15 text-brand border border-brand/20 px-1.5 py-0.5 rounded-full font-medium shrink-0">
            Disponível
          </span>
        )}
      </div>
      <button
        onClick={handleDownload}
        disabled={!available || loading}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors
          ${available
            ? 'bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 cursor-pointer'
            : 'bg-slate-800/40 text-slate-700 border border-slate-800 cursor-not-allowed'
          } disabled:opacity-60`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {available ? (loading ? 'Baixando...' : 'Baixar') : 'Não disponível'}
      </button>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()
  const [project, setProject]     = useState<Project | null>(null)
  const [notFound, setNotFound]   = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [exportingShp, setExportingShp] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [viewTab, setViewTab]     = useState<ViewTab>('map')

  const authToken = session?.backendToken ?? undefined

  async function handleDownloadFull() {
    setDownloading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/api/projects/${id}/download`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (!res.ok) throw new Error('Erro ao baixar')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${project?.name ?? id}_mapa.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleExportShp() {
    if (!project) return
    setExportingShp(true)
    try { await exportShapefile(project) } catch { /* ignora */ } finally { setExportingShp(false) }
  }

  async function handleCancel() {
    if (!confirm('Cancelar o processamento deste projeto?')) return
    setCancelling(true)
    try {
      await apiCancelProject(id, authToken)
      router.push(`/dashboard?cancelled=${encodeURIComponent(project?.name ?? id)}`)
    } catch (err) {
      alert(`Erro ao cancelar: ${err instanceof Error ? err.message : 'tente novamente'}`)
      setCancelling(false)
    }
  }

  const fetchProject = useCallback(async () => {
    try {
      const p = isApiAvailable()
        ? await apiGetProject(id, authToken)
        : getProject(id)
      if (p === PROJECT_NOT_FOUND) { setNotFound(true); return }
      if (!p) return
      setProject(p)
    } catch { /* ignora */ }
  }, [id, authToken])

  useEffect(() => {
    if (isApiAvailable() && authToken === undefined) return
    fetchProject()
    const interval = setInterval(async () => {
      try {
        const fresh = isApiAvailable()
          ? await apiGetProject(id, authToken)
          : getProject(id)
        if (!fresh || fresh === PROJECT_NOT_FOUND) return
        setProject({ ...fresh })
        if (fresh.status === 'completed' || fresh.status === 'failed') clearInterval(interval)
      } catch { /* ignora */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [id, authToken, fetchProject])

  const isActive = project?.status === 'uploading' || project?.status === 'processing'

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
  const info        = STATUS_INFO[project.status]
  const pInfo       = project.processingInfo
  const del         = project.deliverables
  const sizes       = project.fileSizes ?? {}
  const slug        = (project.name ?? id).replace(/[^a-z0-9]/gi, '_').toLowerCase()

  return (
    <main className="min-h-screen bg-slate-950">
      {showShare && (
        <ShareModal
          projectId={id}
          token={authToken}
          onClose={() => setShowShare(false)}
        />
      )}

      <nav className="glass border-b border-slate-800/60 px-4 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Meus mapas
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-50 truncate">{project.name}</h1>
              <StatusBadge status={project.status} />
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
            </p>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 border border-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl
                  hover:bg-slate-800 transition-colors text-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </button>
              <button
                onClick={handleDownloadFull}
                disabled={downloading}
                className="flex items-center gap-2 bg-brand text-slate-900 font-bold px-6 py-2.5 rounded-xl
                  hover:bg-green-400 transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                {downloading ? 'Baixando...' : 'Baixar tudo (.zip)'}
              </button>
            </div>
          )}
        </div>

        {/* ── Conteúdo principal ── */}
        {isCompleted && project.tilesUrl ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">

            {/* Visualizadores com abas */}
            <div className="space-y-5">
              <div className="glass rounded-2xl border border-slate-700/60 overflow-hidden self-start">

                {/* Abas */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800/60 bg-slate-900/40">
                  <button
                    onClick={() => setViewTab('map')}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewTab === 'map' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" /> Ortomosaico 2D
                  </button>

                  {del?.model3d && (
                    <button
                      onClick={() => setViewTab('model3d')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewTab === 'model3d' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <BoxIcon className="w-3.5 h-3.5" /> Modelo 3D
                      <span className="text-[10px] bg-brand/20 text-brand px-1 rounded">novo</span>
                    </button>
                  )}

                  {del?.pointcloud && (
                    <button
                      onClick={() => setViewTab('pointcloud')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewTab === 'pointcloud' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Wind className="w-3.5 h-3.5" /> Nuvem de Pontos
                      <span className="text-[10px] bg-brand/20 text-brand px-1 rounded">novo</span>
                    </button>
                  )}

                  <span className="ml-auto text-xs text-slate-700 hidden sm:block">
                    {viewTab === 'map' && 'Controles no canto superior direito'}
                    {viewTab === 'model3d' && 'Arraste para girar · Scroll para zoom'}
                    {viewTab === 'pointcloud' && 'Arraste para girar · Scroll para zoom'}
                  </span>
                </div>

                {/* Conteúdo da aba */}
                {viewTab === 'map' && (
                  <MapViewer
                    tilesUrl={project.tilesUrl}
                    dsmTilesUrl={project.dsmTilesUrl}
                    tileBounds={project.tileBounds}
                  />
                )}
                {viewTab === 'model3d' && (
                  <Model3DViewer projectId={id} />
                )}
                {viewTab === 'pointcloud' && (
                  <PointCloudViewer projectId={id} />
                )}
              </div>

              {/* Grid de entregáveis */}
              <div className="glass rounded-2xl border border-slate-700/60 p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Entregáveis
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DeliverableCard
                    icon={<Globe className="w-4 h-4" />}
                    title="Ortofoto"
                    format="GeoTIFF"
                    available={del?.orthophoto ?? false}
                    size={sizes['odm_orthophoto.tif']}
                    downloadUrl={apiDownloadUrl(id, 'orthophoto')}
                    filename={`${slug}_ortomosaico.tif`}
                    authToken={authToken}
                  />
                  <DeliverableCard
                    icon={<Mountain className="w-4 h-4" />}
                    title="MDS"
                    format="GeoTIFF · DSM"
                    available={del?.dsm ?? false}
                    size={sizes['dsm.tif']}
                    downloadUrl={apiDownloadUrl(id, 'dsm')}
                    filename={`${slug}_mds.tif`}
                    authToken={authToken}
                  />
                  <DeliverableCard
                    icon={<CloudRain className="w-4 h-4" />}
                    title="MDT"
                    format="GeoTIFF · DTM"
                    available={del?.dtm ?? false}
                    size={sizes['dtm.tif']}
                    downloadUrl={apiDownloadUrl(id, 'dtm')}
                    filename={`${slug}_mdt.tif`}
                    authToken={authToken}
                  />
                  <DeliverableCard
                    icon={<Scan className="w-4 h-4" />}
                    title="Nuvem de pontos"
                    format="LAZ / LAS"
                    available={del?.pointcloud ?? false}
                    size={sizes['pointcloud.laz'] ?? sizes['pointcloud.las']}
                    downloadUrl={apiDownloadUrl(id, 'pointcloud')}
                    filename={`${slug}_nuvem_pontos.laz`}
                    authToken={authToken}
                  />
                  <DeliverableCard
                    icon={<Box className="w-4 h-4" />}
                    title="Modelo 3D"
                    format="OBJ + textura"
                    available={del?.model3d ?? false}
                    downloadUrl={apiDownloadUrl(id, 'model3d')}
                    filename={`${slug}_modelo3d.zip`}
                    authToken={authToken}
                  />
                  <DeliverableCard
                    icon={<FileArchive className="w-4 h-4" />}
                    title="Pacote completo"
                    format=".zip · todos os arquivos"
                    available={true}
                    downloadUrl={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/projects/${id}/download`}
                    filename={`${slug}_mapa.zip`}
                    authToken={authToken}
                  />
                </div>
              </div>
            </div>

            {/* Painel lateral */}
            <div className="space-y-4">

              {/* Informações do processamento */}
              <div className="glass rounded-2xl border border-slate-700/60 p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> Processamento
                </h3>
                <dl className="space-y-3 text-sm">
                  <InfoRow icon={<Cpu className="w-3.5 h-3.5 text-brand" />}
                    label="Motor" value={pInfo?.engine ?? 'Mapeia.AI Processing'} />
                  <InfoRow icon={<Camera className="w-3.5 h-3.5 text-brand" />}
                    label="Câmera"
                    value={
                      pInfo?.isThermal
                        ? <span className="flex items-center gap-1.5">
                            <Thermometer className="w-3 h-3 text-orange-400 shrink-0" />
                            <span className="text-orange-300">
                              {[pInfo.cameraMake, pInfo.cameraModel].filter(Boolean).join(' ') || 'Thermal'}
                            </span>
                          </span>
                        : pInfo?.cameraModel ?? 'RGB'
                    }
                  />
                  <InfoRow icon={<ImageIcon className="w-3.5 h-3.5 text-brand" />}
                    label="Imagens" value={`${pInfo?.imageCount ?? project.imageCount} fotos`} />
                  {pInfo?.gsdCm != null && (
                    <InfoRow icon={<ZoomIn className="w-3.5 h-3.5 text-brand" />}
                      label="GSD" value={`${pInfo.gsdCm} cm/pixel`} highlight />
                  )}
                  {pInfo?.areaHa != null && (
                    <InfoRow icon={<AreaChart className="w-3.5 h-3.5 text-brand" />}
                      label="Área coberta" value={`${pInfo.areaHa.toLocaleString('pt-BR')} ha`} />
                  )}
                  {pInfo?.zoomRange && (
                    <InfoRow icon={<ZoomIn className="w-3.5 h-3.5 text-brand" />}
                      label="Zoom tiles" value={`${pInfo.zoomRange.min} – ${pInfo.zoomRange.max}`} />
                  )}
                  <InfoRow icon={<Layers className="w-3.5 h-3.5 text-brand" />}
                    label="Tiles XYZ" value="Disponíveis" highlight />
                </dl>
              </div>

              {/* Metadados */}
              <div className="glass rounded-2xl border border-slate-700/60 p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" /> Metadados
                </h3>
                <dl className="space-y-3 text-sm">
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
                    label="Criado em" value={formatDate(project.createdAt)} small />
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
                    label="Atualizado" value={formatDate(project.updatedAt)} small />
                  <InfoRow icon={<Hash className="w-3.5 h-3.5 text-slate-500" />}
                    label="ID" value={
                      <span className="font-mono text-xs text-slate-600">{project.id.slice(0, 12)}…</span>
                    } />
                </dl>
              </div>

              {/* Exportar footprint */}
              {project.tileBounds && (
                <div className="glass rounded-2xl border border-slate-700/60 p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Exportar footprint
                  </h3>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Polígono da área mapeada — compatível com QGIS, ArcGIS, Google Earth.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => project && exportGeoJSON(project)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800
                        hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      GeoJSON <span className="ml-auto text-slate-600 font-mono">.geojson</span>
                    </button>
                    <button
                      onClick={() => project && exportKML(project)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800
                        hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Map className="w-3.5 h-3.5 text-yellow-400" />
                      KML <span className="ml-auto text-slate-600 font-mono">.kml</span>
                    </button>
                    <button
                      onClick={handleExportShp}
                      disabled={exportingShp}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800
                        hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exportingShp
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Layers className="w-3.5 h-3.5 text-green-400" />}
                      Shapefile <span className="ml-auto text-slate-600 font-mono">.zip</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Compartilhamento */}
              <button
                onClick={() => setShowShare(true)}
                className="w-full glass rounded-2xl border border-slate-700/60 p-4 flex items-center gap-3
                  hover:border-slate-600/80 transition-colors cursor-pointer text-left"
              >
                <Share2 className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Compartilhar projeto</p>
                  <p className="text-xs text-slate-600">Gerar link público sem necessidade de login</p>
                </div>
              </button>
            </div>
          </div>

        ) : isCompleted ? (
          /* Concluído mas sem tiles */
          <div className="glass rounded-2xl border border-slate-700/60 p-12 text-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-brand mx-auto mb-5" />
            <h2 className="font-bold text-slate-100 text-xl mb-2">Processamento concluído</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
              Ortomosaico gerado. Faça o download para visualizar no QGIS ou ArcGIS.
            </p>
            <button
              onClick={handleDownloadFull}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-brand text-slate-900 font-bold
                px-8 py-3 rounded-xl hover:bg-green-400 transition-colors text-sm cursor-pointer
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
              {downloading ? 'Baixando...' : 'Baixar ortomosaico (.zip)'}
            </button>
          </div>

        ) : (
          /* Em processamento / falha */
          <div className="glass rounded-2xl border border-slate-700/60 p-12 text-center mb-6">
            <div className="flex justify-center mb-5">
              {project.status === 'pending'  && <Clock       className="w-12 h-12 text-slate-600" />}
              {isActive                      && <Loader2     className="w-12 h-12 text-brand animate-spin" />}
              {project.status === 'failed'   && <AlertCircle className="w-12 h-12 text-red-400" />}
            </div>
            <h2 className="font-bold text-slate-100 text-xl mb-2">{info?.title}</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">{info?.desc}</p>

            {isActive && (
              <div className="mt-8 max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-400 font-medium">
                    {project.phase ?? (project.status === 'uploading' ? 'Enviando fotos...' : 'Gerando ortomosaico...')}
                  </p>
                  {(project.progress ?? 0) > 0 && (
                    <span className="text-xs font-mono text-brand">{project.progress}%</span>
                  )}
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
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

                <p className="text-xs text-slate-700 mt-2 mb-5">Atualiza automaticamente a cada 3s</p>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 mx-auto text-xs text-slate-600 hover:text-red-400
                    transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  Cancelar processamento
                </button>
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
      </div>
    </main>
  )
}

function InfoRow({
  icon, label, value, small, highlight,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  small?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-slate-600 text-xs mb-0.5">{label}</dt>
        <dd className={`font-medium truncate ${small ? 'text-xs text-slate-400' : 'text-slate-200'} ${highlight ? 'text-brand' : ''}`}>
          {value}
        </dd>
      </div>
    </div>
  )
}
