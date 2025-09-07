import { PDFDocument } from 'pdf-lib'

export type PdfCompressResult = {
  blob: Blob
  originalBytes: number
  finalBytes: number
  mode: 'image-only' | 'text' | 'mixed' | 'unknown'
  serverRecommended: boolean
  note: string
}

function analyzePdfBytes(bytes: Uint8Array): 'image-only' | 'text' | 'mixed' | 'unknown' {
  // Heuristic: scan first 1.5MB for tokens
  const slice = bytes.subarray(0, Math.min(bytes.length, 1_500_000))
  let txt = ''
  try {
    txt = Array.from(slice)
      .map((c) => (c >= 32 && c <= 126 ? String.fromCharCode(c) : ' '))
      .join('')
  } catch {
    return 'unknown'
  }
  const hasImage = /\/Image/.test(txt)
  const hasTextOps = /(\bTj\b|\bTJ\b|\/Font)/.test(txt)
  if (hasImage && !hasTextOps) return 'image-only'
  if (!hasImage && hasTextOps) return 'text'
  if (hasImage && hasTextOps) return 'mixed'
  return 'unknown'
}

export async function compressPdfArrayBuffer(input: ArrayBuffer): Promise<PdfCompressResult> {
  const originalBytes = input.byteLength
  const ui8 = new Uint8Array(input)
  const kind = analyzePdfBytes(ui8)

  // Light optimization: reload & save with object streams to reduce overhead
  const doc = await PDFDocument.load(input, { ignoreEncryption: true })
  const saved = await doc.save({ useObjectStreams: true, addDefaultPage: false })
  const blob = new Blob([saved as unknown as BlobPart], { type: 'application/pdf' })
  const finalBytes = blob.size

  let note = 'lightly optimized'
  let serverRecommended = false
  if (kind === 'text') {
    note = 'lightly optimized / server recommended'
    serverRecommended = true
  }

  return { blob, originalBytes, finalBytes, mode: kind, serverRecommended, note }
}
