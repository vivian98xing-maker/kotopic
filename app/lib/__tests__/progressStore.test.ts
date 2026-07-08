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
}

installLocalStorageStub()

const { recordReview, recordLesson, getStreak, getTodayStats, getAllTimeTotals, getWeeklyStats } =
  await import('../progressStore')

const progressKey = 'japanese-study-guide:progress'
const dayKey = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)

function seedDays(daysAgoList: number[]) {
  const days: Record<string, unknown> = {}
  daysAgoList.forEach(daysAgo => {
    days[dayKey(daysAgo)] = { wordsReviewed: 1, wordsLearned: 1, lessonsAnalyzed: 0 }
  })
  window.localStorage.setItem(progressKey, JSON.stringify({ days, lastActiveDate: dayKey(0) }))
}

beforeEach(() => window.localStorage.clear())

describe('recordReview / recordLesson', () => {
  it('accumulates today\'s counts', () => {
    recordReview(true)
    recordReview(false)
    recordLesson()
    const today = getTodayStats()
    expect(today.wordsReviewed).toBe(2)
    expect(today.wordsLearned).toBe(1)
    expect(today.lessonsAnalyzed).toBe(1)
  })
})

describe('getStreak', () => {
  it('is 0 with no activity', () => {
    expect(getStreak()).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    seedDays([0, 1, 2])
    expect(getStreak()).toBe(3)
  })

  it('still counts a streak ending yesterday (grace day)', () => {
    seedDays([1, 2])
    expect(getStreak()).toBe(2)
  })

  it('is 0 when the last activity is older than yesterday', () => {
    seedDays([2, 3])
    expect(getStreak()).toBe(0)
  })

  it('stops counting at a gap', () => {
    seedDays([0, 1, 3, 4])
    expect(getStreak()).toBe(2)
  })
})

describe('aggregates', () => {
  it('sums all-time totals across days', () => {
    seedDays([0, 1, 5])
    expect(getAllTimeTotals().wordsReviewed).toBe(3)
  })

  it('returns exactly 7 days of weekly stats', () => {
    seedDays([0, 3])
    const weekly = getWeeklyStats()
    expect(weekly).toHaveLength(7)
    expect(weekly[6].wordsReviewed).toBe(1)
    expect(weekly[3].wordsReviewed).toBe(1)
    expect(weekly[5].wordsReviewed).toBe(0)
  })
})
