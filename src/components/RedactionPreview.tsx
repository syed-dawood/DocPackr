"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileItem } from '@/lib/types'
import { generateRedactedPreview } from '@/lib/redact'

export default function RedactionPreview({ item, enabled }: { item: FileItem | null; enabled: boolean }) {
  const [origUrl, setOrigUrl] = useState<string | null>(null)
  const [redUrl, setRedUrl] = useState<string | null>(null)
  const [masked, setMasked] = useState<boolean>(false)

  useEffect(() => {
    setOrigUrl(null); setRedUrl(null); setMasked(false)
    if (!item || !enabled) return
    let alive = true
    generateRedactedPreview(item.file)
      .then(({ original, redacted, masked }) => {
        if (!alive) return
        setOrigUrl(URL.createObjectURL(original))
        setRedUrl(URL.createObjectURL(redacted))
        setMasked(masked)
      })
      .catch(() => {})
    return () => { alive = false; if (origUrl) URL.revokeObjectURL(origUrl); if (redUrl) URL.revokeObjectURL(redUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, enabled])

  if (!enabled || !item) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Redaction Preview {masked ? '(applied)' : '(no sensitive fields found)'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs mb-1 text-muted-foreground">Original</div>
            {origUrl && <img src={origUrl} alt="original" className="w-full h-auto rounded-lg border" />}
          </div>
          <div>
            <div className="text-xs mb-1 text-muted-foreground">Redacted</div>
            {redUrl && <img src={redUrl} alt="redacted" className="w-full h-auto rounded-lg border" />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

