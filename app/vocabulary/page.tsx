'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSavedVocabulary, getVocabularyUnits, vocabularyUnitSize, type VocabularyUnit } from '../lib/studyStore'

export default function VocabularyPage() {
  const [units, setUnits] = useState<VocabularyUnit[]>([])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setUnits(getVocabularyUnits(getSavedVocabulary())), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header">
          <p className="eyebrow">Saved words</p>
          <h1>My Vocab List</h1>
          <p>Saved words are organized into units of {vocabularyUnitSize}. New words fill the current unit first.</p>
        </div>

        {units.length === 0 ? (
          <section className="panel empty-state">
            <h2>No saved vocabulary yet</h2>
            <p>Generate a lesson on the image page, then save selected vocabulary from the side rail.</p>
          </section>
        ) : (
          <section className="unit-grid" aria-label="Vocabulary units">
            {units.map(unit => {
              const firstWords = unit.items.slice(0, 4).map(item => item.japanese)

              return (
                <Link className="panel unit-card" href={`/vocabulary/unit-${unit.unitNumber}`} key={unit.unitNumber}>
                  <div>
                    <p className="section-kicker">Unit {unit.unitNumber}</p>
                    <h2>
                      {unit.items.length}/{vocabularyUnitSize} words
                    </h2>
                  </div>
                  <p>{firstWords.join(' · ')}</p>
                  <span>{unit.items.length === vocabularyUnitSize ? 'Ready to review' : 'Still filling'}</span>
                </Link>
              )
            })}
          </section>
        )}
      </section>
    </main>
  )
}
