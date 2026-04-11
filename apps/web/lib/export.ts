/**
 * export.ts — utilitários client-side para exportar o footprint do ortomosaico
 * como GeoJSON, KML ou Shapefile.
 *
 * tileBounds = [[minLat, minLng], [maxLat, maxLng]]
 * GeoJSON/KML usam coordenadas [lng, lat] (ordem x, y)
 */

import { Project } from './types'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Cria o anel fechado do polígono retangular do footprint */
function boundsToRing(
  bounds: [[number, number], [number, number]],
): [number, number][] {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds
  return [
    [minLng, minLat], // SW
    [maxLng, minLat], // SE
    [maxLng, maxLat], // NE
    [minLng, maxLat], // NW
    [minLng, minLat], // fechamento
  ]
}

function triggerDownload(content: string | Uint8Array, filename: string, mime: string) {
  const blob = content instanceof Uint8Array
    ? new Blob([content.buffer as ArrayBuffer], { type: mime })
    : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── GeoJSON ──────────────────────────────────────────────────────────────────

export function exportGeoJSON(project: Project): void {
  if (!project.tileBounds) return

  const ring = boundsToRing(project.tileBounds)
  const geojson = {
    type: 'FeatureCollection',
    name: project.name,
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
        properties: {
          name:          project.name,
          project_id:    project.id,
          processed_at:  project.updatedAt,
          image_count:   project.imageCount,
          engine:        project.processingInfo?.engine ?? 'OpenDroneMap',
          is_thermal:    project.processingInfo?.isThermal ?? false,
          area_ha:       project.processingInfo?.areaHa ?? null,
          source:        'Mapeia.AI',
        },
      },
    ],
  }

  triggerDownload(
    JSON.stringify(geojson, null, 2),
    `${project.name}_footprint.geojson`,
    'application/geo+json',
  )
}

// ── KML ──────────────────────────────────────────────────────────────────────

export function exportKML(project: Project): void {
  if (!project.tileBounds) return

  const ring = boundsToRing(project.tileBounds)
  // KML usa "lat,lng,alt" mas coordenadas do GeoJSON são [lng,lat]
  const coords = ring.map(([lng, lat]) => `${lng},${lat},0`).join(' ')

  const desc = [
    `Imagens: ${project.imageCount}`,
    project.processingInfo?.areaHa ? `Área: ${project.processingInfo.areaHa} ha` : '',
    project.processingInfo?.isThermal ? `Câmera: thermal` : '',
    `Processado em: ${new Date(project.updatedAt).toLocaleDateString('pt-BR')}`,
    `Fonte: Mapeia.AI`,
  ].filter(Boolean).join('&#10;')

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name)}</name>
    <Style id="ortho">
      <LineStyle><color>ff22c55e</color><width>2</width></LineStyle>
      <PolyStyle><color>4022c55e</color></PolyStyle>
    </Style>
    <Placemark>
      <name>${escapeXml(project.name)}</name>
      <description>${desc}</description>
      <styleUrl>#ortho</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`

  triggerDownload(kml, `${project.name}_footprint.kml`, 'application/vnd.google-earth.kml+xml')
}

// ── Shapefile ────────────────────────────────────────────────────────────────

export async function exportShapefile(project: Project): Promise<void> {
  if (!project.tileBounds) return

  const ring = boundsToRing(project.tileBounds)

  // shp-write espera GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
        properties: {
          name:       project.name,
          area_ha:    project.processingInfo?.areaHa ?? 0,
          thermal:    project.processingInfo?.isThermal ? 1 : 0,
          images:     project.imageCount,
          source:     'Mapeia.AI',
        },
      },
    ],
  }

  const shpWrite = (await import('@mapbox/shp-write')).default ?? await import('@mapbox/shp-write')
  const zipData  = await shpWrite.zip(geojson, {
    folder:   project.name,
    filename: `${project.name}_footprint`,
    outputType: 'uint8array',
  })

  triggerDownload(zipData as Uint8Array, `${project.name}_footprint.zip`, 'application/zip')
}

// ── Util ─────────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
