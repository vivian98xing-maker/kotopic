const storagePrefix = 'japanese-study-guide:'

export function exportStudyData() {
  if (typeof window === 'undefined') return

  const data: Record<string, unknown> = {}
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key || !key.startsWith(storagePrefix)) continue
    try {
      data[key] = JSON.parse(window.localStorage.getItem(key) || 'null')
    } catch {
      // Skip unreadable entries
    }
  }

  const payload = {
    app: 'kotopic',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `kotopic-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importStudyData(file: File): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await file.text()
    const payload = JSON.parse(text) as { app?: string; data?: Record<string, unknown> }

    if (payload.app !== 'kotopic' || !payload.data || typeof payload.data !== 'object') {
      return { ok: false, message: 'This file is not a Kotopic backup.' }
    }

    const entries = Object.entries(payload.data).filter(([key]) => key.startsWith(storagePrefix))
    if (entries.length === 0) {
      return { ok: false, message: 'The backup file contains no study data.' }
    }

    entries.forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })

    return { ok: true, message: `Restored ${entries.length} data sets. Reloading...` }
  } catch {
    return { ok: false, message: 'Could not read the backup file.' }
  }
}
