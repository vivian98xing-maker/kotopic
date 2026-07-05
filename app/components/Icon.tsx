import type { ReactNode } from 'react'

type IconName = 'book' | 'check' | 'image' | 'message' | 'play' | 'save' | 'scan' | 'spark' | 'speed' | 'stop' | 'upload'

type IconProps = {
  name: IconName
  className?: string
}

const paths: Record<IconName, ReactNode> = {
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" />
      <path d="M5 5.5v15" />
      <path d="M8 6h7" />
    </>
  ),
  check: <path d="m5 12 4 4 10-10" />,
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5 17 4.5-4.5 3.5 3.5 2-2 4 4" />
    </>
  ),
  message: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 4v-4.2A2.5 2.5 0 0 1 5 12.5z" />
      <path d="M8 8h8" />
      <path d="M8 11h5" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  save: (
    <>
      <path d="M6 4h10l2 2v14H6z" />
      <path d="M9 4v6h6V4" />
      <path d="M9 17h6" />
    </>
  ),
  scan: (
    <>
      <path d="M8 4H5a1 1 0 0 0-1 1v3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M4 16v3a1 1 0 0 0 1 1h3" />
      <path d="M7 12h10" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
      <path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7z" />
    </>
  ),
  stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  speed: (
    <>
      <path d="M12 19a7 7 0 1 0-7-7" />
      <path d="M12 12 16 8" />
      <path d="M4 19h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg className={className || 'inline-icon'} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
