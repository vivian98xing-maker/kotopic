const progressStorageKey = 'japanese-study-guide:progress'

type DayActivity = {
  wordsReviewed: number
  wordsLearned: number
  lessonsAnalyzed: number
}

type ProgressData = {
  days: Record<string, DayActivity>
  lastActiveDate: string
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getProgress(): ProgressData {
  if (typeof window === 'undefined') return { days: {}, lastActiveDate: '' }
  try {
    const raw = window.localStorage.getItem(progressStorageKey)
    return raw ? JSON.parse(raw) : { days: {}, lastActiveDate: '' }
  } catch {
    return { days: {}, lastActiveDate: '' }
  }
}

function saveProgress(data: ProgressData) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(progressStorageKey, JSON.stringify(data))
}

export function recordReview(correct: boolean) {
  const data = getProgress()
  const today = getTodayKey()
  const day = data.days[today] ?? { wordsReviewed: 0, wordsLearned: 0, lessonsAnalyzed: 0 }
  day.wordsReviewed += 1
  if (correct) day.wordsLearned += 1
  data.days[today] = day
  data.lastActiveDate = today
  saveProgress(data)
}

export function recordLesson() {
  const data = getProgress()
  const today = getTodayKey()
  const day = data.days[today] ?? { wordsReviewed: 0, wordsLearned: 0, lessonsAnalyzed: 0 }
  day.lessonsAnalyzed += 1
  data.days[today] = day
  data.lastActiveDate = today
  saveProgress(data)
}

export function getStreak(): number {
  const data = getProgress()
  const dates = Object.keys(data.days).sort().reverse()
  if (dates.length === 0) return 0

  const today = getTodayKey()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 0
  let cursor = new Date(dates[0])

  for (const date of dates) {
    const expected = cursor.toISOString().slice(0, 10)
    if (date === expected) {
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    } else {
      break
    }
  }

  return streak
}

export function getTodayStats(): DayActivity {
  const data = getProgress()
  return data.days[getTodayKey()] ?? { wordsReviewed: 0, wordsLearned: 0, lessonsAnalyzed: 0 }
}

export function getWeeklyStats(): DayActivity[] {
  const data = getProgress()
  const result: DayActivity[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    result.push(data.days[date] ?? { wordsReviewed: 0, wordsLearned: 0, lessonsAnalyzed: 0 })
  }
  return result
}

export function getWeekDayLabels(): string[] {
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000)
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
  }
  return labels
}

export function getAllTimeTotals() {
  const data = getProgress()
  let wordsReviewed = 0
  let wordsLearned = 0
  let lessonsAnalyzed = 0
  for (const day of Object.values(data.days)) {
    wordsReviewed += day.wordsReviewed
    wordsLearned += day.wordsLearned
    lessonsAnalyzed += day.lessonsAnalyzed
  }
  return { wordsReviewed, wordsLearned, lessonsAnalyzed }
}
