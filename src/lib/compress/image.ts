import imageCompression from 'browser-image-compression'

export type ImageCompressResult = {
  blob: Blob
  originalBytes: number
  finalBytes: number
  reduction: number
}

export async function compressImageBlob(input: File | Blob): Promise<ImageCompressResult> {
  const originalBytes = input.size
  const file =
    input instanceof File ? input : new File([input], 'image', { type: input.type || 'image/jpeg' })

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 2000,
    initialQuality: 0.7,
    useWebWorker: true,
  })

  const out: Blob = compressed
  const finalBytes = out.size
  const reduction = originalBytes > 0 ? 1 - finalBytes / originalBytes : 0
  return { blob: out, originalBytes, finalBytes, reduction }
}
