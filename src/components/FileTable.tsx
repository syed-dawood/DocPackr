'use client'
import { Button } from '@/components/ui/button'
import { prettyBytes } from '@/lib/format'
import { FileItem } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  items: FileItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onSuggest?: (id: string) => void
}

export default function FileTable({ items, selectedId, onSelect, onRemove, onSuggest }: Props) {
  return (
    <div className="rounded-2xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Original</th>
            <th className="px-4 py-2">Est. Compressed</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                No files added yet
              </td>
            </tr>
          )}
          {items.map((it) => (
            <tr
              key={it.id}
              className={cn(
                'border-t hover:bg-accent/30 cursor-pointer',
                selectedId === it.id && 'bg-accent/30',
              )}
              onClick={() => onSelect(it.id)}
              aria-selected={selectedId === it.id}
            >
              <td className="truncate px-4 py-3" title={it.name}>
                {it.name}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {it.kind.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3">{prettyBytes(it.originalBytes)}</td>
              <td className="px-4 py-3">
                {it.finalBytes
                  ? `${prettyBytes(it.finalBytes)} (${delta(it.originalBytes, it.finalBytes)})`
                  : it.estBytes
                    ? `${prettyBytes(it.estBytes)} (${delta(it.originalBytes, it.estBytes)})`
                    : '—'}
              </td>
              <td className="px-4 py-3">
                {it.serverRecommended ? (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                    lightly optimized / server recommended
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs',
                      it.status === 'queued' && 'bg-secondary',
                      it.status === 'ready' && 'bg-primary text-primary-foreground',
                      it.status === 'error' && 'bg-red-600 text-white',
                    )}
                  >
                    {it.status === 'queued' ? 'Queued' : it.status === 'ready' ? 'Ready' : 'Error'}
                  </span>
                )}
              </td>
              <td className="space-x-1 px-4 py-3 text-right">
                {onSuggest && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSuggest(it.id)
                    }}
                    title="Suggest from OCR"
                  >
                    ✨ Suggest
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(it.id)
                  }}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function delta(a: number, b: number): string {
  if (a <= 0) return '0%'
  const diff = b - a
  const pct = (diff / a) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}
