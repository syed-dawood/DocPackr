export type AISuggestion = {
  DocType?: string
  Side?: string
  ImportantFields?: string[]
}

export async function suggestFromText(ocrText: string): Promise<AISuggestion | null> {
  // Feature flag (public)
  if (!process.env.NEXT_PUBLIC_AI_ENABLED) return null
  try {
    const res = await fetch('/api/ai-suggest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: ocrText })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data) return null
    return {
      DocType: data.DocType,
      Side: data.Side,
      ImportantFields: data.ImportantFields,
    }
  } catch {
    return null
  }
}

