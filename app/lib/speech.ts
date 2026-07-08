type SpeakOptions = {
  rate?: number
  speaker?: string
}

const preferredJapaneseVoiceNames = [
  'siri',
  'premium',
  'enhanced',
  'natural',
  'kyoko',
  'nanami',
  'otoya',
  'keita',
]

export function speakJapaneseText(text: string, { rate = 0.9, speaker }: SpeakOptions = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false

  const synthesis = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  const isSpeakerB = speaker?.trim().toUpperCase() === 'B'
  const voice = selectJapaneseVoice(synthesis.getVoices(), isSpeakerB ? 1 : 0)

  synthesis.cancel()
  utterance.lang = 'ja-JP'
  utterance.rate = rate
  utterance.pitch = isSpeakerB ? 0.96 : 1.03
  if (voice) utterance.voice = voice
  synthesis.speak(utterance)

  return true
}

export function checkJapaneseVoice(callback: (available: boolean) => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callback(false)
    return
  }

  const synthesis = window.speechSynthesis
  const hasVoice = () => synthesis.getVoices().some(voice => voice.lang.toLowerCase().startsWith('ja'))

  if (synthesis.getVoices().length > 0) {
    callback(hasVoice())
    return
  }

  // Voices load asynchronously on some browsers
  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    callback(hasVoice())
  }
  synthesis.addEventListener('voiceschanged', settle, { once: true })
  setTimeout(settle, 2000)
}

type SequenceItem = { text: string; speaker?: string; onStart?: () => void }

export function speakSequence(
  items: SequenceItem[],
  { rate = 0.9, onDone }: { rate?: number; onDone?: () => void } = {},
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}

  const synthesis = window.speechSynthesis
  synthesis.cancel()

  let cancelled = false

  function playNext(index: number) {
    if (cancelled || index >= items.length) {
      if (!cancelled) onDone?.()
      return
    }

    const { text, speaker, onStart } = items[index]
    onStart?.()
    const isSpeakerB = speaker?.trim().toUpperCase() === 'B'
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = rate
    utterance.pitch = isSpeakerB ? 0.96 : 1.03
    const voice = selectJapaneseVoice(synthesis.getVoices(), isSpeakerB ? 1 : 0)
    if (voice) utterance.voice = voice
    utterance.onend = () => {
      setTimeout(() => playNext(index + 1), 420)
    }
    synthesis.speak(utterance)
  }

  playNext(0)

  return () => {
    cancelled = true
    synthesis.cancel()
  }
}

function selectJapaneseVoice(voices: SpeechSynthesisVoice[], speakerIndex: number) {
  const japaneseVoices = voices
    .filter(voice => /^ja[-_]/i.test(voice.lang) || /japanese|japan/i.test(voice.name))
    .sort((left, right) => scoreVoice(right) - scoreVoice(left))

  return japaneseVoices[speakerIndex] || japaneseVoices[0]
}

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  const preferredIndex = preferredJapaneseVoiceNames.findIndex(preferred => name.includes(preferred))
  const preferredScore = preferredIndex === -1 ? 0 : preferredJapaneseVoiceNames.length - preferredIndex

  return preferredScore * 10 + (voice.localService ? 1 : 0)
}
