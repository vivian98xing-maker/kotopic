'use client'

import { useMemo, useState } from 'react'
import { speakJapaneseText } from '../lib/speech'

type KanaChar = { romaji: string; hiragana: string; katakana: string }

const kanaTable: KanaChar[] = [
  { romaji: 'a', hiragana: 'あ', katakana: 'ア' },
  { romaji: 'i', hiragana: 'い', katakana: 'イ' },
  { romaji: 'u', hiragana: 'う', katakana: 'ウ' },
  { romaji: 'e', hiragana: 'え', katakana: 'エ' },
  { romaji: 'o', hiragana: 'お', katakana: 'オ' },
  { romaji: 'ka', hiragana: 'か', katakana: 'カ' },
  { romaji: 'ki', hiragana: 'き', katakana: 'キ' },
  { romaji: 'ku', hiragana: 'く', katakana: 'ク' },
  { romaji: 'ke', hiragana: 'け', katakana: 'ケ' },
  { romaji: 'ko', hiragana: 'こ', katakana: 'コ' },
  { romaji: 'sa', hiragana: 'さ', katakana: 'サ' },
  { romaji: 'shi', hiragana: 'し', katakana: 'シ' },
  { romaji: 'su', hiragana: 'す', katakana: 'ス' },
  { romaji: 'se', hiragana: 'せ', katakana: 'セ' },
  { romaji: 'so', hiragana: 'そ', katakana: 'ソ' },
  { romaji: 'ta', hiragana: 'た', katakana: 'タ' },
  { romaji: 'chi', hiragana: 'ち', katakana: 'チ' },
  { romaji: 'tsu', hiragana: 'つ', katakana: 'ツ' },
  { romaji: 'te', hiragana: 'て', katakana: 'テ' },
  { romaji: 'to', hiragana: 'と', katakana: 'ト' },
  { romaji: 'na', hiragana: 'な', katakana: 'ナ' },
  { romaji: 'ni', hiragana: 'に', katakana: 'ニ' },
  { romaji: 'nu', hiragana: 'ぬ', katakana: 'ヌ' },
  { romaji: 'ne', hiragana: 'ね', katakana: 'ネ' },
  { romaji: 'no', hiragana: 'の', katakana: 'ノ' },
  { romaji: 'ha', hiragana: 'は', katakana: 'ハ' },
  { romaji: 'hi', hiragana: 'ひ', katakana: 'ヒ' },
  { romaji: 'fu', hiragana: 'ふ', katakana: 'フ' },
  { romaji: 'he', hiragana: 'へ', katakana: 'ヘ' },
  { romaji: 'ho', hiragana: 'ほ', katakana: 'ホ' },
  { romaji: 'ma', hiragana: 'ま', katakana: 'マ' },
  { romaji: 'mi', hiragana: 'み', katakana: 'ミ' },
  { romaji: 'mu', hiragana: 'む', katakana: 'ム' },
  { romaji: 'me', hiragana: 'め', katakana: 'メ' },
  { romaji: 'mo', hiragana: 'も', katakana: 'モ' },
  { romaji: 'ya', hiragana: 'や', katakana: 'ヤ' },
  { romaji: 'yu', hiragana: 'ゆ', katakana: 'ユ' },
  { romaji: 'yo', hiragana: 'よ', katakana: 'ヨ' },
  { romaji: 'ra', hiragana: 'ら', katakana: 'ラ' },
  { romaji: 'ri', hiragana: 'り', katakana: 'リ' },
  { romaji: 'ru', hiragana: 'る', katakana: 'ル' },
  { romaji: 're', hiragana: 'れ', katakana: 'レ' },
  { romaji: 'ro', hiragana: 'ろ', katakana: 'ロ' },
  { romaji: 'wa', hiragana: 'わ', katakana: 'ワ' },
  { romaji: 'wo', hiragana: 'を', katakana: 'ヲ' },
  { romaji: 'n', hiragana: 'ん', katakana: 'ン' },
]

type Script = 'hiragana' | 'katakana' | 'both'
type QuizMode = 'kana-to-romaji' | 'romaji-to-kana'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getChar(kana: KanaChar, script: Script): string {
  if (script === 'hiragana') return kana.hiragana
  if (script === 'katakana') return kana.katakana
  return `${kana.hiragana} / ${kana.katakana}`
}

