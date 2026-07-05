'use client'

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'
import { Icon } from './components/Icon'
import { JapaneseWord } from './components/JapaneseWord'
import { speakJapaneseText } from './lib/speech'
import { saveConversationExchanges, saveLessonHistory, saveVocabularyItems, type ConversationExchange, type Lesson, type VocabularyItem } from './lib/studyStore'
import { recordLesson } from './lib/progressStore'

type AnalyzeResponse = {
  lesson?: Lesson
  conversationUpdate?: {
    exchanges: ConversationExchange[]
    miniPractice: string[]
  }
  rawText?: string
  error?: string
}

type ConversationDifficulty = 'easy' | 'intermediate' | 'hard'

type DetectedItem = {
  label: string
  score: number
  box: {
    left: number
    top: number
    width: number
    height: number
  }
}

type ImageLessonDraft = {
  previewUrl: string
  imageDataUrl: string
  lesson: Lesson | null
  rawText: string
  detectedItems: DetectedItem[]
  conversationDifficulty: ConversationDifficulty
}

const imageLessonDraftKey = 'japanese-study-guide:image-lesson-draft'

const sampleLesson: Lesson = {
  sceneSummary: 'Upload a photo to turn everyday objects into a beginner Japanese mini lesson.',
  vocabulary: [
    {
      english: 'bag',
      japanese: 'かばん',
      reading: 'kaban',
      beginnerNote: 'A useful everyday word for a school bag, handbag, or backpack.',
    },
    {
      english: 'book',
      japanese: '本',
      kanaReading: 'ほん',
      reading: 'hon',
      beginnerNote: 'Use this for books in general. The counter for books is also hon, but written differently.',
    },
  ],
  exchanges: [
    {
      title: 'Finding a book',
      context: 'A simple exchange about objects in the photo.',
      lines: [
        {
          speaker: 'A',
          japanese: '本はどこですか。',
          romaji: 'Hon wa doko desu ka.',
          english: 'Where is the book?',
        },
        {
          speaker: 'B',
          japanese: 'ここです。',
          romaji: 'Koko desu.',
          english: 'It is here.',
        },
        {
          speaker: 'A',
          japanese: 'これはかばんですか。',
          romaji: 'Kore wa kaban desu ka.',
          english: 'Is this a bag?',
        },
        {
          speaker: 'B',
          japanese: 'はい、かばんです。',
          romaji: 'Hai, kaban desu.',
          english: 'Yes, it is a bag.',
        },
      ],
    },
  ],
  miniPractice: ['Point to one item and say: これは ___ です。', 'Ask about one item: ___ はどこですか。'],
}

