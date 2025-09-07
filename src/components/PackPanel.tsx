"use client"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type Props = {
  total: number
  processing: boolean
  canCompress: boolean
  canDownload: boolean
  progress: number
  onCompressZip: () => void
  onDownloadZip: () => void
}

export default function PackPanel({ total, processing, canCompress, canDownload, progress, onCompressZip, onDownloadZip }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Files: {total}</div>
        <div className="flex gap-2">
          <Button onClick={onCompressZip} disabled={!canCompress || processing} className="flex-1">Compress & Zip</Button>
          <Button onClick={onDownloadZip} disabled={!canDownload} variant="secondary" className="flex-1">Download ZIP</Button>
        </div>
        <div>
          <Progress value={progress} />
          <div className="mt-1 text-xs text-muted-foreground">{processing ? `Processing… ${progress}%` : 'Idle'}</div>
        </div>
      </CardContent>
    </Card>
  )
}

