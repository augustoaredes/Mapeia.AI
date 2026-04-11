'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, RotateCcw, Maximize2, Minimize2, Sun, SunDim } from 'lucide-react'

interface Props {
  projectId: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function Model3DViewer({ projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<unknown>(null)
  const frameRef     = useRef<number>(0)

  const [status, setStatus]       = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg]   = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [wireframe, setWireframe]  = useState(false)
  const [brightness, setBrightness] = useState(1)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        // Descobre qual OBJ está disponível
        const listRes = await fetch(`${API_URL}/api/projects/${projectId}/model3d`)
        if (!listRes.ok) throw new Error('Modelo 3D não disponível')
        const { files } = await listRes.json() as { files: string[] }

        const objFile = files.find(f => f.toLowerCase().endsWith('.obj'))
        const mtlFile = files.find(f => f.toLowerCase().endsWith('.mtl'))
        if (!objFile) throw new Error('Arquivo OBJ não encontrado')

        const baseUrl = `${API_URL}/api/projects/${projectId}/model3d/file/`

        const THREE = await import('three')
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js' as string) as { OBJLoader: new () => { setMaterials: (m: unknown) => void; load: (url: string, onLoad: (obj: unknown) => void, onProg?: (e: ProgressEvent) => void, onErr?: (e: ErrorEvent) => void) => void } }
        const { MTLLoader } = await import('three/examples/jsm/loaders/MTLLoader.js' as string) as { MTLLoader: new () => { setPath: (p: string) => void; load: (url: string, onLoad: (m: unknown) => void) => void } }
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js' as string) as { OrbitControls: new (camera: unknown, dom: HTMLElement) => { update: () => void; dispose: () => void; target: unknown; enableDamping: boolean; dampingFactor: number } }

        if (cancelled || !containerRef.current) return

        const W = containerRef.current.clientWidth
        const H = containerRef.current.clientHeight || 480

        // ── Cena ──────────────────────────────────────────────────────────
        const scene    = new THREE.Scene()
        scene.background = new THREE.Color(0x0f172a)

        const camera   = new THREE.PerspectiveCamera(45, W / H, 0.001, 10000)
        camera.position.set(0, 0, 5)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(W, H)
        renderer.shadowMap.enabled = true
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // ── Controles ─────────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor  = 0.05

        // ── Iluminação ────────────────────────────────────────────────────
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient)

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
        dirLight.position.set(5, 10, 7)
        dirLight.castShadow = true
        scene.add(dirLight)

        // ── Grid helper ──────────────────────────────────────────────────
        const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b)
        scene.add(grid)

        // ── Carrega modelo ────────────────────────────────────────────────
        const loadModel = () => new Promise<void>((resolve, reject) => {
          const objLoader = new OBJLoader()

          const finishLoad = (obj: unknown) => {
            if (cancelled) return
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const object = obj as any

            // Centraliza e escala para caber na view
            const box    = new THREE.Box3().setFromObject(object)
            const size   = box.getSize(new THREE.Vector3())
            const center = box.getCenter(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale  = 4 / maxDim

            object.position.sub(center.multiplyScalar(scale))
            object.scale.setScalar(scale)
            scene.add(object)

            // Posiciona câmera e grid
            camera.position.set(0, size.y * scale * 0.5, maxDim * scale * 1.5)
            camera.lookAt(0, 0, 0)
            grid.position.y = -size.y * scale * 0.5

            setStatus('ready')
            resolve()
          }

          if (mtlFile) {
            const mtlLoader = new MTLLoader()
            mtlLoader.setPath(baseUrl)
            mtlLoader.load(mtlFile, (materials: unknown) => {
              (materials as { preload: () => void }).preload()
              objLoader.setMaterials(materials)
              objLoader.load(baseUrl + objFile, finishLoad, undefined, () => {
                // Fallback sem materiais
                const o = new OBJLoader()
                o.load(baseUrl + objFile, finishLoad, undefined, reject as (e: ErrorEvent) => void)
              })
            })
          } else {
            objLoader.load(baseUrl + objFile, finishLoad, undefined, reject as (e: ErrorEvent) => void)
          }
        })

        await loadModel()

        // ── Render loop ───────────────────────────────────────────────────
        const animate = () => {
          if (cancelled) return
          frameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // ── Resize ────────────────────────────────────────────────────────
        const onResize = () => {
          if (!containerRef.current) return
          const W = containerRef.current.clientWidth
          const H = containerRef.current.clientHeight || 480
          camera.aspect = W / H
          camera.updateProjectionMatrix()
          renderer.setSize(W, H)
        }
        window.addEventListener('resize', onResize)

        return () => {
          window.removeEventListener('resize', onResize)
          controls.dispose()
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg((err as Error).message ?? 'Erro ao carregar modelo')
          setStatus('error')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
      if (rendererRef.current) {
        const renderer = rendererRef.current as { dispose: () => void; domElement: HTMLElement }
        renderer.domElement.remove()
        renderer.dispose()
        rendererRef.current = null
      }
    }
  }, [projectId])

  // Resize on fullscreen toggle
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 200)
    return () => clearTimeout(t)
  }, [fullscreen])

  return (
    <div className={`relative ${fullscreen ? 'fixed inset-0 z-[9999] bg-slate-950' : 'w-full'}`}>

      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => setWireframe(v => !v)}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border shadow-lg transition-colors
            ${wireframe ? 'bg-brand text-slate-900 border-brand' : 'bg-slate-900/90 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800'}`}
          title="Wireframe"
        >
          Wire
        </button>
        <button
          onClick={() => setBrightness(v => v === 1 ? 1.8 : 1)}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg"
          title="Brilho"
        >
          {brightness > 1 ? <Sun className="w-3.5 h-3.5" /> : <SunDim className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('reset-3d-camera'))}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg"
          title="Resetar câmera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFullscreen(v => !v)}
          className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800 shadow-lg"
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Estado de loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 rounded-2xl gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <p className="text-sm text-slate-400">Carregando modelo 3D...</p>
          <p className="text-xs text-slate-600">Pode levar alguns segundos</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 rounded-2xl gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-slate-400">{errorMsg}</p>
        </div>
      )}

      {/* Container Three.js */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: fullscreen ? '100vh' : '480px' }}
      />

      {status === 'ready' && (
        <p className="absolute bottom-3 left-3 text-xs text-slate-600 pointer-events-none">
          Arraste para girar · Scroll para zoom · Botão direito para mover
        </p>
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
