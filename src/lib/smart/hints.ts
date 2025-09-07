import { isoDate } from '@/lib/format'
import { load as loadExif } from 'exifreader'
import { createWorker } from 'tesseract.js'

export type HintResult = Partial<{ DocType: string; Side: string; DateISO: string }>

const FILE_REGEX = [
  { re: /\b(i[\s_-]?20)\b/i, dt: 'I-20' },
  { re: /\b(i[\s_-]?765)\b/i, dt: 'I-765' },
  { re: /\bead\b/i, dt: 'EAD' },
  { re: /\bpassport\b/i, dt: 'Passport' },
]

function sideFromName(name: string): string | undefined {
  const n = name.toLowerCase()
  if (/\b(back|verso)\b/.test(n)) return 'Back'
  if (/\b(front|recto)\b/.test(n)) return 'Front'
  if (/\bpassport[_-]?back\b/.test(n)) return 'Back'
  if (/\bpassport[_-]?front\b/.test(n)) return 'Front'
  return undefined
}

async function exifDateISO(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined
  try {
    const tags = await loadExif(await file.arrayBuffer())
    const d = (tags?.DateTimeOriginal?.description || tags?.CreateDate?.description) as string | undefined
    if (!d) return undefined
    // Common formats: '2024:09:06 12:34:56'
    const m = d.match(/^(\d{4}):?(\d{2}):?(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  } catch {}
  return undefined
}

function mapKeywordsToDoc(text: string): HintResult {
  const t = text.toLowerCase()
  if (/\bpassport\b/.test(t)) return { DocType: 'Passport' }
  if (/\bi[-\s]?20\b/.test(t)) return { DocType: 'I-20' }
  if (/\bi[-\s]?765\b/.test(t)) return { DocType: 'I-765' }
  if (/\bead\b/.test(t) || /employment authorization document/.test(t)) return { DocType: 'EAD' }
  return {}
}

function mapKeywordsToSide(text: string): HintResult {
  const t = text.toLowerCase()
  if (/united states of america|department of state|passport/i.test(text)) return { Side: 'Front' }
  if (/<<</.test(text) || /machine readable zone|mrz/i.test(text)) return { Side: 'Back' }
  return {}
}

export async function inferHints(file: File, opts: { ocr: boolean }): Promise<HintResult> {
  const hints: HintResult = {}
  // Filename fast path
  const lower = file.name.toLowerCase()
  for (const { re, dt } of FILE_REGEX) {
    if (re.test(lower)) { hints.DocType = dt; break }
  }
  const sideName = sideFromName(lower)
  if (sideName) hints.Side = sideName

  // EXIF date
  const ex = await exifDateISO(file)
  if (ex) hints.DateISO = ex
  if (!hints.DateISO) hints.DateISO = isoDate()

  // Optional OCR if small enough
  const canOCR = opts.ocr && file.size < 5 * 1024 * 1024
  if (canOCR) {
    if (file.type.startsWith('image/')) {
      try {
        const worker = await createWorker()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')
        const { data } = await worker.recognize(file)
        await worker.terminate()
        const text = data.text || ''
        const dHint = mapKeywordsToDoc(text)
        const sHint = mapKeywordsToSide(text)
        Object.assign(hints, dHint, sHint)
      } catch {}
    } else if (file.type === 'application/pdf') {
      try {
        // Simple text scan heuristic for text PDFs
        const buf = new Uint8Array(await file.arrayBuffer())
        const slice = buf.subarray(0, Math.min(buf.length, 1_500_000))
        const text = Array.from(slice).map((c) => (c >= 32 && c <= 126 ? String.fromCharCode(c) : ' ')).join('')
        const dHint = mapKeywordsToDoc(text)
        const sHint = mapKeywordsToSide(text)
        Object.assign(hints, dHint, sHint)
      } catch {}
    }
  }

  return hints
}

