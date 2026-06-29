import type { VocabularyItem } from '../lib/studyStore'

type JapaneseWordProps = {
  item: Pick<VocabularyItem, 'japanese' | 'kanaReading'>
  className?: string
}

export function JapaneseWord({ item, className }: JapaneseWordProps) {
  const kanaReading = item.kanaReading?.trim()
  const shouldShowFurigana = Boolean(kanaReading && kanaReading !== item.japanese && hasKanji(item.japanese))

  return (
    <span className={className}>
      {shouldShowFurigana ? (
        <ruby>
          {item.japanese}
          <rt>{kanaReading}</rt>
        </ruby>
      ) : (
        item.japanese
      )}
    </span>
  )
}

function hasKanji(value: string) {
  return /\p{Script=Han}/u.test(value)
}
