import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function GET() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey, items } = body as { apiKey?: string; items?: string[] }

    if (!apiKey || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'API key and detected items are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/api/v1',
    })

    const prompt = `I have the following items detected in an image: ${items.join(', ')}.
For each item, provide:
- English name
- Japanese translation in romaji and hiragana/kanji
- One simple conversational Japanese sentence using the word
Format the answer as a numbered list.`

    const response = await openai.chat.completions.create({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const text = response.choices?.[0]?.message?.content || 'No response from API.'
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
