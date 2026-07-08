import OpenAI from 'openai'

export const runtime = 'nodejs'

type AnalyzeRequest = {
  imageDataUrl?: string
  localItems?: string[]
  conversationDifficulty?: 'easy' | 'intermediate' | 'hard'
  mode?: 'full' | 'conversation'
  sceneSummary?: string
  vocabulary?: VocabularyItem[]
}

type VocabularyItem = {
  english: string
  japanese: string
  kanaReading?: string
  reading: string
  beginnerNote: string
  labelPosition?: {
    left: number
    top: number
  }
}

type DialogueLine = {
  speaker: string
  japanese: string
  romaji: string
  english: string
}

type ConversationExchange = {
  title: string
  context: string
  lines: DialogueLine[]
  vocabulary?: VocabularyItem[]
}

type Lesson = {
  sceneSummary: string
  vocabulary: VocabularyItem[]
  exchanges: ConversationExchange[]
  miniPractice: string[]
}

const jsonHeaders = { 'Content-Type': 'application/json' }

// In-memory per-IP rate limit. Resets when the serverless instance recycles,
// which is acceptable — this is a guard against runaway usage, not a security boundary.
const rateWindowMs = 10 * 60 * 1000
const rateMaxRequests = 12
const requestLog = new Map<string, number[]>()

function isRateLimited(ip: string) {
  const now = Date.now()
  const timestamps = (requestLog.get(ip) || []).filter(time => now - time < rateWindowMs)
  if (timestamps.length >= rateMaxRequests) {
    requestLog.set(ip, timestamps)
    return true
  }
  timestamps.push(now)
  requestLog.set(ip, timestamps)
  if (requestLog.size > 5000) requestLog.clear()
  return false
}

function friendlyErrorMessage(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()

  if (
    lower.includes('quota') ||
    lower.includes('arrearage') ||
    lower.includes('insufficient') ||
    lower.includes('exceeded') ||
    lower.includes('429')
  ) {
    return {
      message: 'The lesson generator has reached its daily limit. Please try again tomorrow — your saved words and progress are safe.',
      status: 503,
    }
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { message: 'The image took too long to analyze. Please try again with a smaller photo.', status: 504 }
  }

  return { message: raw, status: 500 }
}

