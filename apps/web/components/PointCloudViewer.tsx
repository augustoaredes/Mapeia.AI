'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, Maximize2, Minimize2, Layers } from 'lucide-react'

interface Props {
  projectId: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

type ColorMode = 'rgb' | 'height' | 'intensity'

export default function PointCloudViewer({ projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<unknown>(null)
  const frameRef     = useRef<number>(0)
  const sceneRef     = useRef<unknown>(null)
  const cameraRef    = useRef<unknown>(null)
  const pointsRef    = useRef<unknown>(null)

  const [status, setStatus]         = useState<'loading' | 'ready' | 'error'>('loading')
  const [pointCount, setPointCount] = useState(0)
  const [hasColor, setHasColor]     = useState(false)
  const [colorMode, setColorMode]   = useState<ColorMode>('rgb')
  const [fullscreen, setFullscreen] = useState(false)
  const [pointSize, setPointSize]   = useState(2)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/pointcloud/preview`)
        if (!res.status || res.status === 404) throw new Error('Preview não disponível. Faça o download do arquivo completo.')
        if (!res.ok) throw new Error('Erro ao carregar preview')

        const buf  = await res.arrayBuffer()
        const view = new DataView(buf)

        const count    = view.getUint32(0, true)
        const flags    = view.getUint8(4)
        const hColor   = (flags & 1) === 1
        // centroid at bytes 5,13,21 (float64) — not needed for display (already subtracted)
        const dataOff  = 29
        const colorOff = dataOff + count * 12

        setPointCount(count)
        setHasColor(hColor)
        if (!hColor) setColorMode('height')

        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js' as string) as {
          OrbitControls: new (camera: unknown, dom: HTMLElement) => {
            update: () => void; dispose: () => void; enableDamping: boolean; dampingFactor: number
          }
        }

        if (cancelled || !containerRef.current) return

        const W = containerRef.current.clientWidth
        const H = containerRef.current.clientHeight || 480

        const scene    = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0f1a)
        sceneRef.current = scene

        const camera   = new THREE.PerspectiveCamera(50, W / H, 0.01, 50000)
        camera.position.set(0, 30, 80)
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(W, H)
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Eixo de referência
        scene.add(new THREE.AxesHelper(10))

        // ── Geometria ────────────────────────────────────────────────────
        const positions = new Float32Array(buf, dataOff, count * 3)
        const colors    = hColor ? new Float32Array(buf, colorOff, count * 3) : null

        // Cria array de cores inicial
        const colorArr = new Float32Array(count * 3)

        // Calcula min/max Z para colormap de altura
        let minZ = Infinity, maxZ = -Infinity
        for (let i = 0; i < count; i++) {
          const z = positions[i * 3 + 1] // Three.js usa Y como vertical
          if (z < minZ) minZ = z
          if (z > maxZ) maxZ = z
        }

        const applyHeightColor = () => {
          const range = maxZ - minZ || 1
          for (let i = 0; i < count; i++) {
            const t = (positions[i * 3 + 1] - minZ) / range
            colorArr[i * 3]     = Math.min(1, Math.max(0, t * 2))
            colorArr[i * 3 + 1] = Math.min(1, Math.max(0, 1 - Math.abs(t - 0.5) * 2))
            colorArr[i * 3 + 2] = Math.min(1, Math.max(0, 1 - t * 2))
          }
        }

        const applyRgbColor = () => {
          if (!colors) return
          colorArr.set(colors)
        }

        if (hColor) applyRgbColor(); else applyHeightColor()

        const geometry = new THREE.BufferGeometry()
        // LAS: X=este, Y=norte, Z=altura → Three.js: X=direita, Y=cima, Z=profundidade
        // Remapeia: Three.js Y = LAS Z, Three.js Z = LAS Y (negado)
        const remapped = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          remapped[i * 3]     = positions[i * 3]      // X
          remapped[i * 3 + 1] = positions[i * 3 + 2]  // LAS Z → Three.js Y
          remapped[i * 3 + 2] = -positions[i * 3 + 1] // LAS Y → Three.js -Z
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(remapped, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArr.slice(), 3))

        const material = new THREE.PointsMaterial({
          size: 0.1, vertexColors: true, sizeAttenuation: true,
        })

        const points = new THREE.Points(geometry, material)
        scene.add(points)
        pointsRef.current = points

        // Centra câmera
        geometry.computeBoundingSphere()
        const sphere = geometry.boundingSphere!
        camera.position.set(
          sphere.center.x,
          sphere.center.y + sphere.radius * 0.5,
          sphere.center.z + sphere.radius * 2,
        )
        camera.lookAt(sphere.center)

        setStatus('ready')

        const animate = () => {
          if (cancelled) return
          frameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        const onResize = () => {
          if (!containerRef.current) return
          const W = containerRef.current.clientWidth
          const H = containerRef.current.clientHeight || 480
          camera.aspect = W / H
          camera.updateProjectionMatrix()
          renderer.setSize(W, H)
        }
        window.addEventListener('resize', onResize)
        return () => { window.removeEventListener('resize', onResize); controls.dispose() }

      } catch (err) {
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
      if (rendererRef.current) {
        const r = rendererRef.current as { dispose: () => void; domElement: HTMLElement }
        r.domElement.remove()
        r.dispose()
        rendererRef.current = null
      }
    }
  }, [projectId])

  // Atualiza tamanho dos pontos
  useEffect(() => {
    if (!pointsRef.current) return
    const pts = pointsRef.current as { material: { size: number; needsUpdate: boolean } }
    pts.material.size = pointSize * 0.05
    pts.material.needsUpdate = true
  }, [pointSize])

  // Atualiza modo de cor
  useEffect(() => {
    if (!pointsRef.current || status !== 'ready') return
    // Re-renderizar exige atualizar attribute color — simplificado: recarregar página
  }, [colorMode, status])

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    return () => clearTimeout(t)
  }, [fullscreen])

  return (
    <div className={`relative ${fullscreen ? 'fixed inset-0 z-[9999] bg-slate-950' : 'w-full'}`}>

      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 flex-wrap justify-end">
        {status === 'ready' && (
          <>
            {/* Tamanho dos pontos */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-lg">
              <Layers className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-400">Pts</span>
              <input
                type="range" min={1} max={8} value={pointSize}
                onChange={e => setPointSize(Number(e.target.value))}
                className="w-16 accent-brand h-1"
              />
            </div>
          </>
        )}
        <button
          onClick={() => setFullscreen(v => !v)}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg"
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 rounded-2xl gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <p className="text-sm text-slate-400">Carregando nuvem de pontos...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 rounded-2xl gap-3 px-8 text-center">
          <AlertCircle className="w-8 h-8 text-slate-600" />
          <p className="text-sm text-slate-500">Preview não disponível.</p>
          <p className="text-xs text-slate-600">Faça o download do arquivo LAZ/LAS para visualizar no CloudCompare ou QGIS.</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: fullscreen ? '100vh' : '480px' }}
      />

      {/* Info overlay */}
      {status === 'ready' && (
        <div className="absolute bottom-3 left-3 flex items-center gap-3 pointer-events-none">
          <span className="text-xs text-slate-600 bg-slate-900/70 px-2 py-1 rounded-lg">
            {pointCount.toLocaleString('pt-BR')} pontos (preview)
            {hasColor ? ' · RGB' : ' · colorido por altitude'}
          </span>
        </div>
      )}

      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg"
        >
          ESC — Sair
        </button>
      )}
    </div>
  )
}
