'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  UploadCloud, X, ImageIcon, ArrowRight, Loader2, ChevronLeft, Check,
} from 'lucide-react'
import { isApiAvailable, apiCreateProject, apiUploadImages, FreeTierError } from '@/lib/api'
import { createProject, simulateProcessing } from '@/lib/store'

const MAX_FILES = 1000
const ACCEPTED_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }

type Step = 'idle' | 'uploading' | 'done'

export default function UploadPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [files, setFiles]             = useState<File[]>([])
  const [projectName, setProjectName] = useState('')
  const [step, setStep]               = useState<Step>('idle')
  const [progress, setProgress]       = useState(0)
  const [agreed, setAgreed]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES))
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  })

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))
  const canSubmit = files.length >= 3 && projectName.trim().length > 0 && agreed && step === 'idle'

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setStep('uploading')
    setProgress(0)

    const token = session?.backendToken

    try {
      if (isApiAvailable()) {
        // ── Fluxo real (API + PostgreSQL) ──
        const project = await apiCreateProject(projectName.trim(), token)
        await apiUploadImages(project.id, files, (pct) => setProgress(pct), token)
        setStep('done')
        await new Promise((r) => setTimeout(r, 600))
        router.push('/dashboard')
      } else {
        // ── Fallback localStorage (sem backend) ──
        const project = createProject(projectName.trim(), files.length)
        simulateProcessing(project.id)
        for (let p = 0; p <= 100; p += 20) {
          setProgress(p)
          await new Promise((r) => setTimeout(r, 150))
        }
        setStep('done')
        await new Promise((r) => setTimeout(r, 400))
        router.push('/dashboard')
      }
    } catch (err) {
      if (err instanceof FreeTierError) {
        router.push('/upgrade')
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
      setStep('idle')
      setProgress(0)
    }
  }

  const isSubmitting = step === 'uploading'

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="glass border-b border-slate-800/60 px-4 py-3.5 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand font-bold text-xl tracking-tight cursor-pointer">Mapeia.AI</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Meus mapas
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-1">Novo mapa</h1>
          <p className="text-slate-400 text-sm">Envie as fotos do seu drone para gerar o ortomosaico.</p>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Nome do projeto */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Nome do projeto</label>
          <input
            type="text"
            placeholder="Ex: Fazenda São João — Novembro 2024"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100
              placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/60
              transition-all disabled:opacity-50"
          />
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-4
            ${isDragActive
              ? 'border-brand bg-brand/5 scale-[1.01]'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
            } ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-12 h-12 mx-auto mb-3 transition-colors ${isDragActive ? 'text-brand' : 'text-slate-600'}`} />
          {isDragActive ? (
            <p className="font-semibold text-brand text-lg">Solte as fotos aqui...</p>
          ) : (
            <>
              <p className="font-semibold text-slate-200 mb-1 text-lg">Arraste e solte as fotos</p>
              <p className="text-sm text-slate-500">ou <span className="text-brand underline cursor-pointer">clique para selecionar</span></p>
              <p className="text-xs text-slate-600 mt-3">JPG ou PNG · mínimo 3 fotos · máximo {MAX_FILES}</p>
            </>
          )}
        </div>

        {/* Contagem */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-slate-200">{files.length}</span>{' '}
              foto{files.length !== 1 ? 's' : ''} selecionada{files.length !== 1 ? 's' : ''}
              {files.length >= 3 && <Check className="w-3.5 h-3.5 inline ml-1.5 text-brand" />}
            </p>
            <button onClick={() => setFiles([])} className="text-xs text-red-400/70 hover:text-red-400 transition-colors cursor-pointer">
              Remover todas
            </button>
          </div>
        )}

        {/* Lista de arquivos */}
        {files.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden mb-5 max-h-60 overflow-y-auto">
            {files.slice(0, 50).map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors">
                <ImageIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
                <span className="text-xs text-slate-600 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button onClick={() => removeFile(i)} className="text-slate-700 hover:text-red-400 transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {files.length > 50 && (
              <div className="px-4 py-2.5 text-xs text-slate-600 text-center">+ {files.length - 50} fotos não exibidas</div>
            )}
          </div>
        )}

        {files.length > 0 && files.length < 3 && (
          <p className="text-sm text-amber-400/80 mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            Adicione pelo menos 3 fotos para gerar um mapa.
          </p>
        )}

        {/* Progresso de upload */}
        {isSubmitting && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Enviando fotos...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-brand h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Aceite dos termos */}
        <label className="flex items-start gap-3 mb-7 cursor-pointer group">
          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            agreed ? 'bg-brand border-brand' : 'border-slate-600 group-hover:border-slate-400'
          }`}>
            {agreed && <Check className="w-3 h-3 text-slate-900" strokeWidth={3} />}
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
          </div>
          <span className="text-sm text-slate-400 leading-relaxed">
            Declaro que tenho direito de uso das imagens e concordo com os{' '}
            <Link href="/terms" target="_blank" className="text-brand hover:underline cursor-pointer">Termos de Uso</Link>{' '}
            e a{' '}
            <Link href="/privacy" target="_blank" className="text-brand hover:underline cursor-pointer">Política de Privacidade</Link>.
          </span>
        </label>

        {/* Botão */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-brand text-slate-900 font-bold py-4 rounded-xl text-lg
            hover:bg-green-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Enviando {progress}%...</>
          ) : (
            <>Gerar mapa <ArrowRight className="w-5 h-5" /></>
          )}
        </button>

        {!isSubmitting && (
          <p className="text-center text-xs text-slate-600 mt-4">
            Primeiros 3 projetos gratuitos · sem cartão de crédito
          </p>
        )}
      </div>
    </main>
  )
}
