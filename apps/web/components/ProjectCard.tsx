import Link from 'next/link'
import { MapPin, ImageIcon, ArrowRight, Trash2 } from 'lucide-react'
import { Project } from '@/lib/types'
import StatusBadge from './StatusBadge'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  project: Project
  onDelete?: (id: string) => void
}

export default function ProjectCard({ project, onDelete }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" />
          {project.imageCount} {project.imageCount === 1 ? 'foto' : 'fotos'}
        </span>
        <span>{formatDate(project.createdAt)}</span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <Link
          href={`/project/${project.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
        >
          Ver mapa <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
            title="Excluir projeto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
