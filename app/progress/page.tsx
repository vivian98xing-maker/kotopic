'use client'

import { useEffect, useRef, useState } from 'react'
import { exportStudyData, importStudyData } from '../lib/backup'
import { getAllTimeTotals, getStreak, getTodayStats, getWeekDayLabels, getWeeklyStats } from '../lib/progressStore'
import { getSavedVocabulary } from '../lib/studyStore'

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    const result = await importStudyData(file)
    setBackupMessage(result.message)
    if (result.ok) {
      setTimeout(() => window.location.reload(), 1200)
    }
  }

  if (!mounted) return null

  const streak = getStreak()
  const today = getTodayStats()
  const allTime = getAllTimeTotals()
  const weekly = getWeeklyStats()
  const dayLabels = getWeekDayLabels()
  const vocab = getSavedVocabulary()
  const learnedCount = vocab.filter(v => v.learned).length
  const dueCount = vocab.filter(v => {
    if (v.learned) return false
    if (!v.nextReviewAt) return true
    return new Date(v.nextReviewAt) <= new Date()
  }).length

  const maxReviewed = Math.max(...weekly.map(d => d.wordsReviewed), 1)

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-header">
          <p className="eyebrow">Your progress</p>
          <h1>Study Stats</h1>
          <p>Track your streak, reviews, and vocabulary growth over time.</p>
        </div>

        <div className="progress-stat-grid">
          <div className="panel progress-stat-card progress-stat-streak">
            <p className="progress-stat-label">Day streak</p>
            <p className="progress-stat-value">{streak}</p>
            <p className="progress-stat-sub">{streak === 1 ? 'day in a row' : 'days in a row'}</p>
          </div>
          <div className="panel progress-stat-card">
            <p className="progress-stat-label">Reviewed today</p>
            <p className="progress-stat-value">{today.wordsReviewed}</p>
            <p className="progress-stat-sub">words</p>
          </div>
          <div className="panel progress-stat-card">
            <p className="progress-stat-label">Vocab saved</p>
            <p className="progress-stat-value">{vocab.length}</p>
            <p className="progress-stat-sub">{learnedCount} learned</p>
          </div>
          <div className="panel progress-stat-card">
            <p className="progress-stat-label">Due for review</p>
            <p className="progress-stat-value progress-stat-due">{dueCount}</p>
            <p className="progress-stat-sub">words</p>
          </div>
        </div>

        <div className="panel progress-chart-panel">
          <h2 className="progress-chart-title">Reviews this week</h2>
          <div className="progress-bar-chart" role="img" aria-label="Weekly review bar chart">
            {weekly.map((day, i) => (
              <div className="progress-bar-col" key={i}>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ height: `${Math.round((day.wordsReviewed / maxReviewed) * 100)}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="progress-bar-value">{day.wordsReviewed > 0 ? day.wordsReviewed : ''}</span>
                <span className="progress-bar-label">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-alltime-grid">
          <div className="panel progress-alltime-card">
            <p className="progress-stat-label">Total reviews</p>
            <p className="progress-alltime-value">{allTime.wordsReviewed}</p>
          </div>
          <div className="panel progress-alltime-card">
            <p className="progress-stat-label">Lessons analyzed</p>
            <p className="progress-alltime-value">{allTime.lessonsAnalyzed}</p>
          </div>
          <div className="panel progress-alltime-card">
            <p className="progress-stat-label">Correct answers</p>
            <p className="progress-alltime-value">{allTime.wordsLearned}</p>
          </div>
        </div>

        <div className="panel backup-panel">
          <h2 className="progress-chart-title">Backup your data</h2>
          <p className="backup-note">
            All progress is stored on this device only. Download a backup before clearing your browser
            or switching phones, and restore it here on the new device.
          </p>
          <div className="backup-actions">
            <button className="secondary-button" type="button" onClick={exportStudyData}>
              Download backup
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              Restore from backup
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={event => handleImport(event.target.files?.[0])}
            />
          </div>
          {backupMessage && <p className="save-message">{backupMessage}</p>}
        </div>
      </section>
    </main>
  )
}
