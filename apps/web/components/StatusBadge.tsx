import { ProjectStatus } from '@/lib/types'

const config: Record<ProjectStatus, { label: string; className: string }> = {
  pending:    { label: 'Aguardando',     className: 'bg-gray-100 text-gray-600' },
  uploading:  { label: 'Enviando...',    className: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processando...', className: 'bg-yellow-100 text-yellow-700' },
  completed:  { label: 'Concluído',      className: 'bg-green-100 text-green-700' },
  failed:     { label: 'Falhou',         className: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>
      {(status === 'uploading' || status === 'processing') && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  )
}