export async function GET() {
  return Response.json({ status: 'ok' })
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(ip)) {
      return Response.json(
        { error: 'You are generating lessons very quickly! Please wait a few minutes and try again.' },
        { status: 429 },
      )
    }

    const {
      imageDataUrl,
      localItems = [],
      conversationDifficulty = 'easy',
      mode = 'full',
      sceneSummary,
      vocabulary = [],
    } = (await request.json()) as AnalyzeRequest
    const apiKey = process.env.QWEN_API_KEY

    if (!apiKey?.trim()) {
      return Response.json(
        { error: 'QWEN_API_KEY is missing. Add it to app/.env.local, then restart the dev server.' },
        { status: 500 },
      )
    }

    if (!imageDataUrl?.startsWith('data:image/')) {
      return Response.json({ error: 'Please upload a valid image before generating a lesson.' }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })

    const localItemHint =
      localItems.length > 0
        ? `A local object detector noticed these possible items: ${localItems.join(', ')}. Use them only if the image supports them.`
        : 'No reliable local object hints are available. Identify the visible objects from the image.'
    const conversationLevel = getConversationLevel(conversationDifficulty)

    if (mode === 'conversation') {
      if (!sceneSummary || vocabulary.length === 0) {
        return Response.json({ error: 'Scene summary and vocabulary are required for conversation-only generation.' }, { status: 400 })
      }

      const prompt = `You are a warm Japanese teacher.
Create only new conversation exchanges for an existing image lesson.

Scene summary: ${sceneSummary}
Known vocabulary from the image: ${vocabulary.map(item => `${item.english} / ${item.japanese}${item.kanaReading ? ` [${item.kanaReading}]` : ''} (${item.reading})`).join(', ')}

Conversation difficulty selected by the user: ${conversationDifficulty}.
Conversation level requirements: ${conversationLevel}

Return only valid JSON with this exact shape:
{
  "exchanges": [
    {
      "title": "short title for the exchange",
      "context": "where or why the exchange fits the image",
      "lines": [
        {
          "speaker": "A",
          "japanese": "natural Japanese line",
          "romaji": "romaji reading",
          "english": "English meaning"
        }
      ],
      "vocabulary": [
        {
          "english": "reusable word from this exchange",
          "japanese": "Japanese word in kana or common kanji",
          "kanaReading": "hiragana or katakana reading",
          "reading": "romaji reading",
          "beginnerNote": "brief usage note"
        }
      ]
    }
  ]
}

Rules:
- Do not change the image-label vocabulary.
- For each exchange, include 2 to 4 useful new vocabulary words that occur in its conversation lines so the learner can save them.
- Conversation vocabulary must exclude every word already listed in Known vocabulary from the image.
- Include 2 conversation exchanges.
- Each exchange must have 3 to 4 back-and-forth lines.
- Alternate speakers A and B.
- Conversation lines must follow the selected difficulty level.
- Keep the conversations grounded in the scene summary and known vocabulary.`

      const response = await openai.chat.completions.create({
        model: process.env.QWEN_MODEL || 'qwen-vl-max',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      })

      const rawText = response.choices?.[0]?.message?.content
      const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText)
      const conversationUpdate = parseConversationUpdate(text, vocabulary)

      if (!conversationUpdate) {
        return new Response(JSON.stringify({ rawText: text }), { status: 200, headers: jsonHeaders })
      }

      return Response.json({ conversationUpdate, rawText: text })
    }

    const prompt = `You are a warm Japanese teacher.
Analyze the uploaded image and create a short lesson from the visible, everyday items and the scene.

${localItemHint}

Conversation difficulty selected by the user: ${conversationDifficulty}.
Conversation level requirements: ${conversationLevel}

Return only valid JSON with this exact shape:
{
  "sceneSummary": "one simple sentence describing the scene",
  "vocabulary": [
    {
      "english": "item name in English",
      "japanese": "Japanese word in kana or common kanji",
      "kanaReading": "hiragana or katakana reading for the Japanese word",
      "reading": "romaji reading",
      "beginnerNote": "brief beginner-friendly usage note",
      "labelPosition": {
        "left": 50,
        "top": 50
      }
    }
  ],
  "exchanges": [
    {
      "title": "short title for the exchange",
      "context": "where or why the exchange fits the image",
      "lines": [
        {
          "speaker": "A",
          "japanese": "natural beginner Japanese line",
          "romaji": "romaji reading",
          "english": "English meaning"
        }
      ],
      "vocabulary": [
        {
          "english": "reusable word from this exchange",
          "japanese": "Japanese word in kana or common kanji",
          "kanaReading": "hiragana or katakana reading",
          "reading": "romaji reading",
          "beginnerNote": "brief usage note"
        }
      ]
    }
  ]
}

Rules:
- Choose 4 to 7 useful vocabulary items.
- For each vocabulary item, include labelPosition as the approximate center of the visible object in the image.
- For each vocabulary item, include kanaReading in hiragana or katakana. If japanese contains kanji, kanaReading must show how to read it, such as "ほん" for "本".
- labelPosition.left and labelPosition.top must be percentages from 0 to 100 relative to the full image.
- If an item is broad, such as kitchen or shop, place the label near the visually central area for that concept.
- Include 2 conversation exchanges.
- Each exchange must have 3 to 4 back-and-forth lines.
- Alternate speakers A and B.
- For each exchange, include 2 to 4 useful new vocabulary words used in its lines, with kanaReading, romaji, and a brief beginnerNote.
- Conversation vocabulary must exclude every item already listed in the image vocabulary array.
- Vocabulary names and beginner notes should stay approachable for learners.
- Conversation lines must follow the selected difficulty level.
- Prefer words a learner can reuse in daily conversation.
- Do not invent objects that are not visible.`

    const response = await openai.chat.completions.create({
      model: process.env.QWEN_MODEL || 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.4,
    })

    const rawText = response.choices?.[0]?.message?.content
    const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText)
    const lesson = parseLesson(text)

    if (!lesson) {
      return new Response(JSON.stringify({ rawText: text }), { status: 200, headers: jsonHeaders })
    }

    return Response.json({ lesson, rawText: text })
  } catch (err) {
    const { message, status } = friendlyErrorMessage(err)
    return Response.json({ error: message }, { status })
  }
}

