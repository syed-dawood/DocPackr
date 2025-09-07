"use client"
import { useMemo, useReducer } from 'react'
import DropBox from '@/components/DropBox'
import FileTable from '@/components/FileTable'
import TemplateEditor from '@/components/TemplateEditor'
import RedactionPreview from '@/components/RedactionPreview'
import PackPanel from '@/components/PackPanel'
import { estimateCompressed, guessKind, isoDate } from '@/lib/format'
import { renderTemplate } from '@/lib/template'
import { FileItem } from '@/lib/types'
import { packFiles } from '@/lib/pack'
import { inferHints } from '@/lib/smart/hints'
import { suggestFromText } from '@/lib/smart/aiSuggest'
import { createWorker } from 'tesseract.js'

type State = {
  items: FileItem[]
  selectedId: string | null
  template: string
  processing: boolean
  progress: number
  zipBlob: Blob | null
  smartOCR: boolean
  redact: boolean
}

type Action =
  | { type: 'add_files'; files: File[] }
  | { type: 'remove_file'; id: string }
  | { type: 'select'; id: string }
  | { type: 'set_template'; value: string }
  | { type: 'set_processing'; value: boolean }
  | { type: 'set_progress'; value: number }
  | { type: 'set_zip'; blob: Blob | null }
  | { type: 'set_items'; items: FileItem[] }
  | { type: 'set_smart_ocr'; value: boolean }
  | { type: 'update_meta'; id: string; meta: Partial<FileItem['meta']> }
  | { type: 'set_redact'; value: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add_files': {
      const toAdd = action.files.map<FileItem>((f) => {
        const kind = guessKind(f)
        const originalBytes = f.size
        const estBytes = estimateCompressed(originalBytes, kind)
        return {
          id: crypto.randomUUID(),
          file: f,
          name: f.name,
          kind,
          originalBytes,
          estBytes,
          status: 'queued',
          meta: {
            First: '',
            Last: '',
            DocType: '',
            Side: kind === 'image' ? 'Front' : 'Front',
            DateISO: isoDate(),
          },
        }
      })
      return { ...state, items: [...state.items, ...toAdd] }
    }
    case 'remove_file': {
      const items = state.items.filter((i) => i.id !== action.id)
      const selectedId = state.selectedId === action.id ? null : state.selectedId
      return { ...state, items, selectedId }
    }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'set_template':
      return { ...state, template: action.value }
    case 'set_processing':
      return { ...state, processing: action.value }
    case 'set_progress':
      return { ...state, progress: action.value }
    case 'set_zip':
      return { ...state, zipBlob: action.blob }
    case 'set_items':
      return { ...state, items: action.items }
    case 'set_smart_ocr':
      return { ...state, smartOCR: action.value }
    case 'update_meta': {
      const items = state.items.map((it) => (it.id === action.id ? { ...it, meta: { ...it.meta, ...action.meta } } : it))
      return { ...state, items }
    }
    case 'set_redact':
      return { ...state, redact: action.value }
    default:
      return state
  }
}

