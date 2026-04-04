import Link from 'next/link'
import { MapPin, ImageIcon, ArrowRight, Trash2 } from 'lucide-react'
import { Project } from '@/lib/types'
import StatusBadge from './StatusBadge'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

interface Props {
  project: Project
  onDelete?: (id: string) => void
}

export default function ProjectCard({ project, onDelete }: Props) {
  return (
    <div className="glass rounded-2xl border border-slate-700/60 hover:border-slate-600 transition-all duration-200 overflow-hidden group">
      {/* Thumbnail area */}
      <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:20px_20px]" />
        {project.status === 'completed' && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-transparent" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className={`w-8 h-8 transition-colors ${project.status === 'completed' ? 'text-brand/40' : 'text-slate-700'}`} />
        </div>
        {/* Status no canto */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-100 truncate mb-1 group-hover:text-white transition-colors">
          {project.name}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {project.imageCount} fotos
          </span>
          <span>{formatDate(project.createdAt)}</span>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/project/${project.id}`}
            className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-green-400 transition-colors cursor-pointer"
          >
            Ver mapa <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg cursor-pointer"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
