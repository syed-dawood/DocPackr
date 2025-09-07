"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export default function DropBox({ onFiles, disabled }: Props) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files)
      const filtered = arr.filter((f) => /^(application\/pdf|image\//).test(f.type) || /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)$/i.test(f.name))
      if (filtered.length) onFiles(filtered)
    },
    [onFiles]
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setOver(false)
      if (disabled) return
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
        e.dataTransfer.clearData()
      }
    },
    [disabled, handleFiles]
  )

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return
      const files: File[] = []
      if (e.clipboardData) {
        for (const item of e.clipboardData.items) {
          const f = item.getAsFile()
          if (f) files.push(f)
        }
      }
      if (files.length) onFiles(files)
    },
    [disabled, onFiles]
  )

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
        over ? 'border-primary bg-primary/5' : 'border-border',
        disabled && 'opacity-60 pointer-events-none'
      )}
      aria-disabled={disabled}
      aria-label="Drop files here"
    >
      <p className="text-sm text-muted-foreground">Drag & drop PDFs or images here</p>
      <p className="text-xs text-muted-foreground">You can also paste from clipboard</p>
      <div className="mt-4">
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Browse files
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
      />
    </div>
  )
}

