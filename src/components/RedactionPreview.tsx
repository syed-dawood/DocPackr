'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateRedactedPreview } from '@/lib/redact'
import { FileItem } from '@/lib/types'

export default function RedactionPreview({
  item,
  enabled,
}: {
  item: FileItem | null
  enabled: boolean
}) {
  const [origUrl, setOrigUrl] = useState<string | null>(null)
  const [redUrl, setRedUrl] = useState<string | null>(null)
  const [masked, setMasked] = useState<boolean>(false)

  useEffect(() => {
    setOrigUrl(null)
    setRedUrl(null)
    setMasked(false)
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
    return () => {
      alive = false
      if (origUrl) URL.revokeObjectURL(origUrl)
      if (redUrl) URL.revokeObjectURL(redUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, enabled])

  if (!enabled || !item) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Redaction Preview {masked ? '(applied)' : '(no sensitive fields found)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Original</div>
            {origUrl && (
              <Image src={origUrl} alt="original" className="h-auto w-full rounded-lg border" />
            )}
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Redacted</div>
            {redUrl && (
              <Image src={redUrl} alt="redacted" className="h-auto w-full rounded-lg border" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