function parseLesson(text: string): Lesson | null {
  const jsonText = extractJson(text)
  if (!jsonText) return null

  try {
    const parsed = JSON.parse(jsonText) as Partial<Lesson>
    if (
      typeof parsed.sceneSummary !== 'string' ||
      !Array.isArray(parsed.vocabulary) ||
      !Array.isArray(parsed.exchanges)
    ) {
      return null
    }

    const vocabulary = parsed.vocabulary.filter(isVocabularyItem).slice(0, 7).map(normalizeVocabularyItem)

    return {
      sceneSummary: parsed.sceneSummary,
      vocabulary,
      exchanges: parsed.exchanges
        .filter(isConversationExchange)
        .slice(0, 2)
        .map(exchange => normalizeConversationExchange(exchange, vocabulary)),
      miniPractice: Array.isArray(parsed.miniPractice)
        ? parsed.miniPractice.filter((item): item is string => typeof item === 'string').slice(0, 4)
        : [],
    }
  } catch {
    return null
  }
}

function parseConversationUpdate(
  text: string,
  imageVocabulary: VocabularyItem[],
): Pick<Lesson, 'exchanges' | 'miniPractice'> | null {
  const jsonText = extractJson(text)
  if (!jsonText) return null

  try {
    const parsed = JSON.parse(jsonText) as Partial<Pick<Lesson, 'exchanges' | 'miniPractice'>>
    if (!Array.isArray(parsed.exchanges)) return null

    return {
      exchanges: parsed.exchanges
        .filter(isConversationExchange)
        .slice(0, 2)
        .map(exchange => normalizeConversationExchange(exchange, imageVocabulary)),
      miniPractice: Array.isArray(parsed.miniPractice)
        ? parsed.miniPractice.filter((item): item is string => typeof item === 'string').slice(0, 4)
        : [],
    }
  } catch {
    return null
  }
}

function extractJson(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null

  return text.slice(firstBrace, lastBrace + 1)
}

function isVocabularyItem(item: unknown): item is VocabularyItem {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.english === 'string' &&
    typeof candidate.japanese === 'string' &&
    typeof candidate.reading === 'string' &&
    typeof candidate.beginnerNote === 'string'
  )
}

function normalizeVocabularyItem(item: VocabularyItem): VocabularyItem {
  const labelPosition = normalizeLabelPosition(item.labelPosition)
  const kanaReading = item.kanaReading?.trim()
  const normalizedItem = kanaReading ? { ...item, kanaReading } : item

  return labelPosition ? { ...normalizedItem, labelPosition } : normalizedItem
}

function normalizeConversationExchange(exchange: ConversationExchange, imageVocabulary: VocabularyItem[]): ConversationExchange {
  const identifiedJapanese = new Set(imageVocabulary.map(item => item.japanese.trim()))

  return {
    title: exchange.title,
    context: exchange.context,
    lines: exchange.lines.filter(isDialogueLine).slice(0, 4),
    vocabulary: Array.isArray(exchange.vocabulary)
      ? exchange.vocabulary.filter(isVocabularyItem).slice(0, 4).map(normalizeVocabularyItem)
          .filter(item => !identifiedJapanese.has(item.japanese.trim()))
      : [],
  }
}

function normalizeLabelPosition(position: unknown) {
  if (!position || typeof position !== 'object') return null
  const candidate = position as Record<string, unknown>
  const left = Number(candidate.left)
  const top = Number(candidate.top)

  if (!Number.isFinite(left) || !Number.isFinite(top)) return null

  return {
    left: clamp(left, 4, 96),
    top: clamp(top, 4, 92),
  }
}

function isDialogueLine(item: unknown): item is DialogueLine {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.speaker === 'string' &&
    typeof candidate.japanese === 'string' &&
    typeof candidate.romaji === 'string' &&
    typeof candidate.english === 'string'
  )
}

function isConversationExchange(item: unknown): item is ConversationExchange {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.context === 'string' &&
    Array.isArray(candidate.lines) &&
    candidate.lines.filter(isDialogueLine).length >= 3
  )
}

function getConversationLevel(difficulty: AnalyzeRequest['conversationDifficulty']) {
  if (difficulty === 'hard') {
    return 'Hard: JLPT N1/N2 style. Use more natural adult phrasing, nuanced grammar, and richer expressions while still keeping the exchange grounded in the image.'
  }

  if (difficulty === 'intermediate') {
    return 'Intermediate: JLPT N3 style. Use natural everyday conversation with moderate grammar such as ている, そう, かもしれない, と思う, and simple relative clauses.'
  }

  return 'Easy: JLPT N4/N5 style. Use short, clear sentences, basic particles, polite です/ます forms, and simple question-answer patterns.'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
