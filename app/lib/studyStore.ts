export type VocabularyItem = {
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

export type DialogueLine = {
  speaker: string
  japanese: string
  romaji: string
  english: string
}

export type ConversationExchange = {
  title: string
  context: string
  lines: DialogueLine[]
  vocabulary?: VocabularyItem[]
}

export type Lesson = {
  sceneSummary: string
  vocabulary: VocabularyItem[]
  exchanges: ConversationExchange[]
  miniPractice: string[]
}

export type SavedVocabularyItem = VocabularyItem & {
  id: string
  source: string
  savedAt: string
  learned: boolean
  reviewCount: number
  correctCount: number
  intervalDays: number
  nextReviewAt: string
}

export type SavedConversationExchange = ConversationExchange & {
  id: string
  source: string
  savedAt: string
}

export type VocabularyUnit = {
  unitNumber: number
  items: SavedVocabularyItem[]
}

export type LessonHistoryEntry = {
  id: string
  savedAt: string
  sceneSummary: string
  vocabularyCount: number
  exchangeCount: number
  thumbnailDataUrl: string
  lesson: Lesson
}

const vocabularyStorageKey = 'japanese-study-guide:vocabulary'
const conversationStorageKey = 'japanese-study-guide:conversations'
const lessonHistoryStorageKey = 'japanese-study-guide:lesson-history'
export const vocabularyUnitSize = 20

export function getVocabularyKey(item: Pick<VocabularyItem, 'english' | 'japanese'>) {
  return `${item.english.trim().toLowerCase()}::${item.japanese.trim()}`
}

export function getSavedVocabulary() {
  return readStorage<SavedVocabularyItem[]>(vocabularyStorageKey, [])
}

export function getVocabularyUnits(items = getSavedVocabulary()): VocabularyUnit[] {
  const units: VocabularyUnit[] = []

  for (let index = 0; index < items.length; index += vocabularyUnitSize) {
    units.push({
      unitNumber: Math.floor(index / vocabularyUnitSize) + 1,
      items: items.slice(index, index + vocabularyUnitSize),
    })
  }

  return units
}

export function saveVocabularyItems(items: VocabularyItem[], source: string) {
  const existing = getSavedVocabulary()
  const savedAt = new Date().toISOString()
  const nextItems = [...existing]
  const seen = new Set(existing.map(getVocabularyKey))

  items.forEach(item => {
    const key = getVocabularyKey(item)
    if (seen.has(key)) return

    seen.add(key)
    nextItems.push({
      ...item,
      id: key,
      source,
      savedAt,
      learned: false,
      reviewCount: 0,
      correctCount: 0,
      intervalDays: 1,
      nextReviewAt: new Date().toISOString(),
    })
  })

  writeStorage(vocabularyStorageKey, nextItems)
  return nextItems
}

export function removeSavedVocabulary(id: string) {
  const nextItems = getSavedVocabulary().filter(item => item.id !== id)
  writeStorage(vocabularyStorageKey, nextItems)
  return nextItems
}

export function updateVocabularyReview(id: string, correct: boolean) {
  const items = getSavedVocabulary()
  const nextItems = items.map(item => {
    if (item.id !== id) return item

    const reviewCount = (item.reviewCount || 0) + 1
    const correctCount = (item.correctCount || 0) + (correct ? 1 : 0)
    const currentInterval = item.intervalDays || 1

    const nextInterval = correct ? Math.min(currentInterval * 2, 64) : 1
    const nextReviewAt = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString()
    const learned = correctCount >= 3 && correctCount / reviewCount >= 0.8

    return { ...item, reviewCount, correctCount, intervalDays: nextInterval, nextReviewAt, learned }
  })

  writeStorage(vocabularyStorageKey, nextItems)
  return nextItems
}

export function toggleVocabularyLearned(id: string) {
  const items = getSavedVocabulary()
  const nextItems = items.map(item => {
    if (item.id !== id) return item
    return { ...item, learned: !item.learned }
  })
  writeStorage(vocabularyStorageKey, nextItems)
  return nextItems
}

export function getSavedConversations() {
  return readStorage<SavedConversationExchange[]>(conversationStorageKey, [])
}

export function saveConversationExchanges(exchanges: ConversationExchange[], source: string) {
  const existing = getSavedConversations()
  const savedAt = new Date().toISOString()
  const nextItems = exchanges.map(exchange => ({
    ...exchange,
    id: `${Date.now()}-${slugify(exchange.title)}-${Math.random().toString(36).slice(2, 7)}`,
    source,
    savedAt,
  }))

  writeStorage(conversationStorageKey, [...nextItems, ...existing])
  return [...nextItems, ...existing]
}

export function removeSavedConversation(id: string) {
  const nextItems = getSavedConversations().filter(exchange => exchange.id !== id)
  writeStorage(conversationStorageKey, nextItems)
  return nextItems
}

export function getLessonHistory() {
  return readStorage<LessonHistoryEntry[]>(lessonHistoryStorageKey, [])
}

export function saveLessonHistory(lesson: Lesson, thumbnailDataUrl: string) {
  const existing = getLessonHistory()
  const entry: LessonHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
    sceneSummary: lesson.sceneSummary,
    vocabularyCount: lesson.vocabulary.length,
    exchangeCount: lesson.exchanges.length,
    thumbnailDataUrl,
    lesson,
  }
  const next = [entry, ...existing].slice(0, 50)
  writeStorage(lessonHistoryStorageKey, next)
  return next
}

export function removeLessonHistory(id: string) {
  const nextItems = getLessonHistory().filter(entry => entry.id !== id)
  writeStorage(lessonHistoryStorageKey, nextItems)
  return nextItems
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
