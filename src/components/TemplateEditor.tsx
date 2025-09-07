'use client'
import { useEffect, useMemo, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { isoDate } from '@/lib/format'
import { renderTemplate } from '@/lib/template'
import { FileItem } from '@/lib/types'

type Props = {
  value: string
  onChange: (v: string) => void
  selected?: FileItem | null
}

const STORAGE_KEY = 'docpackr:template'

export default function TemplateEditor({ value, onChange, selected }: Props) {
  const [tpl, setTpl] = useState(value)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      onChange(saved)
      setTpl(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setTpl(value)
  }, [value])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tpl)
  }, [tpl])

  const ctx = useMemo(() => {
    const mock = {
      First: 'Jane',
      Last: 'Doe',
      DocType: 'ID',
      Side: 'Front',
      DateISO: isoDate(),
    }
    if (!selected) return mock
    const side = selected.meta.Side || mock.Side
    return { ...mock, ...selected.meta, Side: side }
  }, [selected])

  const preview = useMemo(() => renderTemplate(tpl || value, ctx), [tpl, value, ctx])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template</CardTitle>
        <CardDescription>
          Use tokens like <code>{'{{First}}'}</code>, <code>{'{{Last}}'}</code>,{' '}
          <code>{'{{DocType}}'}</code>, <code>{'{{Side}}'}</code>, <code>{'{{DateISO}}'}</code>.
          Functions: <code>{'{{slug(Last)}}'}</code>, <code>{'{{upper(DocType)}}'}</code>. Fallback:{' '}
          <code>{'{{First||Last}}'}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="common-tpl" className="text-sm text-muted-foreground">
            Common:
          </label>
          <select
            id="common-tpl"
            className="h-10 rounded-xl border bg-background px-3 text-sm"
            onChange={(e) => {
              setTpl(e.target.value)
              onChange(e.target.value)
            }}
            value={tpl}
          >
            <option value="{{Last}}_{{First}}_{{DocType}}_{{Side}}.pdf">
              {'{{Last}}_{{First}}_{{DocType}}_{{Side}}.pdf'}
            </option>
            <option value="{{DateISO}}_{{DocType}}_{{Last}}.pdf">
              {'{{DateISO}}_{{DocType}}_{{Last}}.pdf'}
            </option>
          </select>
        </div>
        <Input
          value={tpl}
          onChange={(e) => {
            setTpl(e.target.value)
            onChange(e.target.value)
          }}
          placeholder="{{Last}}_{{First}}_{{DocType}}_{{Side}}_{{DateISO}}.pdf"
          aria-label="Rename template"
        />
        <div className="text-xs text-muted-foreground">
          Preview: <span className="font-mono text-foreground">{preview}</span>
        </div>
      </CardContent>
    </Card>
  )
}
