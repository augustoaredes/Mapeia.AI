'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, Maximize2, Minimize2, Eye, EyeOff, Ruler, AreaChart, Trash2, CheckCircle2 } from 'lucide-react'

interface MapViewerProps {
  tilesUrl?: string
  dsmTilesUrl?: string
  tileBounds?: [[number, number], [number, number]]
}

type BaseMap    = 'osm' | 'satellite' | 'none'
type MeasureMode = null | 'distance' | 'area'

const BASE_LAYERS = {
  osm:       { label: 'Mapa',      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap' },
  satellite: { label: 'Satélite',  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri' },
}

// Distância geodésica entre dois pontos (metros)
function haversine(a: [number, number], b: [number, number]): number {
  const R  = 6371000
  const φ1 = (a[0] * Math.PI) / 180, φ2 = (b[0] * Math.PI) / 180
  const dφ = ((b[0] - a[0]) * Math.PI) / 180
  const dλ = ((b[1] - a[1]) * Math.PI) / 180
  const s  = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Área de polígono esférico (m²) — fórmula de Gauss
function polygonArea(pts: [number, number][]): number {
  if (pts.length < 3) return 0
  const R   = 6371000
  let area  = 0
  const n   = pts.length
  for (let i = 0; i < n; i++) {
    const j    = (i + 1) % n
    const lat1 = (pts[i][0] * Math.PI) / 180
    const lat2 = (pts[j][0] * Math.PI) / 180
    const dLon = ((pts[j][1] - pts[i][1]) * Math.PI) / 180
    area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  return Math.abs((area * R * R) / 2)
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${m.toFixed(1)} m` : `${(m / 1000).toFixed(3)} km`
}
function fmtArea(m2: number): string {
  return m2 < 10000 ? `${m2.toFixed(1)} m²` : `${(m2 / 10000).toFixed(4)} ha`
}

export default function MapViewer({ tilesUrl, dsmTilesUrl, tileBounds }: MapViewerProps) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<unknown>(null)
  const orthoLayerRef   = useRef<unknown>(null)
  const dsmLayerRef     = useRef<unknown>(null)
  const baseLayerRef    = useRef<unknown>(null)
  const measureGroupRef = useRef<unknown>(null) // LayerGroup para medição

  const [opacity,     setOpacity]     = useState(100)
  const [dsmOpacity,  setDsmOpacity]  = useState(80)
  const [baseMap,     setBaseMap]     = useState<BaseMap>('satellite')
  const [showOrtho,   setShowOrtho]   = useState(true)
  const [showDsm,     setShowDsm]     = useState(false)
  const [showPanel,   setShowPanel]   = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)
  const [measureMode, setMeasureMode] = useState<MeasureMode>(null)
  const [measurePts,  setMeasurePts]  = useState<[number, number][]>([])
  const [measureDone, setMeasureDone] = useState(false)

  // ── Inicializa mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    if (mapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mapRef.current as any).remove()
      mapRef.current = null
      orthoLayerRef.current   = null
      dsmLayerRef.current     = null
      baseLayerRef.current    = null
      measureGroupRef.current = null
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center: [number, number] = tileBounds
        ? [(tileBounds[0][0] + tileBounds[1][0]) / 2, (tileBounds[0][1] + tileBounds[1][1]) / 2]
        : [-15.7801, -47.9292]

      const map = L.map(containerRef.current, {
        center, zoom: tileBounds ? 15 : 4,
        zoomControl: true, attributionControl: true,
      })

      L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map)

      const satLayer = L.tileLayer(BASE_LAYERS.satellite.url, {
        attribution: BASE_LAYERS.satellite.attr, maxZoom: 22,
      }).addTo(map)
      baseLayerRef.current = satLayer

      if (tilesUrl) {
        const ortho = L.tileLayer(tilesUrl, {
          attribution: 'Ortomosaico — Mapeia.AI', minZoom: 1, maxZoom: 22, opacity: 1,
        }).addTo(map)
        orthoLayerRef.current = ortho
      }

      if (dsmTilesUrl) {
        const dsm = L.tileLayer(dsmTilesUrl, {
          attribution: 'DSM — Mapeia.AI', minZoom: 1, maxZoom: 22, opacity: 0,
        }).addTo(map)
        dsmLayerRef.current = dsm
      }

      if (tileBounds) map.fitBounds(tileBounds, { padding: [40, 40] })

      // Layer group para elementos de medição
      const grp = L.layerGroup().addTo(map)
      measureGroupRef.current = grp

      mapRef.current = map
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Opacidade ortomosaico ────────────────────────────────────────────────
  useEffect(() => {
    if (!orthoLayerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(orthoLayerRef.current as any).setOpacity(showOrtho ? opacity / 100 : 0)
  }, [opacity, showOrtho])

  // ── Opacidade DSM ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dsmLayerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(dsmLayerRef.current as any).setOpacity(showDsm ? dsmOpacity / 100 : 0)
  }, [dsmOpacity, showDsm])

  // ── Troca mapa base ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any
    import('leaflet').then((L) => {
      if (baseLayerRef.current) { map.removeLayer(baseLayerRef.current); baseLayerRef.current = null }
      if (baseMap === 'none') return
      const cfg   = BASE_LAYERS[baseMap]
      const layer = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: 22 })
      layer.addTo(map)
      if (orthoLayerRef.current) (orthoLayerRef.current as any).bringToFront()
      baseLayerRef.current = layer
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMap])

  // ── Fullscreen resize ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { (mapRef.current as any)?.invalidateSize() }, 200)
    return () => clearTimeout(t)
  }, [fullscreen])

  // ── Ferramenta de medição ────────────────────────────────────────────────
  const clearMeasure = useCallback(() => {
    import('leaflet').then((L) => {
      if (measureGroupRef.current) (measureGroupRef.current as any).clearLayers()
      setMeasurePts([])
      setMeasureDone(false)
      // Cursor normal
      if (mapRef.current) (mapRef.current as any).getContainer().style.cursor = ''
    })
  }, [])

  const stopMeasure = useCallback(() => {
    setMeasureMode(null)
    setMeasureDone(true)
    if (mapRef.current) (mapRef.current as any).getContainer().style.cursor = ''
  }, [])

  // Redesenha elementos de medição quando os pontos mudam
  useEffect(() => {
    if (!measureGroupRef.current || !mapRef.current) return

    import('leaflet').then((L) => {
      const grp = measureGroupRef.current as any
      grp.clearLayers()
      if (measurePts.length === 0) return

      const map = mapRef.current as any

      // Marcadores nos pontos
      measurePts.forEach((pt, i) => {
        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:${i === 0 ? '#22c55e' : '#3b82f6'};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.5)"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        })
        L.marker(pt as any, { icon: dotIcon }).addTo(grp)
      })

      if (measureMode === 'distance' || measureDone) {
        // Linha de distância
        if (measurePts.length >= 2) {
          const polyline = L.polyline(measurePts as any, {
            color: '#3b82f6', weight: 2.5, dashArray: '6 4', opacity: 0.9,
          }).addTo(grp)

          // Label de distância acumulada em cada segmento
          let total = 0
          for (let i = 1; i < measurePts.length; i++) {
            const d     = haversine(measurePts[i - 1], measurePts[i])
            total      += d
            const mid: [number, number] = [
              (measurePts[i - 1][0] + measurePts[i][0]) / 2,
              (measurePts[i - 1][1] + measurePts[i][1]) / 2,
            ]
            const lbl = L.divIcon({
              className: '',
              html: `<div style="background:rgba(15,23,42,.85);color:#93c5fd;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;border:1px solid #3b82f6">${fmtDistance(d)}</div>`,
              iconAnchor: [30, 10],
            })
            L.marker(mid as any, { icon: lbl }).addTo(grp)
          }
        }
      }

      if (measureMode === 'area' || (measureDone && measurePts.length >= 3)) {
        // Polígono de área
        if (measurePts.length >= 3) {
          L.polygon(measurePts as any, {
            color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15,
            weight: 2.5, dashArray: '6 4',
          }).addTo(grp)
        }
        // Linha de preview até o início (só durante medição)
        if (measureMode === 'area' && measurePts.length >= 2) {
          L.polyline([measurePts[measurePts.length - 1], measurePts[0]] as any, {
            color: '#22c55e', weight: 1.5, dashArray: '4 4', opacity: 0.5,
          }).addTo(grp)
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurePts, measureMode, measureDone])

  // Handler de clique no mapa para medição
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current as any

    if (!measureMode) {
      map.off('click')
      map.getContainer().style.cursor = ''
      return
    }

    map.getContainer().style.cursor = 'crosshair'
    map.off('click')
    map.on('click', (e: any) => {
      setMeasurePts(prev => [...prev, [e.latlng.lat, e.latlng.lng]])
    })

    return () => { map.off('click'); map.getContainer().style.cursor = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureMode])

  // Resultado da medição atual
  const measureResult = (() => {
    if (measurePts.length < 2) return null
    if (measureMode === 'distance' || (measureDone && measureMode === null)) {
      const total = measurePts.reduce((sum, pt, i) =>
        i === 0 ? 0 : sum + haversine(measurePts[i - 1], pt), 0)
      return { label: 'Distância total', value: fmtDistance(total) }
    }
    if (measureMode === 'area' && measurePts.length >= 3) {
      return { label: 'Área', value: fmtArea(polygonArea(measurePts)) }
    }
    return null
  })()

  const activateMeasure = (mode: MeasureMode) => {
    clearMeasure()
    setMeasureMode(mode)
    setMeasureDone(false)
    setShowPanel(false)
  }

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${fullscreen ? 'fixed inset-0 z-[9999] bg-slate-950' : 'w-full'}`}>

      {/* Barra de ferramentas */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2 flex-wrap justify-end">

        {/* Medir distância */}
        <button
          onClick={() => measureMode === 'distance' ? stopMeasure() : activateMeasure('distance')}
          title="Medir distância"
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg
            border shadow-lg transition-colors
            ${measureMode === 'distance'
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-slate-900/90 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800'}`}
        >
          <Ruler className="w-3.5 h-3.5" />
          {measureMode === 'distance' ? 'Concluir' : 'Distância'}
        </button>

        {/* Medir área */}
        <button
          onClick={() => measureMode === 'area' ? stopMeasure() : activateMeasure('area')}
          title="Medir área"
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg
            border shadow-lg transition-colors
            ${measureMode === 'area'
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-slate-900/90 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800'}`}
        >
          <AreaChart className="w-3.5 h-3.5" />
          {measureMode === 'area' ? 'Concluir' : 'Área'}
        </button>

        {/* Limpar medições */}
        {measurePts.length > 0 && (
          <button onClick={clearMeasure} title="Limpar medições"
            className="flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-700
              text-red-400 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Painel de camadas */}
        <div className="relative">
          <button onClick={() => setShowPanel(v => !v)}
            className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700
              text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg">
            <Layers className="w-3.5 h-3.5" /> Camadas
          </button>

          {showPanel && (
            <div className="absolute top-full right-0 mt-1.5 w-60 bg-slate-900/95 backdrop-blur
              border border-slate-700 rounded-xl shadow-xl p-3 space-y-3">

              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Mapa base</p>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { id: 'satellite', label: 'Satélite' },
                    { id: 'osm',       label: 'Mapa' },
                    { id: 'none',      label: 'Nenhum' },
                  ] as { id: BaseMap; label: string }[]).map(({ id, label }) => (
                    <button key={id} onClick={() => setBaseMap(id)}
                      className={`text-xs py-1.5 rounded-lg font-medium transition-colors
                        ${baseMap === id ? 'bg-brand text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                {/* Ortomosaico */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Ortomosaico</span>
                    <button onClick={() => setShowOrtho(v => !v)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${showOrtho ? 'bg-brand' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showOrtho ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {showOrtho && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Opacidade</span><span className="font-mono">{opacity}%</span>
                      </div>
                      <input type="range" min={10} max={100} value={opacity}
                        onChange={e => setOpacity(Number(e.target.value))}
                        className="w-full accent-brand h-1" />
                    </div>
                  )}
                </div>

                {/* DSM */}
                {dsmTilesUrl && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-300">DSM</span>
                        <span className="ml-1.5 text-[10px] text-slate-600 font-normal">Elevação</span>
                      </div>
                      <button onClick={() => setShowDsm(v => !v)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${showDsm ? 'bg-amber-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showDsm ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {showDsm && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Opacidade</span><span className="font-mono">{dsmOpacity}%</span>
                        </div>
                        <input type="range" min={10} max={100} value={dsmOpacity}
                          onChange={e => setDsmOpacity(Number(e.target.value))}
                          className="w-full accent-amber-500 h-1" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="border-t border-slate-800 pt-2 text-xs text-slate-600">
                Scroll para zoom · Arraste para mover
              </p>
            </div>
          )}
        </div>

        <button onClick={() => setShowOrtho(v => !v)}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700
            text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg">
          {showOrtho ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button onClick={() => setFullscreen(v => !v)}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700
            text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg">
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Resultado da medição */}
      {measureResult && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]
          bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl px-4 py-2.5
          flex items-center gap-3 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
          <span className="text-xs text-slate-400">{measureResult.label}:</span>
          <span className="text-sm font-bold text-slate-100">{measureResult.value}</span>
          {measureMode && (
            <span className="text-xs text-slate-600 ml-1">Clique para adicionar pontos</span>
          )}
        </div>
      )}

      {/* Instrução durante medição */}
      {measureMode && measurePts.length === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]
          bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-2 shadow-lg">
          <p className="text-xs text-slate-400">
            {measureMode === 'distance' ? '📏 Clique no mapa para marcar pontos da distância' : '📐 Clique no mapa para marcar os vértices da área'}
          </p>
        </div>
      )}

      {/* Container do mapa */}
      <div ref={containerRef} className="w-full rounded-2xl overflow-hidden"
        style={{ height: fullscreen ? '100vh' : '480px' }} />

      {fullscreen && (
        <button onClick={() => setFullscreen(false)}
          className="absolute bottom-4 right-4 z-[1001] bg-slate-900/90 backdrop-blur
            border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg">
          ESC — Sair
        </button>
      )}
    </div>
  )
}
