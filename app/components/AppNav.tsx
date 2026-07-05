'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
          </Link>
        ))}
      </div>
    </nav>
  )
}
