'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { JapaneseWord } from '../../components/JapaneseWord'
import { speakJapaneseText } from '../../lib/speech'
import { recordReview } from '../../lib/progressStore'
import {
  getSavedVocabulary,
  getVocabularyUnits,
  removeSavedVocabulary,
  toggleVocabularyLearned,
  updateVocabularyReview,
  vocabularyUnitSize,
  type SavedVocabularyItem,
} from '../../lib/studyStore'

type Mode = 'list' | 'practice'

function isDue(item: SavedVocabularyItem) {
  if (!item.nextReviewAt) return true
  return new Date(item.nextReviewAt) <= new Date()
}

export default function VocabularyUnitPage() {
  const params = useParams<{ unitId: string }>()
  const unitNumber = Number(params.unitId?.replace('unit-', '')) || 1
  const [items, setItems] = useState<SavedVocabularyItem[]>([])
  const [mode, setMode] = useState<Mode>('list')
  const [cardIndex, setCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionResult, setSessionResult] = useState<'correct' | 'incorrect' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'due' | 'learned'>('all')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const unit = getVocabularyUnits(getSavedVocabulary()).find(nextUnit => nextUnit.unitNumber === unitNumber)
      setItems(unit?.items || [])
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [unitNumber])

  const practiceQueue = useMemo(() => {
    const due = items.filter(item => !item.learned && isDue(item))
    const notDue = items.filter(item => !item.learned && !isDue(item))
    return [...due, ...notDue]
  }, [items])

  const filteredItems = useMemo(() => {
    let list = items
    if (filter === 'due') list = list.filter(item => isDue(item) && !item.learned)
    else if (filter === 'learned') list = list.filter(item => item.learned)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        item =>
          item.english.toLowerCase().includes(q) ||
          item.japanese.includes(q) ||
          item.reading.toLowerCase().includes(q),
      )
    }
    return list
  }, [items, filter, searchQuery])

  const currentCard = practiceQueue[cardIndex % Math.max(practiceQueue.length, 1)]
  const unitTitle = `Unit ${unitNumber}`
  const dueCount = items.filter(item => isDue(item) && !item.learned).length
  const learnedCount = items.filter(item => item.learned).length

  const progressText = useMemo(() => {
    if (items.length === 0) return `0/${vocabularyUnitSize} words`
    return `${items.length}/${vocabularyUnitSize} words`
  }, [items.length])

  const reloadItems = () => {
    const unit = getVocabularyUnits(getSavedVocabulary()).find(nextUnit => nextUnit.unitNumber === unitNumber)
    setItems(unit?.items || [])
  }

  const handleRemove = (id: string) => {
    removeSavedVocabulary(id)
    reloadItems()
    setCardIndex(0)
    setShowAnswer(false)
  }

  const handleToggleLearned = (id: string) => {
    toggleVocabularyLearned(id)
    reloadItems()
  }

  const handleReview = (correct: boolean) => {
    if (!currentCard) return
    updateVocabularyReview(currentCard.id, correct)
    recordReview(correct)
    setSessionResult(correct ? 'correct' : 'incorrect')
    reloadItems()
    setTimeout(() => {
      setSessionResult(null)
      setCardIndex(i => (i + 1) % Math.max(practiceQueue.length, 1))
      setShowAnswer(false)
    }, 900)
  }

  const handleNextCard = () => {
    setCardIndex(i => (i + 1) % Math.max(practiceQueue.length, 1))
    setShowAnswer(false)
    setSessionResult(null)
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header unit-page-header">
          <div>
            <p className="eyebrow">Vocabulary unit</p>
            <h1>{unitTitle}</h1>
            <p>
              {progressText} &middot; {learnedCount} learned &middot; {dueCount} due for review
            </p>
          </div>
          <Link className="secondary-button page-link-button" href="/vocabulary">
            All units
          </Link>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="Vocabulary unit modes">
          <button className={mode === 'list' ? 'mode-tab mode-tab-active' : 'mode-tab'} type="button" onClick={() => setMode('list')}>
            Full list
          </button>
          <button
            className={mode === 'practice' ? 'mode-tab mode-tab-active' : 'mode-tab'}
            type="button"
            onClick={() => {
              setMode('practice')
              setCardIndex(0)
              setShowAnswer(false)
              setSessionResult(null)
            }}
          >
            Flashcard practice
          </button>
        </div>

        {items.length === 0 ? (
          <section className="panel empty-state">
            <h2>This unit is empty</h2>
            <p>Save more words from the image lesson page to fill this unit.</p>
          </section>
        ) : mode === 'list' ? (
          <>
            <div className="vocab-filter-row">
              <input
                className="vocab-search-input"
                type="search"
                placeholder="Search words..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search vocabulary"
              />
              <div className="mode-tabs vocab-filter-tabs" role="tablist" aria-label="Filter vocabulary">
                {(['all', 'due', 'learned'] as const).map(f => (
                  <button
                    key={f}
                    className={filter === f ? 'mode-tab mode-tab-active' : 'mode-tab'}
                    type="button"
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'due' ? `Due (${dueCount})` : `Learned (${learnedCount})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <section className="panel empty-state">
                <h2>No words match</h2>
                <p>Try a different search or filter.</p>
              </section>
            ) : (
              <section className="saved-list" aria-label={`${unitTitle} vocabulary`}>
                {filteredItems.map(item => (
                  <article className={`panel saved-vocab-card${item.learned ? ' vocab-card-learned' : ''}`} key={item.id}>
                    <div>
                      <div className="word-topline">
                        <p className="japanese-word">
                          <JapaneseWord item={item} />
                        </p>
                        <div className="audio-controls" aria-label={`Audio controls for ${item.japanese}`}>
                          <button className="icon-button" type="button" aria-label="Normal speed" onClick={() => speakJapaneseText(item.japanese, { rate: 0.92 })}>
                            ▶
                          </button>
                          <button className="icon-button" type="button" aria-label="Slow speed" onClick={() => speakJapaneseText(item.japanese, { rate: 0.58 })}>
                            ◔
                          </button>
                        </div>
                      </div>
                      <p className="reading">{item.reading}</p>
                    </div>
                    <div>
                      <h2>{item.english}</h2>
                      <p>{item.beginnerNote}</p>
                      <small>From: {item.source}</small>
                      {item.reviewCount > 0 && (
                        <small className="review-stats">
                          {item.correctCount}/{item.reviewCount} correct &middot; {item.intervalDays}d interval
                        </small>
                      )}
                    </div>
                    <div className="vocab-card-actions">
                      <button
                        className={`secondary-button compact-action${item.learned ? ' learned-active' : ''}`}
                        type="button"
                        onClick={() => handleToggleLearned(item.id)}
                        aria-label={item.learned ? 'Mark as not learned' : 'Mark as learned'}
                      >
                        {item.learned ? 'Learned ✓' : 'Mark learned'}
                      </button>
                      <button className="text-button" type="button" onClick={() => handleRemove(item.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : (
          <>
            {practiceQueue.length === 0 ? (
              <section className="panel empty-state">
                <h2>All caught up!</h2>
                <p>No cards are due for review right now. Come back later or mark some as not learned to review them again.</p>
              </section>
            ) : (
              <section
                className={`panel practice-card${sessionResult === 'correct' ? ' practice-card-correct' : sessionResult === 'incorrect' ? ' practice-card-incorrect' : ''}`}
                aria-label={`${unitTitle} practice`}
              >
                <div className="practice-card-meta">
                  <p className="section-kicker">
                    Card {(cardIndex % practiceQueue.length) + 1} of {practiceQueue.length}
                    {dueCount > 0 && ` · ${dueCount} due`}
                  </p>
                  {currentCard && isDue(currentCard) && (
                    <span className="due-badge">Due now</span>
                  )}
                </div>
                <div className="practice-prompt">
                  <p>
                    {currentCard && <JapaneseWord item={currentCard} />}
                  </p>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Listen"
                    onClick={() => currentCard && speakJapaneseText(currentCard.japanese, { rate: 0.86 })}
                  >
                    ▶
                  </button>
                </div>

                {showAnswer && currentCard ? (
                  <div className="practice-answer">
                    <h2>{currentCard.english}</h2>
                    <p className="reading">{currentCard.reading}</p>
                    <p>{currentCard.beginnerNote}</p>
                  </div>
                ) : (
                  <p className="practice-hint">Try to remember the English meaning, then reveal the answer.</p>
                )}

                <div className="practice-actions">
                  {!showAnswer ? (
                    <button className="secondary-button" type="button" onClick={() => setShowAnswer(true)}>
                      Show answer
                    </button>
                  ) : (
                    <>
                      <button className="practice-incorrect-button" type="button" onClick={() => handleReview(false)}>
                        Got it wrong
                      </button>
                      <button className="practice-correct-button" type="button" onClick={() => handleReview(true)}>
                        Got it right
                      </button>
                    </>
                  )}
                  <button className="secondary-button practice-next-button" type="button" onClick={handleNextCard}>
                    Skip
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}
