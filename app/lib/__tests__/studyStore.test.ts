import { beforeEach, describe, expect, it, vi } from 'vitest'

function installLocalStorageStub() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size },
  }
  vi.stubGlobal('window', { localStorage })
  return store
}

installLocalStorageStub()

const {
  getSavedVocabulary,
  getVocabularyUnits,
  saveVocabularyItems,
  toggleVocabularyFlag,
  isVocabularyFlagged,
  updateVocabularyReview,
  vocabularyUnitSize,
} = await import('../studyStore')

const sampleItem = (english: string, japanese: string) => ({
  english,
  japanese,
  reading: 'reading',
  beginnerNote: 'note',
})

describe('saveVocabularyItems', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves new items with spaced-repetition defaults', () => {
    saveVocabularyItems([sampleItem('book', '本')], 'test')
    const [saved] = getSavedVocabulary()
    expect(saved.intervalDays).toBe(1)
    expect(saved.reviewCount).toBe(0)
    expect(saved.learned).toBe(false)
    expect(new Date(saved.nextReviewAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('does not duplicate items with the same english+japanese key', () => {
    saveVocabularyItems([sampleItem('book', '本')], 'a')
    saveVocabularyItems([sampleItem('Book', '本')], 'b')
    expect(getSavedVocabulary()).toHaveLength(1)
  })
})

describe('updateVocabularyReview (spaced repetition)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveVocabularyItems([sampleItem('book', '本')], 'test')
  })

  const id = () => getSavedVocabulary()[0].id

  it('doubles the interval on a correct answer', () => {
    updateVocabularyReview(id(), true)
    expect(getSavedVocabulary()[0].intervalDays).toBe(2)
    updateVocabularyReview(id(), true)
    expect(getSavedVocabulary()[0].intervalDays).toBe(4)
  })

  it('caps the interval at 64 days', () => {
    for (let i = 0; i < 10; i += 1) updateVocabularyReview(id(), true)
    expect(getSavedVocabulary()[0].intervalDays).toBe(64)
  })

  it('resets the interval to 1 day on a wrong answer', () => {
    updateVocabularyReview(id(), true)
    updateVocabularyReview(id(), true)
    updateVocabularyReview(id(), false)
    expect(getSavedVocabulary()[0].intervalDays).toBe(1)
  })

  it('schedules the next review in the future after a correct answer', () => {
    updateVocabularyReview(id(), true)
    const item = getSavedVocabulary()[0]
    const expected = Date.now() + 2 * 24 * 60 * 60 * 1000
    expect(new Date(item.nextReviewAt).getTime()).toBeGreaterThan(Date.now())
    expect(Math.abs(new Date(item.nextReviewAt).getTime() - expected)).toBeLessThan(5000)
  })

  it('marks a word learned after 3 correct with at least 80% accuracy', () => {
    updateVocabularyReview(id(), true)
    updateVocabularyReview(id(), true)
    expect(getSavedVocabulary()[0].learned).toBe(false)
    updateVocabularyReview(id(), true)
    expect(getSavedVocabulary()[0].learned).toBe(true)
  })

  it('does not mark learned when accuracy is below 80%', () => {
    updateVocabularyReview(id(), false)
    updateVocabularyReview(id(), true)
    updateVocabularyReview(id(), true)
    updateVocabularyReview(id(), true)
    // 3 correct out of 4 = 75%
    expect(getSavedVocabulary()[0].learned).toBe(false)
  })
})

describe('getVocabularyUnits', () => {
  beforeEach(() => window.localStorage.clear())

  it('splits vocabulary into units of the configured size', () => {
    const items = Array.from({ length: vocabularyUnitSize + 5 }, (_, i) =>
      sampleItem(`word${i}`, `語${i}`),
    )
    saveVocabularyItems(items, 'test')
    const units = getVocabularyUnits()
    expect(units).toHaveLength(2)
    expect(units[0].items).toHaveLength(vocabularyUnitSize)
    expect(units[1].items).toHaveLength(5)
  })
})

describe('toggleVocabularyFlag', () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveVocabularyItems([sampleItem('book', '本')], 'test')
  })

  it('flags and unflags an item', () => {
    const item = getSavedVocabulary()[0]
    toggleVocabularyFlag(item)
    expect(isVocabularyFlagged(item.id)).toBe(true)
    toggleVocabularyFlag(item)
    expect(isVocabularyFlagged(item.id)).toBe(false)
  })
})
