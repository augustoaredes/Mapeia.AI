import { ProjectStatus } from '@/lib/types'

const config: Record<ProjectStatus, { label: string; dot: string; className: string }> = {
  pending:    { label: 'Aguardando',      dot: 'bg-slate-500',  className: 'bg-slate-800 text-slate-400 border-slate-700' },
  uploading:  { label: 'Enviando...',     dot: 'bg-blue-400',   className: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  processing: { label: 'Processando...', dot: 'bg-yellow-400', className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  completed:  { label: 'Concluído',       dot: 'bg-brand',      className: 'bg-brand/10 text-brand border-brand/20' },
  failed:     { label: 'Falhou',          dot: 'bg-red-400',    className: 'bg-red-500/10 text-red-300 border-red-500/20' },
}

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, dot, className } = config[status]
  const isActive = status === 'uploading' || status === 'processing'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot} ${isActive ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
