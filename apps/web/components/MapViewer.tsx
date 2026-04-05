'use client'

import { useEffect, useRef } from 'react'

interface MapViewerProps {
  /** URL base dos tiles do ortomosaico (XYZ). Ex: /tiles/{project_id}/{z}/{x}/{y}.png */
  tilesUrl?: string
  /** Latitude/longitude central do mapa */
  center?: [number, number]
  zoom?: number
}

/**
 * Visualizador de mapa usando Leaflet (carregado dinamicamente para evitar erros de SSR).
 * Quando tilesUrl é fornecido, renderiza o ortomosaico gerado pelo ODM.
 * Caso contrário, mostra o mapa base OpenStreetMap como demonstração.
 */
export default function MapViewer({
  tilesUrl,
  center = [-15.7801, -47.9292], // Brasília como default
  zoom = 15,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Garante que o container não foi inicializado pelo Leaflet (StrictMode monta 2x)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = containerRef.current as any
    if (container._leaflet_id) {
      container._leaflet_id = null
    }
    if (mapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mapRef.current as any).remove()
      mapRef.current = null
    }

    // Injeta CSS do Leaflet uma única vez
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Importa Leaflet dinamicamente (somente no cliente)
    import('leaflet').then((L) => {
      if (!containerRef.current) return

      // Corrige ícones padrão do Leaflet com Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 22,
      }).addTo(map)

      if (tilesUrl) {
        L.tileLayer(tilesUrl, {
          attribution: 'Processado por Mapeia.AI',
          maxZoom: 22,
          opacity: 1,
        }).addTo(map)
      }

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  )
}
