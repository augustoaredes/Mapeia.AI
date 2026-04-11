declare module '@mapbox/shp-write' {
  interface GeoJSONFeatureCollection {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: { type: string; coordinates: unknown }
      properties: Record<string, unknown>
    }>
  }
  interface ShpWriteOptions {
    folder?: string
    filename?: string
    outputType?: 'uint8array' | 'base64' | 'nodebuffer'
    prj?: string
  }
  export function zip(
    geojson: GeoJSONFeatureCollection,
    options?: ShpWriteOptions,
  ): Promise<Uint8Array | string>
  export function download(geojson: GeoJSONFeatureCollection, options?: ShpWriteOptions): void
}
