'use client'

import { useEffect, useState } from 'react'
import { JapaneseWord } from '../components/JapaneseWord'
import { speakJapaneseText } from '../lib/speech'
import { getLessonHistory, removeLessonHistory, saveVocabularyItems, saveConversationExchanges, type LessonHistoryEntry } from '../lib/studyStore'

export default function HistoryPage() {
  const [entries, setEntries] = useState<LessonHistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setEntries(getLessonHistory()), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleRemove = (id: string) => {
    setEntries(removeLessonHistory(id))
    if (expanded === id) setExpanded(null)
  }

  const handleSaveAll = (entry: LessonHistoryEntry) => {
    saveVocabularyItems(entry.lesson.vocabulary, entry.lesson.sceneSummary.slice(0, 60))
    saveConversationExchanges(entry.lesson.exchanges, entry.lesson.sceneSummary.slice(0, 60))
    setSaveMessage(`Saved ${entry.lesson.vocabulary.length} words and ${entry.lesson.exchanges.length} conversations.`)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header">
          <p className="eyebrow">Past lessons</p>
          <h1>Lesson History</h1>
          <p>Every analyzed image is saved here so you can revisit vocabulary and conversations.</p>
        </div>

        {saveMessage && <p className="save-message">{saveMessage}</p>}

        {entries.length === 0 ? (
          <section className="panel empty-state">
            <h2>No lessons yet</h2>
            <p>Upload and analyze a photo on the home page — it will appear here automatically.</p>
          </section>
        ) : (
          <section className="saved-list" aria-label="Lesson history">
            {entries.map(entry => (
              <article className="panel history-card" key={entry.id}>
                <div className="history-card-header">
                  {entry.thumbnailDataUrl && (
                    <img
                      className="history-thumbnail"
                      src={entry.thumbnailDataUrl}
                      alt="Lesson photo thumbnail"
                      aria-hidden="true"
                    />
                  )}
                  <div className="history-card-meta">
                    <p className="history-scene">{entry.sceneSummary}</p>
                    <p className="history-stats">
                      {entry.vocabularyCount} words · {entry.exchangeCount} conversations
                    </p>
                    <small className="history-date">
                      {new Date(entry.savedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </small>
                  </div>
                  <div className="history-card-actions">
                    <button
                      className="secondary-button compact-action"
                      type="button"
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      {expanded === entry.id ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                      className="secondary-button compact-action"
                      type="button"
                      onClick={() => handleSaveAll(entry)}
                    >
                      Save all
                    </button>
                    <button className="text-button" type="button" onClick={() => handleRemove(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>

                {expanded === entry.id && (
                  <div className="history-card-body">
                    <h3 className="history-section-title">Vocabulary</h3>
                    <div className="history-vocab-grid">
                      {entry.lesson.vocabulary.map(item => (
                        <div className="history-vocab-item" key={`${item.english}-${item.japanese}`}>
                          <div className="word-topline">
                            <span className="japanese-word">
                              <JapaneseWord item={item} />
                            </span>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Listen to ${item.japanese}`}
                              onClick={() => speakJapaneseText(item.japanese, { rate: 0.9 })}
                            >
                              ▶
                            </button>
                          </div>
                          <p className="reading">{item.reading}</p>
                          <p className="history-vocab-english">{item.english}</p>
                        </div>
                      ))}
                    </div>

                    {entry.lesson.exchanges.length > 0 && (
                      <>
                        <h3 className="history-section-title">Conversations</h3>
                        {entry.lesson.exchanges.map((exchange, i) => (
                          <div className="history-exchange" key={i}>
                            <p className="history-exchange-title">{exchange.title}</p>
                            {exchange.lines.map((line, li) => (
                              <div
                                className={`dialogue-line speaker-${line.speaker.toLowerCase() === 'b' ? 'b' : 'a'}`}
                                key={li}
                              >
                                <span className="speaker-badge">{line.speaker}</span>
                                <div>
                                  <div className="sentence-topline">
                                    <span className="sentence-ja">{line.japanese}</span>
                                    <button
                                      className="icon-button"
                                      type="button"
                                      aria-label="Listen"
                                      onClick={() => speakJapaneseText(line.japanese, { rate: 0.9, speaker: line.speaker })}
                                    >
                                      ▶
                                    </button>
                                  </div>
                                  <p className="reading">{line.romaji}</p>
                                  <p>{line.english}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}
