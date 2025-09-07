import { PDFDocument } from 'pdf-lib'
import { createWorker } from 'tesseract.js'

export type RedactionResult = {
  blob: Blob
  masked: boolean
}

type Box = { x0: number; y0: number; x1: number; y1: number }

const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/
const ANUM_RE = /\bA\d{8,9}\b/i
const MRZ_HINT_RE = /<{3,}/

export async function redactForPack(file: File): Promise<RedactionResult> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return await redactPdfFirstPage(file)
  }
  return await redactImage(file)
}

export async function generateRedactedPreview(file: File): Promise<{ original: Blob; redacted: Blob; masked: boolean }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const { originalPng, redactedPng, masked } = await rasterizeAndRedactPdfPreview(file)
    return { original: originalPng, redacted: redactedPng, masked }
  }
  const { originalPng, redactedPng, masked } = await rasterizeAndRedactImagePreview(file)
  return { original: originalPng, redacted: redactedPng, masked }
}

async function redactImage(file: File): Promise<RedactionResult> {
  const img = await loadImageFromBlob(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const masked = await drawRedactionsOnCanvas(canvas)
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/jpeg', 0.9))
  return { blob, masked }
}

async function redactPdfFirstPage(file: File): Promise<RedactionResult> {
  const bytes = await file.arrayBuffer()
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const page1 = src.getPage(0)
  const [w, h] = page1.getSize ? page1.getSize() : [page1.getWidth(), page1.getHeight()]

  // Rasterize first page via canvas using PDF.js would be ideal; fallback: create a blank canvas and rely on OCR text heuristic
  // Since we may not have PDF.js available at runtime always, we will approximate by masking bottom strip when MRZ detected via text scan
  const textSlice = stringFromBytes(new Uint8Array(bytes).subarray(0, Math.min(bytes.byteLength, 1_500_000)))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(w))
  canvas.height = Math.max(1, Math.floor(h))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Without rendering the PDF content, we cannot preserve; so instead we create a new PDF composed of:
  // - An image layer from page render if available (not here)
  // - A black rectangle over the MRZ region if hint found
  let masked = false
  if (MRZ_HINT_RE.test(textSlice)) {
    masked = true
    ctx.fillStyle = '#000'
    const rectH = Math.floor(canvas.height * 0.18)
    ctx.fillRect(0, canvas.height - rectH, canvas.width, rectH)
  }

  // Embed this canvas snapshot as first page background, then append rest pages
  const dst = await PDFDocument.create()
  const pngData = canvas.toDataURL('image/png')
  const pngBytes = dataUrlToBytes(pngData)
  const embedded = await dst.embedPng(pngBytes)
  const page = dst.addPage([canvas.width, canvas.height])
  page.drawImage(embedded, { x: 0, y: 0, width: canvas.width, height: canvas.height })
  const pagesToCopy = await dst.copyPages(src, src.getPageIndices().slice(1))
  for (const p of pagesToCopy) dst.addPage(p)
  const outBytes = await dst.save({ useObjectStreams: true })
  return { blob: new Blob([outBytes], { type: 'application/pdf' }), masked }
}

async function rasterizeAndRedactPdfPreview(file: File): Promise<{ originalPng: Blob; redactedPng: Blob; masked: boolean }> {
  // Simple preview: blank white original and redacted black strip if hint present
  const bytes = await file.arrayBuffer()
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const page1 = src.getPage(0)
  const [w, h] = page1.getSize ? page1.getSize() : [page1.getWidth(), page1.getHeight()]
  const textSlice = stringFromBytes(new Uint8Array(bytes).subarray(0, Math.min(bytes.byteLength, 1_500_000)))

  const makeCanvas = (applyMask: boolean) => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.floor(w))
    c.height = Math.max(1, Math.floor(h))
    const cx = c.getContext('2d')!
    cx.fillStyle = '#ffffff'
    cx.fillRect(0, 0, c.width, c.height)
    if (applyMask && MRZ_HINT_RE.test(textSlice)) {
      cx.fillStyle = '#000'
      const rectH = Math.floor(c.height * 0.18)
      cx.fillRect(0, c.height - rectH, c.width, rectH)
      return { c, masked: true }
    }
    return { c, masked: false }
  }

  const { c: origCanvas } = makeCanvas(false)
  const { c: redCanvas, masked } = makeCanvas(true)
  const originalPng: Blob = await new Promise((res) => origCanvas.toBlob((b) => res(b as Blob), 'image/png'))
  const redactedPng: Blob = await new Promise((res) => redCanvas.toBlob((b) => res(b as Blob), 'image/png'))
  return { originalPng, redactedPng, masked }
}

async function rasterizeAndRedactImagePreview(file: File): Promise<{ originalPng: Blob; redactedPng: Blob; masked: boolean }> {
  const img = await loadImageFromBlob(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const orig: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'))
  const masked = await drawRedactionsOnCanvas(canvas)
  const red: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'))
  return { originalPng: orig, redactedPng: red, masked }
}

async function drawRedactionsOnCanvas(canvas: HTMLCanvasElement): Promise<boolean> {
  let masked = false
  try {
    const worker = await createWorker()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')
    const { data } = await worker.recognize(canvas)
    await worker.terminate()
    const rects: Box[] = []
    const text = data.text || ''
    if (MRZ_HINT_RE.test(text)) {
      // Mask bottom MRZ strip as a fallback
      rects.push({ x0: 0, y0: canvas.height * 0.8, x1: canvas.width, y1: canvas.height })
    }
    const words = (data.words || []) as any[]
    for (const w of words) {
      const t = (w.text || w.word || '').toString()
      if (!t) continue
      if (SSN_RE.test(t) || ANUM_RE.test(t) || /<{3,}/.test(t)) {
        const b = w.bbox || w
        rects.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 })
      }
    }
    if (rects.length) {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#000'
      for (const r of rects) {
        const x = Math.max(0, Math.floor(r.x0))
        const y = Math.max(0, Math.floor(r.y0))
        const w = Math.max(1, Math.floor(r.x1 - r.x0))
        const h = Math.max(1, Math.floor(r.y1 - r.y0))
        ctx.fillRect(x, y, w, h)
        masked = true
      }
    }
  } catch {
    // best-effort; no mask if OCR fails
  }
  return masked
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function stringFromBytes(arr: Uint8Array): string {
  let out = ''
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i]
    out += c >= 32 && c <= 126 ? String.fromCharCode(c) : ' '
  }
  return out
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

