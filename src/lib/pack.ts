import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'

import { compressImageBlob } from '@/lib/compress/image'
import { compressPdfArrayBuffer } from '@/lib/compress/pdf'
import { isoDate } from '@/lib/format'
import { sha256Hex } from '@/lib/hash'
import { redactForPack } from '@/lib/redact'
import { renderTemplate } from '@/lib/template'
import type { FileItem } from '@/lib/types'

export type PackResult = {
  zipBlob: Blob
  manifest: string
  updates: Array<{
    id: string
    newName: string
    finalBytes: number
    serverRecommended?: boolean
    note?: string
  }>
}

export async function packFiles(
  items: FileItem[],
  template: string,
  onProgress?: (pct: number) => void,
  opts?: { redact?: boolean },
): Promise<PackResult> {
  const zip = new JSZip()
  const manifestLines: string[] = []
  const updates: PackResult['updates'] = []
  const total = items.length
  const nowISO = new Date().toISOString()

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    let outBlob: Blob
    let newName: string
    let finalBytes = 0
    let serverRecommended = false
    let note: string | undefined

    if (it.kind === 'image') {
      // Compress image then wrap to single-page PDF
      let imageSource: Blob = it.file
      if (opts?.redact) {
        const red = await redactForPack(it.file)
        if (red.masked) imageSource = red.blob
      }
      const { blob: imgCompressed } = await compressImageBlob(imageSource as File | Blob)
      const pdf = await PDFDocument.create()
      const bytes = await imgCompressed.arrayBuffer()
      const outMime = (imgCompressed.type || it.file.type || '').toLowerCase()
      const isPng = outMime.includes('png')
      const embedded = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
      const { width, height } = embedded.scale(1)
      const page = pdf.addPage([width, height])
      page.drawImage(embedded, { x: 0, y: 0, width, height })
      const pdfBytes = await pdf.save({ useObjectStreams: true })
      outBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
      finalBytes = outBlob.size
      newName = renderTemplate(template, {
        ...it.meta,
        Index1: String(i + 1),
        DateISO: it.meta.DateISO || isoDate(),
      })
    } else {
      let pdfInput = it.file
      if (opts?.redact) {
        const red = await redactForPack(it.file)
        if (red.masked) pdfInput = new File([red.blob], it.file.name, { type: 'application/pdf' })
      }
      const res = await compressPdfArrayBuffer(await pdfInput.arrayBuffer())
      outBlob = res.blob
      finalBytes = res.finalBytes
      serverRecommended = res.serverRecommended
      note = res.note
      newName = renderTemplate(template, {
        ...it.meta,
        Index1: String(i + 1),
        DateISO: it.meta.DateISO || isoDate(),
      })
    }

    const sha = await sha256Hex(await outBlob.arrayBuffer())
    zip.file(newName, outBlob)
    manifestLines.push([it.name, newName, it.originalBytes, finalBytes, sha, nowISO].join(' | '))
    updates.push({ id: it.id, newName, finalBytes, serverRecommended, note })
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 100))
  }

  zip.file('manifest.txt', manifestLines.join('\n'))
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return { zipBlob, manifest: manifestLines.join('\n'), updates }
}
