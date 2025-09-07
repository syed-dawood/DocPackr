export const runtime = 'edge'

type Out = { DocType?: string; Side?: string; ImportantFields?: string[] }

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'api disabled' }), { status: 503, headers: { 'content-type': 'application/json' } })
    }

    const prompt = buildPrompt(text)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You extract document hints from OCR text and return compact JSON. Keep it minimal.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
    })
    if (!resp.ok) {
      const t = await resp.text()
      return new Response(JSON.stringify({ error: 'upstream', detail: t }), { status: 502, headers: { 'content-type': 'application/json' } })
    }
    const j = await resp.json()
    const content = j.choices?.[0]?.message?.content
    let out: Out = {}
    try { out = JSON.parse(content) } catch { out = {} }
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
}

function buildPrompt(text: string): string {
  return `OCR TEXT:\n\n${text}\n\nTask: Propose JSON with keys DocType, Side, ImportantFields (array). Side is Front or Back if clear, else omit. Choose DocType among: I-20, I-765, EAD, Passport, or a short guess.\n\nExamples:\nInput: 'Form I-20 Certificate of Eligibility for Nonimmigrant Student Status'\nOutput: {"DocType":"I-20","Side":"Front","ImportantFields":["SEVIS ID","School Code","Given Name","Surname","Birth Date"]}\n\nInput: 'Application For Employment Authorization Department of Homeland Security Form I-765'\nOutput: {"DocType":"I-765","Side":"Front","ImportantFields":["USCIS Account","A-Number","Full Name","Mailing Address"]}\n\nInput: 'EMPLOYMENT AUTHORIZATION CARD United States of America'\nOutput: {"DocType":"EAD","Side":"Front","ImportantFields":["Card Number","Category","Surname","Given Name","Country of Birth"]}\n\nInput: 'P<USADOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<'\nOutput: {"DocType":"Passport","Side":"Back","ImportantFields":["Passport Number","Surname","Given Name","Nationality"]}\n\nNow respond with a single JSON object for the OCR TEXT above.`
}