export default function Page() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    selectedId: null,
    template: '{{Last}}_{{First}}_{{DocType}}_{{Side}}_{{DateISO}}.pdf',
    processing: false,
    progress: 0,
    zipBlob: null,
    smartOCR: false,
    redact: false,
  })

  const selected = useMemo(() => state.items.find((i) => i.id === state.selectedId) || null, [state.items, state.selectedId])

  async function handleCompressZip() {
    dispatch({ type: 'set_processing', value: true })
    dispatch({ type: 'set_progress', value: 0 })
    try {
      const { zipBlob, updates } = await packFiles(state.items, state.template, (pct) => dispatch({ type: 'set_progress', value: pct }), { redact: state.redact })
      const updatedItems = state.items.map((it) => {
        const u = updates.find((x) => x.id === it.id)
        if (!u) return it
        return { ...it, status: 'ready', finalBytes: u.finalBytes, serverRecommended: u.serverRecommended, note: u.note }
      })
      dispatch({ type: 'set_items', items: updatedItems })
      dispatch({ type: 'set_zip', blob: zipBlob })
    } finally {
      dispatch({ type: 'set_processing', value: false })
    }
  }

  async function handleAddFiles(files: File[]) {
    // Build items first
    const prepared: FileItem[] = files.map((f) => {
      const kind = guessKind(f)
      const originalBytes = f.size
      const estBytes = estimateCompressed(originalBytes, kind)
      return {
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        kind,
        originalBytes,
        estBytes,
        status: 'queued',
        meta: { First: '', Last: '', DocType: '', Side: kind === 'image' ? 'Front' : 'Front', DateISO: isoDate() },
      }
    })
    dispatch({ type: 'set_items', items: [...state.items, ...prepared] })
    // Hints
    for (const item of prepared) {
      try {
        const hints = await inferHints(item.file, { ocr: state.smartOCR })
        dispatch({ type: 'update_meta', id: item.id, meta: hints })
      } catch {}
    }
  }

  function handleDownloadZip() {
    if (!state.zipBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(state.zipBlob)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = now.getFullYear()
    const m = pad(now.getMonth() + 1)
    const d = pad(now.getDate())
    const hh = pad(now.getHours())
    const mm = pad(now.getMinutes())
    a.download = `DocPackr_${y}-${m}-${d}_${hh}${mm}.zip`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(a.href)
    a.remove()
  }

  return (
    <main className="container py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">DocPackr</h1>
            <p className="text-sm text-muted-foreground">Drag & drop PDFs & images, edit template, and pack.</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm" title="Runs on-device OCR for small files. Uses CPU and may be slower.">
              <input type="checkbox" className="accent-current" checked={state.smartOCR} onChange={(e) => dispatch({ type: 'set_smart_ocr', value: e.target.checked })} />
              <span>Smart hints (OCR)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm" title="Masks MRZ, A-Numbers, SSNs on exported copy.">
              <input type="checkbox" className="accent-current" checked={state.redact} onChange={(e) => dispatch({ type: 'set_redact', value: e.target.checked })} />
              <span>Redact sensitive fields</span>
            </label>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <DropBox onFiles={(files) => { void handleAddFiles(files) }} />
          <FileTable
            items={state.items}
            selectedId={state.selectedId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onRemove={(id) => dispatch({ type: 'remove_file', id })}
            onSuggest={async (id) => { await handleSuggest(id) }}
          />
        </div>
        <div className="space-y-4">
          <PackPanel
            total={state.items.length}
            processing={state.processing}
            canCompress={state.items.length > 0}
            canDownload={!!state.zipBlob}
            progress={state.progress}
            onCompressZip={handleCompressZip}
            onDownloadZip={handleDownloadZip}
          />
          <TemplateEditor value={state.template} onChange={(v) => dispatch({ type: 'set_template', value: v })} selected={selected} />
          {/* Redaction preview below when enabled */}
          {state.redact && <RedactionPreview item={selected} enabled={state.redact} />}
        </div>
      </div>
    </main>
  )
  }

  async function handleSuggest(id: string) {
    const it = state.items.find(x => x.id === id)
    if (!it) return
    let text = ''
    try {
      if (it.kind === 'image' && it.file.size < 5 * 1024 * 1024) {
        const worker = await createWorker()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')
        const { data } = await worker.recognize(it.file)
        await worker.terminate()
        text = data.text || ''
      } else if (it.kind === 'pdf') {
        const buf = new Uint8Array(await it.file.arrayBuffer())
        const slice = buf.subarray(0, Math.min(buf.length, 1_500_000))
        text = Array.from(slice).map((c) => (c >= 32 && c <= 126 ? String.fromCharCode(c) : ' ')).join('')
      }
    } catch {}
    const suggestion = await suggestFromText(text)
    if (suggestion) {
      const meta: any = {}
      if (suggestion.DocType) meta.DocType = suggestion.DocType
      if (suggestion.Side) meta.Side = suggestion.Side
      dispatch({ type: 'update_meta', id, meta })
    }
  }
