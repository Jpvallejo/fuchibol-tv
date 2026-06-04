/**
 * Fetch and parse TV listings from tvpassport.
 * The page contains a timezone selector with id `timezone_selector` and an
 * accordion with items `itemheader1`, `itemheader2`, ... each having
 * `data-st` (start) and `data-showname` (title).
 */
export async function fetchTvPassportGuide(
  baseUrl: string,
  dayOffset = 0,
): Promise<{ start: string; end: string; title: string }[] | null> {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const base = `${baseUrl}/${dateStr}`

  const fetchHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml',
  }

  const proxyCandidates = [
      `https://corsproxy.io/?${encodeURIComponent(base)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(base)}`,
      `https://r.jina.ai/${encodeURIComponent(base)}`,
  ]

  let html: string | null = null
  for (const url of proxyCandidates) {
    try {
      const res = await fetch(url, { method: 'GET', headers: fetchHeaders })
      if (!res.ok) continue
      html = await res.text()
      break
    } catch (e) {
      // try next
    }
  }

  if (!html) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Determine timezone if present (not required for parsing here)
  const tzEl = doc.getElementById('timezone_selector')
  if (tzEl) {
    // read to ensure page structure exists; value not required
    const sel = tzEl.querySelector('select') as HTMLSelectElement | null
    void sel?.value
  }

  const accordion = doc.getElementById('accordion')
  if (!accordion) return null

  const items = Array.from(accordion.querySelectorAll('[id^="itemheader"]')) as HTMLElement[]
  if (items.length === 0) return null

  const parsed: { startRaw: string; title: string }[] = []

  items.forEach((item) => {
    const startRaw = item.getAttribute('data-st')?.trim() ?? ''
    const title = item.getAttribute('data-showname')?.trim() ?? (item.textContent ?? '').trim()
    if (!startRaw || !title) return
    parsed.push({ startRaw, title })
  })

  if (parsed.length === 0) return null

  // Normalize starts to HH:MM; if startRaw contains a time portion with 'T', parse ISO
  const starts = parsed.map((p) => {
    const s = p.startRaw
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      try {
        const dt = new Date(s)
        return { hhmm: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`, title: p.title }
      } catch {
        return { hhmm: s, title: p.title }
      }
    }
    // If already hh:mm or similar, extract first match
    const match = s.match(/(\d{1,2}:\d{2})/)
    if (match) return { hhmm: match[1].padStart(5, '0'), title: p.title }
    return { hhmm: s, title: p.title }
  })

  const programs: { start: string; end: string; title: string }[] = []
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i]
    const next = starts[i + 1]
    const start = cur.hhmm
    const end = next ? next.hhmm : '23:59'
    programs.push({ start, end, title: cur.title })
  }

  return programs
}

// Convenience wrapper for CBS Omaha (channel 500)
export async function fetchTvPassportGuideForCbsOmaha(dayOffset = 0): Promise<{ start: string; end: string; title: string }[] | null> {
  return fetchTvPassportGuide(
    'https://www.tvpassport.com/tv-listings/stations/cbs-kmtv-omaha-ne/1243',
    dayOffset,
  )
}

export default fetchTvPassportGuide
