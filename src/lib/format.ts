export function prettyBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const v = bytes / Math.pow(k, i)
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

export function isoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function guessKind(file: File): 'pdf' | 'image' {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'image'
}

export function estimateCompressed(bytes: number, kind: 'pdf' | 'image'): number {
  if (kind === 'image') {
    const target = Math.max(bytes * 0.4, Math.min(bytes, 60 * 1024))
    return Math.round(target)
  }
  // PDFs often shrink a bit; be conservative
  return Math.round(bytes * 0.85)
}

export function pickSideFromName(name: string): string {
  const n = name.toLowerCase()
  if (/front|recto|obverse/.test(n)) return 'Front'
  if (/back|verso|reverse/.test(n)) return 'Back'
  return 'Front'
}

export function applyTemplate(tpl: string, ctx: Record<string, string>): string {
  let out = tpl
  for (const [k, v] of Object.entries(ctx)) {
    out = out.replaceAll(`{{${k}}}`, sanitize(v))
  }
  if (!out.toLowerCase().endsWith('.pdf')) out += '.pdf'
  return out
}

export function sanitize(v: string): string {
  return v.replace(/[^a-z0-9_\-]+/gi, ' ').trim().replace(/\s+/g, '_')
}