export default function Home() {
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [conversationSaveMessage, setConversationSaveMessage] = useState('')
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([])
  const [activeVocabKey, setActiveVocabKey] = useState('')
  const [pinnedVocabKey, setPinnedVocabKey] = useState('')
  const [selectedVocabKeys, setSelectedVocabKeys] = useState<string[]>([])
  const [conversationDifficulty, setConversationDifficulty] = useState<ConversationDifficulty>('easy')
  const [lastImageDataUrl, setLastImageDataUrl] = useState('')
  const [modelLoaded, setModelLoaded] = useState(false)
  const [objectModel, setObjectModel] = useState<cocoSsd.ObjectDetection | null>(null)
  const [studyImageColumnHeight, setStudyImageColumnHeight] = useState<number | null>(null)
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const previewUrlRef = useRef('')
  const studyImageColumnRef = useRef<HTMLDivElement | null>(null)
  const vocabListRef = useRef<HTMLDivElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 680)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let active = true

    cocoSsd
      .load()
      .then(model => {
        if (!active) return
        setObjectModel(model)
        setModelLoaded(true)
      })
      .catch(err => {
        if (!active) return
        setError('The local object detector could not load. You can still use the AI image lesson.')
        console.error(err)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const draft = readImageLessonDraft()
      if (!draft) return

      setPreviewUrl(draft.previewUrl)
      setLastImageDataUrl(draft.imageDataUrl || draft.previewUrl)
      setLesson(draft.lesson)
      setRawText(draft.rawText)
      setDetectedItems(draft.detectedItems)
      setConversationDifficulty(draft.conversationDifficulty || 'easy')
      setSelectedVocabKeys(draft.lesson?.vocabulary.map(getVocabKey) || [])
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  useEffect(() => {
    const imageColumn = studyImageColumnRef.current
    if (!imageColumn) return

    const updateHeight = () => setStudyImageColumnHeight(Math.ceil(imageColumn.getBoundingClientRect().height))
    const observer = new ResizeObserver(updateHeight)
    updateHeight()
    observer.observe(imageColumn)

    return () => observer.disconnect()
  }, [])

  const canAnalyze = useMemo(() => Boolean(image && !loading), [image, loading])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImage = event.target.files?.[0]
    if (!selectedImage) return
    event.target.value = ''

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextPreviewUrl = URL.createObjectURL(selectedImage)
    previewUrlRef.current = nextPreviewUrl

    setImage(selectedImage)
    setPreviewUrl(nextPreviewUrl)
    setLesson(null)
    setRawText('')
    setError('')
    setSaveMessage('')
    setConversationSaveMessage('')
    setDetectedItems([])
    setActiveVocabKey('')
    setPinnedVocabKey('')
    setSelectedVocabKeys([])
    setIsPortrait(false)

    fileToDataUrl(selectedImage).then(dataUrl => {
      writeImageLessonDraft({
        previewUrl: dataUrl,
        imageDataUrl: dataUrl,
        lesson: null,
        rawText: '',
        detectedItems: [],
        conversationDifficulty,
      })
      setLastImageDataUrl(dataUrl)
    })
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const loadImageElement = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = dataUrl
    })
  }

  const resizeImageForApi = async (file: File): Promise<string> => {
    const originalDataUrl = await fileToDataUrl(file)
    const img = await loadImageElement(originalDataUrl)
    const maxSide = 1280
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return originalDataUrl

    context.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.84)
  }

  const detectItems = async (file: File): Promise<DetectedItem[]> => {
    if (!objectModel) return []

    const dataUrl = await resizeImageForApi(file)
    const img = await loadImageElement(dataUrl)
    const predictions = await objectModel.detect(img)
    const uniquePredictions = new Map<string, DetectedItem>()

    predictions
      .filter(prediction => prediction.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .forEach(prediction => {
        if (uniquePredictions.has(prediction.class)) return

        const [x, y, width, height] = prediction.bbox
        uniquePredictions.set(prediction.class, {
          label: prediction.class,
          score: prediction.score,
          box: {
            left: (x / img.naturalWidth) * 100,
            top: (y / img.naturalHeight) * 100,
            width: (width / img.naturalWidth) * 100,
            height: (height / img.naturalHeight) * 100,
          },
        })
      })

    return Array.from(uniquePredictions.values()).slice(0, 8)
  }

  const speakJapanese = (text: string, rate = 0.9, speaker?: string) => {
    if (!speakJapaneseText(text, { rate, speaker })) {
      setError('Speech playback is not available in this browser.')
    }
  }

  const handleSubmit = async () => {
    if (!image) return

    const [imageDataUrl, items] = await Promise.all([
      resizeImageForApi(image),
      modelLoaded ? detectItems(image) : Promise.resolve([]),
    ])
    await analyzeImageLesson(imageDataUrl, items, conversationDifficulty, { clearLesson: true })
  }

  const analyzeImageLesson = async (
    imageDataUrl: string,
    items: DetectedItem[],
    difficulty: ConversationDifficulty,
    options: { clearLesson: boolean },
  ) => {
    setLoading(true)
    setError('')
    setSaveMessage('')
    setConversationSaveMessage('')
    if (options.clearLesson) setLesson(null)
    setRawText('')
    setActiveVocabKey('')
    setPinnedVocabKey('')
    setSelectedVocabKeys([])

    try {
      setDetectedItems(items)
      setLastImageDataUrl(imageDataUrl)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          localItems: items.map(item => item.label),
          conversationDifficulty: difficulty,
        }),
      })

      const data = (await response.json()) as AnalyzeResponse
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      setLesson(data.lesson || null)
      setSelectedVocabKeys(data.lesson?.vocabulary.map(getVocabKey) || [])
      setRawText(data.rawText || '')
      if (data.lesson) {
        saveLessonHistory(data.lesson, imageDataUrl)
        recordLesson()
      }
      writeImageLessonDraft({
        previewUrl: imageDataUrl,
        imageDataUrl,
        lesson: data.lesson || null,
        rawText: data.rawText || '',
        detectedItems: items,
        conversationDifficulty: difficulty,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while analyzing the image.')
    } finally {
      setLoading(false)
    }
  }

  const handleConversationDifficultyChange = (difficulty: ConversationDifficulty) => {
    setConversationDifficulty(difficulty)
    if (!lesson || loading) return
    regenerateConversations(difficulty, lesson)
  }

  const regenerateConversations = async (difficulty: ConversationDifficulty, currentLesson: Lesson) => {
    setLoading(true)
    setError('')
    setSaveMessage('')
    setConversationSaveMessage('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'conversation',
          imageDataUrl: lastImageDataUrl || previewUrl,
          conversationDifficulty: difficulty,
          sceneSummary: currentLesson.sceneSummary,
          vocabulary: currentLesson.vocabulary,
        }),
      })

      const data = (await response.json()) as AnalyzeResponse
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      if (!data.conversationUpdate) {
        throw new Error('No conversation update returned.')
      }

      const nextLesson = {
        ...currentLesson,
        exchanges: data.conversationUpdate.exchanges,
        miniPractice: data.conversationUpdate.miniPractice,
      }

      setLesson(nextLesson)
      setRawText(data.rawText || '')
      writeImageLessonDraft({
        previewUrl,
        imageDataUrl: lastImageDataUrl || previewUrl,
        lesson: nextLesson,
        rawText: data.rawText || '',
        detectedItems,
        conversationDifficulty: difficulty,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while regenerating conversations.')
    } finally {
      setLoading(false)
    }
  }

  const displayedLesson = lesson || sampleLesson
  const orderedVocabulary = pinnedVocabKey
    ? [
        ...displayedLesson.vocabulary.filter(item => getVocabKey(item) === pinnedVocabKey),
        ...displayedLesson.vocabulary.filter(item => getVocabKey(item) !== pinnedVocabKey),
      ]
    : displayedLesson.vocabulary
  const conversationStatusText = loading
    ? `Loading ${conversationDifficulty} conversations...`
    : lesson
      ? `${conversationDifficulty} conversations ready`
      : 'Choose a level before generating'
  const imageLabels = lesson
    ? displayedLesson.vocabulary.map((vocabularyItem, index) => {
        const detectedItem = detectedItems.find(item => wordsMatch(item.label, vocabularyItem.english))
        const fallbackPosition = getFallbackLabelPosition(index, displayedLesson.vocabulary.length)
        const aiPosition = vocabularyItem.labelPosition

        return {
          key: `${vocabularyItem.english}-${vocabularyItem.japanese}-${index}`,
          english: vocabularyItem.english,
          japanese: vocabularyItem.japanese,
          vocabKey: getVocabKey(vocabularyItem),
          left: aiPosition?.left ?? (detectedItem ? clamp(detectedItem.box.left + detectedItem.box.width / 2, 4, 96) : fallbackPosition.left),
          top: aiPosition?.top ?? (detectedItem ? clamp(detectedItem.box.top, 4, 92) : fallbackPosition.top),
          matched: Boolean(aiPosition || detectedItem),
        }
      })
    : []
  const spreadLabels = spreadImageLabels(imageLabels)

  const handleLabelClick = (vocabularyItem: VocabularyItem) => {
    const vocabKey = getVocabKey(vocabularyItem)
    setActiveVocabKey(vocabKey)
    setPinnedVocabKey(vocabKey)
    vocabListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    speakJapanese(vocabularyItem.japanese, 0.8)

    window.setTimeout(() => {
      setActiveVocabKey(currentKey => (currentKey === vocabKey ? '' : currentKey))
    }, 1600)
  }

  const handleSaveVocabulary = () => {
    if (!lesson) return

    const selectedVocabulary = lesson.vocabulary.filter(item => selectedVocabKeys.includes(getVocabKey(item)))
    if (selectedVocabulary.length === 0) {
      setSaveMessage('Choose at least one word to save.')
      return
    }

    saveVocabularyItems(selectedVocabulary, lesson.sceneSummary)
    setSaveMessage(`${selectedVocabulary.length} word${selectedVocabulary.length === 1 ? '' : 's'} saved to My Vocab.`)
  }

  const handleToggleVocabulary = (vocabKey: string) => {
    setSelectedVocabKeys(currentKeys =>
      currentKeys.includes(vocabKey) ? currentKeys.filter(key => key !== vocabKey) : [...currentKeys, vocabKey],
    )
  }

  const handleSelectAllVocabulary = () => {
    if (!lesson) return
    setSelectedVocabKeys(lesson.vocabulary.map(getVocabKey))
  }

  const handleClearVocabularySelection = () => {
    setSelectedVocabKeys([])
  }

  const handleSaveConversations = () => {
    if (!lesson) return

    const exchangesWithNewVocabularyOnly = lesson.exchanges.map(exchange => ({
      ...exchange,
      vocabulary: getConversationVocabulary(exchange, lesson.vocabulary),
    }))

    saveConversationExchanges(exchangesWithNewVocabularyOnly, lesson.sceneSummary)
    setConversationSaveMessage('Conversation exchanges saved.')
  }

  const handleSaveConversationWord = (item: VocabularyItem, exchange: ConversationExchange) => {
    saveVocabularyItems([item], `Conversation: ${exchange.title}`)
    setConversationSaveMessage(`${item.japanese} saved to My Vocab.`)
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <h1 className="dictionary-word">Kotopic <span>ことぴく</span></h1>
          <p className="dictionary-pronunciation intro-hide-mobile">/ko-to-pic/</p>
          <p className="dictionary-part intro-hide-mobile">noun</p>
          <p className="dictionary-definition">Learning Japanese by connecting words to the world you see.</p>
        </div>

        <div className="lesson-stack">
          <section className="panel study-panel" aria-label="Image upload and vocabulary">
            <div className="study-grid">
              <div className="study-image-column" ref={studyImageColumnRef}>
                <div className="panel-header study-column-header">
                  <div>
                    <p className="section-kicker">Step 1</p>
                    <h2 className="heading-with-icon">
                      <Icon name="scan" />
                      Study the image
                    </h2>
                  </div>
                  <span className={modelLoaded ? 'status ready' : 'status'}>
                    <Icon name={modelLoaded ? 'check' : 'scan'} />
                    {modelLoaded ? 'Local scan ready' : 'Loading scan'}
                  </span>
                </div>
                <label className="drop-zone" htmlFor="image-upload">
                  {previewUrl ? (
                    <span className="image-stage">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="image-preview"
                        src={previewUrl}
                        alt="Uploaded preview"
                        onLoad={e => {
                          const { naturalWidth, naturalHeight } = e.currentTarget
                          setIsPortrait(naturalHeight > naturalWidth * 1.1)
                          setIsMobile(window.innerWidth <= 680)
                        }}
                      />
                      {(isPortrait || isMobile)
                        ? spreadLabels.map((item, index) => {
                            const vocabularyItem = displayedLesson.vocabulary.find(vocab => getVocabKey(vocab) === item.vocabKey)
                            if (!vocabularyItem) return null
                            return (
                              <button
                                className="image-label-dot"
                                key={item.key}
                                type="button"
                                style={{ left: `${item.left}%`, top: `${item.top}%` }}
                                onClick={event => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleLabelClick(vocabularyItem)
                                }}
                                aria-label={`${index + 1}. ${item.english}`}
                              >
                                {index + 1}
                              </button>
                            )
                          })
                        : spreadLabels.map(item => {
                            const vocabularyItem = displayedLesson.vocabulary.find(vocab => getVocabKey(vocab) === item.vocabKey)
                            if (!vocabularyItem) return null
                            return (
                              <button
                                className={item.matched ? 'image-label image-label-matched' : 'image-label image-label-unmatched'}
                                key={item.key}
                                type="button"
                                style={{ left: `${item.left}%`, top: `${item.top}%` }}
                                onClick={event => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleLabelClick(vocabularyItem)
                                }}
                              >
                                <JapaneseWord className="image-label-japanese" item={vocabularyItem} />
                                <span className="image-label-english">{item.english}</span>
                              </button>
                            )
                          })
                      }
                    </span>
                  ) : (
                    <span className="drop-zone-placeholder">
                      <Icon name="upload" className="upload-icon" />
                      Choose an image
                      <small>JPG, PNG, or WebP works best</small>
                    </span>
                  )}
                </label>
                {(isPortrait || isMobile) && lesson && spreadLabels.length > 0 && (
                  <div className="portrait-legend">
                    {spreadLabels.map((item, index) => {
                      const vocabularyItem = displayedLesson.vocabulary.find(vocab => getVocabKey(vocab) === item.vocabKey)
                      if (!vocabularyItem) return null
                      return (
                        <button
                          className="portrait-legend-item"
                          key={item.key}
                          type="button"
                          onClick={() => handleLabelClick(vocabularyItem)}
                        >
                          <span className="portrait-legend-num">{index + 1}</span>
                          <span className="portrait-legend-ja">
                            <JapaneseWord item={vocabularyItem} />
                          </span>
                          <span className="portrait-legend-en">{item.english}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <input
                  id="image-upload"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                <div className="image-source-actions">
                  <label className="secondary-button source-action-button" htmlFor="image-upload">
                    <Icon name="upload" />
                    Upload photo
                  </label>
                  <button
                    className="secondary-button source-action-button camera-action-button"
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Icon name="image" />
                    Take photo
                  </button>
                  <input
                    ref={cameraInputRef}
                    className="file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                  />
                </div>

                <p className="scene-summary image-scene-summary">{displayedLesson.sceneSummary}</p>

                <button className="primary-button" type="button" disabled={!canAnalyze} onClick={handleSubmit}>
                  <span className="button-content">
                    <Icon name={loading ? 'spark' : 'scan'} />
                    {loading ? 'Generating...' : 'Generate lesson'}
                  </span>
                </button>

                {loading && (
                  <div className="lesson-progress-bar-wrap" aria-label="Loading lesson">
                    <div className="lesson-progress-bar" />
                  </div>
                )}

                {error && <p className="error-message">{error}</p>}
                {saveMessage && <p className="save-message">{saveMessage}</p>}
              </div>

              <aside
                className="vocab-rail"
                aria-label="Vocabulary list"
                style={
                  studyImageColumnHeight
                    ? ({ '--study-column-height': `${studyImageColumnHeight}px` } as CSSProperties)
                    : undefined
                }
              >
                <div className="rail-header vocab-aligned-header">
                  <div className="section-heading-row">
                    <h3>Vocabulary</h3>
                    <div className="save-controls">
                      <button className="text-button compact-action" type="button" disabled={!lesson} onClick={handleSelectAllVocabulary}>
                        Select all
                      </button>
                      <button
                        className="text-button compact-action"
                        type="button"
                        disabled={!lesson}
                        onClick={handleClearVocabularySelection}
                      >
                        Clear
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!lesson || selectedVocabKeys.length === 0}
                        onClick={handleSaveVocabulary}
                      >
                        <span className="button-content">
                          <Icon name="save" />
                          Save {selectedVocabKeys.length || ''}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="vocab-list" ref={vocabListRef}>
                  {orderedVocabulary.map(item => {
                    const vocabKey = getVocabKey(item)

                    return (
                      <article
                        className={activeVocabKey === vocabKey ? 'vocab-card vocab-card-active' : 'vocab-card'}
                        key={vocabKey}
                      >
                        {lesson && (
                          <label className="vocab-select">
                            <input
                              type="checkbox"
                              checked={selectedVocabKeys.includes(vocabKey)}
                              onChange={() => handleToggleVocabulary(vocabKey)}
                            />
                            <span>Save</span>
                          </label>
                        )}
                        <div>
                          <div className="word-topline">
                            <p className="japanese-word">
                              <JapaneseWord item={item} />
                            </p>
                            <div className="audio-controls" aria-label={`Audio controls for ${item.japanese}`}>
                              <button
                                className="icon-button"
                                type="button"
                                onClick={() => speakJapanese(item.japanese, 0.92)}
                                aria-label={`Listen to ${item.japanese} at normal speed`}
                                title="Normal speed"
                              >
                                <Icon name="play" />
                              </button>
                              <button
                                className="icon-button"
                                type="button"
                                onClick={() => speakJapanese(item.japanese, 0.58)}
                                aria-label={`Listen to ${item.japanese} slowly`}
                                title="Slow speed"
                              >
                                <Icon name="speed" />
                              </button>
                            </div>
                          </div>
                          <p className="reading">{item.reading}</p>
                        </div>
                        <h4>{item.english}</h4>
                      </article>
                    )
                  })}
                </div>
              </aside>
            </div>
          </section>

          <section className="panel lesson-panel" aria-label="Generated Japanese conversation">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Step 2</p>
                <h2 className="heading-with-icon">
                  <Icon name="message" />
                  Conversation practice
                </h2>
              </div>
              <div className="conversation-toolbar">
                {(loading || lesson) && (
                  <span
                    className={loading ? 'conversation-status conversation-status-loading' : 'conversation-status conversation-status-ready'}
                    aria-label={conversationStatusText}
                    role="status"
                    title={conversationStatusText}
                  >
                    {loading ? <span className="loading-spinner" /> : <Icon name="check" />}
                  </span>
                )}
                <div className="difficulty-control" aria-label="Conversation difficulty">
                  {(['easy', 'intermediate', 'hard'] as ConversationDifficulty[]).map(difficulty => (
                    <button
                      className={conversationDifficulty === difficulty ? 'difficulty-option difficulty-option-active' : 'difficulty-option'}
                      key={difficulty}
                      type="button"
                      disabled={loading}
                      onClick={() => handleConversationDifficultyChange(difficulty)}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
                <button className="secondary-button" type="button" disabled={!lesson} onClick={handleSaveConversations}>
                  <span className="button-content">
                    <Icon name="save" />
                    Save conversations
                  </span>
                </button>
              </div>
            </div>
            {conversationSaveMessage && <p className="save-message conversation-save-message">{conversationSaveMessage}</p>}

            <div className="conversation-practice">
              <div className="content-block">
                <div className="exchange-list">
                  {displayedLesson.exchanges.map(exchange => {
                    const exchangeVocabulary = getConversationVocabulary(exchange, displayedLesson.vocabulary)

                    return (
                      <article className="exchange-card" key={`${exchange.title}-${exchange.context}`}>
                      <div className="exchange-header">
                        <h4>{exchange.title}</h4>
                        <p>{exchange.context}</p>
                      </div>
                      {exchange.lines.map((line, index) => (
                        <div
                          className={`dialogue-line speaker-${line.speaker.toLowerCase() === 'b' ? 'b' : 'a'}`}
                          key={`${line.speaker}-${line.japanese}-${index}`}
                        >
                          <span className="speaker-badge">{line.speaker}</span>
                          <div>
                            <div className="sentence-topline">
                              <span className="sentence-ja">{line.japanese}</span>
                              <div className="audio-controls" aria-label={`Audio controls for ${line.japanese}`}>
                                <button
                                  className="icon-button"
                                  type="button"
                                  onClick={() => speakJapanese(line.japanese, 0.92, line.speaker)}
                                  aria-label={`Listen to ${line.japanese} at normal speed`}
                                  title="Normal speed"
                                >
                                  <Icon name="play" />
                                </button>
                                <button
                                  className="icon-button"
                                  type="button"
                                  onClick={() => speakJapanese(line.japanese, 0.58, line.speaker)}
                                  aria-label={`Listen to ${line.japanese} slowly`}
                                  title="Slow speed"
                                >
                                  <Icon name="speed" />
                                </button>
                              </div>
                            </div>
                            <p className="reading">{line.romaji}</p>
                            <p>{line.english}</p>
                          </div>
                        </div>
                      ))}
                      {exchangeVocabulary.length > 0 && (
                        <div className="exchange-vocabulary" aria-label={`Vocabulary from ${exchange.title}`}>
                          {exchangeVocabulary.map(item => (
                            <div className="exchange-word" key={getVocabKey(item)}>
                              <JapaneseWord item={item} />
                              <span>{item.english}</span>
                              <button
                                className="exchange-save-word"
                                type="button"
                                onClick={() => handleSaveConversationWord(item, exchange)}
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
                    )
                  })}
                </div>
              </div>

            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getConversationVocabulary(exchange: ConversationExchange, lessonVocabulary: VocabularyItem[]) {
  const identifiedJapanese = new Set(lessonVocabulary.map(item => item.japanese.trim()))

  return (exchange.vocabulary || []).filter(item => !identifiedJapanese.has(item.japanese.trim()))
}

function getFallbackLabelPosition(index: number, total: number) {
  const columns = Math.min(3, Math.max(2, total))
  const column = index % columns
  const row = Math.floor(index / columns)
  const left = 18 + column * (64 / Math.max(1, columns - 1))
  const top = 18 + row * 14

  return { left: clamp(left, 12, 88), top: clamp(top, 18, 82) }
}

function spreadImageLabels<T extends { left: number; top: number; english: string; japanese: string }>(labels: T[]): T[] {
  const placedLabels: T[] = []
  const minGapX = 10
  const minGapY = 9
  const nudges = [
    { left: 0, top: 0 },
    { left: -8, top: -8 },
    { left: 8, top: -8 },
    { left: -8, top: 8 },
    { left: 8, top: 8 },
    { left: 0, top: -13 },
    { left: 0, top: 13 },
    { left: -14, top: 0 },
    { left: 14, top: 0 },
    { left: -14, top: -12 },
    { left: 14, top: -12 },
    { left: -14, top: 12 },
    { left: 14, top: 12 },
  ]

  labels.forEach(label => {
    const bestPosition =
      nudges.find(nudge => {
        const nextLabel = {
          ...label,
          left: clamp(label.left + nudge.left, 7, 93),
          top: clamp(label.top + nudge.top, 9, 88),
        }

        return placedLabels.every(placedLabel => {
          const horizontalGap = Math.abs(placedLabel.left - nextLabel.left)
          const verticalGap = Math.abs(placedLabel.top - nextLabel.top)
          return horizontalGap >= minGapX || verticalGap >= minGapY
        })
      }) || nudges[0]

    placedLabels.push({
      ...label,
      left: clamp(label.left + bestPosition.left, 7, 93),
      top: clamp(label.top + bestPosition.top, 9, 88),
    })
  })

  return placedLabels
}

function getVocabKey(item: VocabularyItem) {
  return `${item.english}-${item.japanese}`
}

function wordsMatch(detectedLabel: string, englishWord: string) {
  const detectedParts = normalizeWords(detectedLabel)
  const englishParts = normalizeWords(englishWord)

  return detectedParts.some(part => englishParts.includes(part)) || englishParts.some(part => detectedParts.includes(part))
}

function normalizeWords(value: string) {
  const synonyms: Record<string, string> = {
    cellphone: 'phone',
    mobile: 'phone',
    smartphone: 'phone',
    television: 'tv',
    couch: 'sofa',
    backpack: 'bag',
    handbag: 'bag',
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => synonyms[part] || part)
}

function readImageLessonDraft(): ImageLessonDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(imageLessonDraftKey)
    return rawValue ? (JSON.parse(rawValue) as ImageLessonDraft) : null
  } catch {
    return null
  }
}

function writeImageLessonDraft(draft: ImageLessonDraft) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(imageLessonDraftKey, JSON.stringify(draft))
}
