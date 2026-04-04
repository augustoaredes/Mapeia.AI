'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UploadCloud, X, ImageIcon, ArrowRight, Loader2 } from 'lucide-react'
import { createProject, simulateProcessing } from '@/lib/store'

const MAX_FILES = 1000
const ACCEPTED_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [projectName, setProjectName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...accepted]
      return combined.slice(0, MAX_FILES)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxFiles: MAX_FILES,
  })

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index))

  const canSubmit = files.length >= 3 && projectName.trim().length > 0 && agreed && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)

    // TODO (Fase 3): substituir por chamada real à API
    const project = createProject(projectName.trim(), files.length)
    simulateProcessing(project.id)

    // Simula um pequeno delay de "upload"
    await new Promise((r) => setTimeout(r, 1200))
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">Mapeia.AI</Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Meus projetos →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Novo mapa</h1>
        <p className="text-gray-500 mb-8">Envie as fotos do seu drone para gerar o mapa.</p>

        {/* Nome do projeto */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nome do projeto
          </label>
          <input
            type="text"
            placeholder="Ex: Fazenda São João — Novembro 2024"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-4
            ${isDragActive
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/30'
            }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-green-500' : 'text-gray-300'}`} />
          {isDragActive ? (
            <p className="font-semibold text-green-600">Solte as fotos aqui...</p>
          ) : (
            <>
              <p className="font-semibold text-gray-700 mb-1">
                Arraste e solte as fotos aqui
              </p>
              <p className="text-sm text-gray-400">
                ou <span className="text-green-600 underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-3">JPG ou PNG · mínimo 3 fotos · máximo {MAX_FILES}</p>
            </>
          )}
        </div>

        {/* Contagem */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{files.length}</span> foto{files.length !== 1 ? 's' : ''} selecionada{files.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-400 hover:text-red-500 transition-colors"
            >
              Remover todas
            </button>
          </div>
        )}

        {/* Lista de arquivos */}
        {files.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6 max-h-64 overflow-y-auto">
            {files.slice(0, 50).map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <ImageIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {files.length > 50 && (
              <div className="px-4 py-2.5 text-xs text-gray-400 text-center">
                + {files.length - 50} fotos não exibidas
              </div>
            )}
          </div>
        )}

        {/* Aviso mínimo */}
        {files.length > 0 && files.length < 3 && (
          <p className="text-sm text-amber-600 mb-4">
            Adicione pelo menos 3 fotos para gerar um mapa.
          </p>
        )}

        {/* Aceite dos termos */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-green-600"
          />
          <span className="text-sm text-gray-500">
            Declaro que tenho direito de uso das imagens enviadas e concordo com os{' '}
            <Link href="/terms" target="_blank" className="text-green-600 underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" target="_blank" className="text-green-600 underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {/* Botão de envio */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-xl
            hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Gerar mapa <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {files.length < 3 && !submitting && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Primeiros 3 projetos gratuitos · sem cartão de crédito
          </p>
        )}
      </div>
    </main>
  )
}