export default function KanaPage() {
  const [tab, setTab] = useState<'chart' | 'quiz'>('chart')
  const [script, setScript] = useState<Script>('hiragana')
  const [quizMode, setQuizMode] = useState<QuizMode>('kana-to-romaji')
  const [quizIndex, setQuizIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [quizQueue, setQuizQueue] = useState<KanaChar[]>(() => shuffle(kanaTable))
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null)

  const currentCard = quizQueue[quizIndex % quizQueue.length]

  const quizScript: Script = script === 'both'
    ? quizIndex % 2 === 0 ? 'hiragana' : 'katakana'
    : script

  const question = quizMode === 'kana-to-romaji'
    ? getChar(currentCard, quizScript)
    : currentCard.romaji

  const answer = quizMode === 'kana-to-romaji'
    ? currentCard.romaji
    : getChar(currentCard, quizScript)

  const handleResult = (correct: boolean) => {
    setLastResult(correct ? 'correct' : 'incorrect')
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setTimeout(() => {
      setLastResult(null)
      setQuizIndex(i => i + 1)
      setShowAnswer(false)
    }, 700)
  }

  const handleReshuffle = () => {
    setQuizQueue(shuffle(kanaTable))
    setQuizIndex(0)
    setShowAnswer(false)
    setScore({ correct: 0, total: 0 })
    setLastResult(null)
  }

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null

  const chartRows = useMemo(() => {
    const rows: KanaChar[][] = []
    for (let i = 0; i < kanaTable.length; i += 5) {
      rows.push(kanaTable.slice(i, i + 5))
    }
    return rows
  }, [])

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header">
          <p className="eyebrow">Character practice</p>
          <h1>Kana Drill</h1>
          <p>Learn and practice hiragana and katakana — the two phonetic alphabets of Japanese.</p>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="Kana modes">
          <button className={tab === 'chart' ? 'mode-tab mode-tab-active' : 'mode-tab'} type="button" onClick={() => setTab('chart')}>
            Chart
          </button>
          <button className={tab === 'quiz' ? 'mode-tab mode-tab-active' : 'mode-tab'} type="button" onClick={() => setTab('quiz')}>
            Quiz
          </button>
        </div>

        {tab === 'chart' ? (
          <>
            <div className="kana-script-toggle">
              {(['hiragana', 'katakana', 'both'] as Script[]).map(s => (
                <button
                  key={s}
                  className={script === s ? 'mode-tab mode-tab-active' : 'mode-tab'}
                  type="button"
                  onClick={() => setScript(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="kana-chart" role="table" aria-label={`${script} chart`}>
              {chartRows.map((row, ri) => (
                <div className="kana-row" key={ri} role="row">
                  {row.map(kana => (
                    <button
                      className="kana-cell"
                      key={kana.romaji}
                      type="button"
                      role="cell"
                      onClick={() => speakJapaneseText(kana.hiragana, { rate: 0.8 })}
                      aria-label={`${getChar(kana, script)}, ${kana.romaji}`}
                    >
                      <span className="kana-char">{getChar(kana, script)}</span>
                      <span className="kana-romaji">{kana.romaji}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="kana-quiz-controls">
              <div className="kana-script-toggle mode-tabs">
                {(['hiragana', 'katakana', 'both'] as Script[]).map(s => (
                  <button
                    key={s}
                    className={script === s ? 'mode-tab mode-tab-active' : 'mode-tab'}
                    type="button"
                    onClick={() => { setScript(s); handleReshuffle() }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="kana-script-toggle mode-tabs">
                <button
                  className={quizMode === 'kana-to-romaji' ? 'mode-tab mode-tab-active' : 'mode-tab'}
                  type="button"
                  onClick={() => { setQuizMode('kana-to-romaji'); handleReshuffle() }}
                >
                  Kana → Romaji
                </button>
                <button
                  className={quizMode === 'romaji-to-kana' ? 'mode-tab mode-tab-active' : 'mode-tab'}
                  type="button"
                  onClick={() => { setQuizMode('romaji-to-kana'); handleReshuffle() }}
                >
                  Romaji → Kana
                </button>
              </div>
            </div>

            {score.total > 0 && (
              <div className="kana-score-bar">
                <span>{score.correct}/{score.total} correct</span>
                {accuracy !== null && <span className="kana-accuracy">{accuracy}% accuracy</span>}
                <button className="text-button" type="button" onClick={handleReshuffle}>Reset</button>
              </div>
            )}

            <section
              className={`panel practice-card kana-quiz-card${lastResult === 'correct' ? ' practice-card-correct' : lastResult === 'incorrect' ? ' practice-card-incorrect' : ''}`}
              aria-label="Kana quiz card"
            >
              <p className="section-kicker">
                Card {(quizIndex % quizQueue.length) + 1} of {quizQueue.length}
              </p>
              <p className="quiz-result-text" role="status" aria-live="polite">
                {lastResult === 'correct' ? '✓ Correct!' : lastResult === 'incorrect' ? '✗ Wrong — keep going!' : ' '}
              </p>
              <div className="practice-prompt kana-prompt">
                <p className={quizMode === 'kana-to-romaji' ? 'kana-question-char' : 'kana-question-romaji'}>
                  {question}
                </p>
                {quizMode === 'kana-to-romaji' && (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Listen"
                    onClick={() => speakJapaneseText(currentCard.hiragana, { rate: 0.8 })}
                  >
                    ▶
                  </button>
                )}
              </div>

              {showAnswer ? (
                <div className="practice-answer">
                  <h2 className={quizMode === 'romaji-to-kana' ? 'kana-answer-char' : ''}>{answer}</h2>
                  {quizMode === 'romaji-to-kana' && (
                    <p className="reading">{currentCard.romaji}</p>
                  )}
                </div>
              ) : (
                <p className="practice-hint">
                  {quizMode === 'kana-to-romaji' ? 'What is the romaji for this character?' : 'What kana represents this sound?'}
                </p>
              )}

              <div className="practice-actions">
                {!showAnswer ? (
                  <button className="secondary-button" type="button" onClick={() => setShowAnswer(true)}>
                    Show answer
                  </button>
                ) : (
                  <>
                    <button className="practice-incorrect-button" type="button" onClick={() => handleResult(false)}>
                      Wrong
                    </button>
                    <button className="practice-correct-button" type="button" onClick={() => handleResult(true)}>
                      Correct
                    </button>
                  </>
                )}
                <button className="secondary-button practice-next-button" type="button" onClick={() => { setQuizIndex(i => i + 1); setShowAnswer(false) }}>
                  Skip
                </button>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
