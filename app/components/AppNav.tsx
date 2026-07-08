'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSavedVocabulary } from '../lib/studyStore'

const links = [
  { href: '/', label: 'Lesson' },
  { href: '/vocabulary', label: 'Vocab' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/kana', label: 'Kana' },
  { href: '/progress', label: 'Progress' },
  { href: '/history', label: 'History' },
]

export function AppNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    const now = new Date()
    const due = getSavedVocabulary().filter(item => {
      if (item.learned) return false
      if (!item.nextReviewAt) return true
      return new Date(item.nextReviewAt) <= now
    }).length
    setDueCount(due)
  }, [pathname])

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <Link className="brand-link brand-link-desktop" href="/" onClick={() => setMenuOpen(false)}>
        Kotopic ことぴく
      </Link>

      <button
        className="nav-hamburger"
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
      >
        <span className={`hamburger-bar${menuOpen ? ' open' : ''}`} />
        <span className={`hamburger-bar${menuOpen ? ' open' : ''}`} />
        <span className={`hamburger-bar${menuOpen ? ' open' : ''}`} />
      </button>

      <div className={`nav-links${menuOpen ? ' nav-links-open' : ''}`}>
        {links.map(link => (
          <Link
            className={pathname === link.href ? 'nav-link nav-link-active' : 'nav-link'}
            href={link.href}
            key={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
            {link.href === '/vocabulary' && dueCount > 0 && (
              <span className="nav-due-badge" aria-label={`${dueCount} words due for review`}>
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
