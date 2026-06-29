'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { JapaneseWord } from '../components/JapaneseWord'
import { speakJapaneseText, speakSequence } from '../lib/speech'
import { getSavedConversations, removeSavedConversation, saveVocabularyItems, type SavedConversationExchange, type VocabularyItem } from '../lib/studyStore'

export default function ConversationsPage() {
  const [exchanges, setExchanges] = useState<SavedConversationExchange[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setExchanges(getSavedConversations()), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleRemove = (id: string) => {
    if (playingId === id) handleStopLoop()
    setExchanges(removeSavedConversation(id))
  }

  const handleSaveWord = (item: VocabularyItem, exchange: SavedConversationExchange) => {
    saveVocabularyItems([item], `Conversation: ${exchange.title}`)
    setSaveMessage(`${item.japanese} saved to My Vocab.`)
  }

  const handlePlayLoop = (exchange: SavedConversationExchange) => {
    if (stopRef.current) stopRef.current()
    setPlayingId(exchange.id)

    const items = exchange.lines.map(line => ({ text: line.japanese, speaker: line.speaker }))
    const stop = speakSequence(items, {
      rate: 0.88,
      onDone: () => setPlayingId(null),
    })
    stopRef.current = stop
  }

  const handleStopLoop = () => {
    if (stopRef.current) {
      stopRef.current()
      stopRef.current = null
    }
    setPlayingId(null)
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header">
          <p className="eyebrow">Saved dialogues</p>
          <h1>Conversation Review</h1>
          <p>Saved exchanges from your image lessons live here for listening and practice.</p>
        </div>
        {saveMessage && <p className="save-message conversation-save-message">{saveMessage}</p>}

        {exchanges.length === 0 ? (
          <section className="panel empty-state">
            <h2>No saved conversations yet</h2>
            <p>Generate a lesson on the image page, then save the conversations from the bottom section.</p>
          </section>
        ) : (
          <section className="saved-list" aria-label="Saved conversations">
            {exchanges.map(exchange => (
              <article className="panel saved-exchange-card" key={exchange.id}>
                <div className="exchange-header saved-exchange-header">
                  <div>
                    <h2>{exchange.title}</h2>
                    <p>{exchange.context}</p>
                    <small>From: {exchange.source}</small>
                  </div>
                  <div className="exchange-header-actions">
                    {playingId === exchange.id ? (
                      <button className="secondary-button compact-action audio-loop-button audio-loop-active" type="button" onClick={handleStopLoop} aria-label="Stop audio loop">
                        ■ Stop loop
                      </button>
                    ) : (
                      <button className="secondary-button compact-action audio-loop-button" type="button" onClick={() => handlePlayLoop(exchange)} aria-label="Play all lines in sequence">
                        ▶ Play all
                      </button>
                    )}
                    <button className="text-button" type="button" onClick={() => handleRemove(exchange.id)}>
                      Remove
                    </button>
                  </div>
                </div>

                {exchange.lines.map((line, index) => (
                  <div
                    className={`dialogue-line speaker-${line.speaker.toLowerCase() === 'b' ? 'b' : 'a'}`}
                    key={`${exchange.id}-${line.speaker}-${line.japanese}-${index}`}
                  >
                    <span className="speaker-badge">{line.speaker}</span>
                    <div>
                      <div className="sentence-topline">
                        <span className="sentence-ja">{line.japanese}</span>
                        <div className="audio-controls" aria-label={`Audio controls for ${line.japanese}`}>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => speakJapaneseText(line.japanese, { rate: 0.92, speaker: line.speaker })}
                            aria-label="Listen at normal speed"
                            title="Normal speed"
                          >
                            ▶
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => speakJapaneseText(line.japanese, { rate: 0.58, speaker: line.speaker })}
                            aria-label="Listen slowly"
                            title="Slow speed"
                          >
                            ◔
                          </button>
                        </div>
                      </div>
                      <p className="reading">{line.romaji}</p>
                      <p>{line.english}</p>
                    </div>
                  </div>
                ))}
                {exchange.vocabulary && exchange.vocabulary.length > 0 && (
                  <div className="exchange-vocabulary" aria-label={`Vocabulary from ${exchange.title}`}>
                    {exchange.vocabulary.map(item => (
                      <div className="exchange-word" key={`${item.english}-${item.japanese}`}>
                        <JapaneseWord item={item} />
                        <span>{item.english}</span>
                        <button
                          className="exchange-save-word"
                          type="button"
                          onClick={() => handleSaveWord(item, exchange)}
                          aria-label={`Save ${item.japanese} to My Vocab`}
                          title="Save to My Vocab"
                        >
                          <Icon name="save" />
                        </button>
                      </div>
                    ))}
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
