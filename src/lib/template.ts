import { isoDate } from '@/lib/format'

// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g

function normalizeDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

function slugify(s: string): string {
  const t = normalizeDiacritics(s).toLowerCase()
  return t
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function upper(s: string): string {
  return s.toUpperCase()
}

function safeFilename(base: string): string {
  let s = base.replace(ILLEGAL, ' ')
  // collapse spaces and underscores into single underscore
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/[ _]+/g, '_')
  s = s.replace(/_+/g, '_')
  s = s.replace(/^_+|_+$/g, '')
  if (!s) s = 'document'
  return s
}

function ensurePdf(name: string): string {
  const hasPdf = /\.pdf$/i.test(name)
  const ext = '.pdf'
  let base = hasPdf ? name.replace(/\.[^./\\]+$/i, '') : name
  base = base.slice(0, Math.max(1, 119 - ext.length))
  let out = safeFilename(base) + ext
  // final clamp just in case
  if (out.length > 119) out = out.slice(0, 119)
  return out
}

function evalAtom(atom: string, fields: Record<string, string>): string {
  const mStr = atom.match(/^['"](.*)['"]$/)
  if (mStr) return mStr[1]
  const key = atom.trim()
  return fields[key] ?? ''
}

function evalExpr(expr: string, fields: Record<string, string>): string {
  const call = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/)
  if (call) {
    const fn = call[1].toLowerCase()
    const argRaw = call[2].trim()
    const inner = evalExpr(argRaw, fields)
    if (fn === 'slug') return slugify(inner)
    if (fn === 'upper') return upper(inner)
    return inner
  }
  return evalAtom(expr, fields)
}

export function renderTemplate(template: string, ctx: Record<string, string>): string {
  const fields: Record<string, string> = {
    First: ctx.First ?? '',
    Last: ctx.Last ?? '',
    DocType: ctx.DocType ?? '',
    Side: ctx.Side ?? '',
    DateISO: ctx.DateISO || isoDate(),
    Random4: ctx.Random4 || Math.floor(1000 + Math.random() * 9000).toString(),
    Index1: ctx.Index1 || '1',
    ...ctx,
  }

  const replaced = template.replace(/\{\{([^}]+)\}\}/g, (_, inner: string) => {
    const expr = inner.trim()
    // fallback chain with ||
    const parts = expr
      .split('||')
      .map((p) => p.trim())
      .filter(Boolean)
    for (const part of parts) {
      const val = evalExpr(part, fields)
      if (val && val.trim().length > 0) return val
    }
    return ''
  })

  const cleaned = ensurePdf(replaced)
  return cleaned
}
