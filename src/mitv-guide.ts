/// <reference types="vite/client" />
// "Now playing" data from mi.tv. A channel page (https://mi.tv/ar/canales/<slug>)
// loads its schedule from /ar/async/channel/<slug>/<utcOffsetMinutes>, an HTML
// list of <li> items (class "passed" / "ongoing" / none) with a start time,
// title and subtitle.
//
// The "ongoing" class is baked in when mi.tv renders the page and the page is
// served from a CDN cache, so it can be out of date. Start times are used to
// find the current program and to anchor the list to the right day; the
// "ongoing" item is the fallback when the times don't settle it.
//
// mi.tv sends no CORS headers: on Android the request goes through the native
// HTTP client, in `vite dev` through the dev-server proxy (vite.config.ts).
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { CHANNEL_GUIDE_ALIAS } from './channels-v2'
import type { NowPlaying } from './guide-view'

interface Program {
  title: string
  subtitle: string
  start: number // epoch ms
  end: number // epoch ms
}

interface CacheEntry {
  fetchedAt: number
  programs: Program[]
}

const MITV_ORIGIN = 'https://mi.tv'
const AR_UTC_OFFSET_MIN = -180 // Argentina is UTC-3 all year (no DST)
const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
const LAST_PROGRAM_FALLBACK_MS = 2 * 60 * MINUTE // the list doesn't say when the last item ends
const CACHE_MAX_AGE_MS = 6 * 60 * MINUTE
const FAILURE_RETRY_MS = 5 * MINUTE
const CONCURRENCY = 4
const TIMEOUT_MS = 10 * 1000
const STORAGE_KEY = 'mitv-guide-v1'
const UPDATE_THROTTLE_MS = 250

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires',
})

// Epoch ms of today's 00:00 in Argentina.
function argentinaMidnight(now: number): number {
  const shifted = now + AR_UTC_OFFSET_MIN * MINUTE
  return shifted - (shifted % DAY) - AR_UTC_OFFSET_MIN * MINUTE
}

async function fetchText(path: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url: MITV_ORIGIN + path, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS })
    if (response.status !== 200) throw new Error(`mi.tv ${response.status}`)
    return typeof response.data === 'string' ? response.data : String(response.data ?? '')
  }

  const url = import.meta.env.DEV ? `/mitv${path}` : MITV_ORIGIN + path
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`mi.tv ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function cleanText(node: Element | null): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function parseSchedule(html: string, now: number): Program[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const items = Array.from(doc.querySelectorAll('li')).flatMap((li) => {
    const match = cleanText(li.querySelector('.time')).match(/^(\d{1,2}):(\d{2})$/)
    const title = cleanText(li.querySelector('h2'))
    if (!match || !title) return []
    return [{
      minutes: Number(match[1]) * 60 + Number(match[2]),
      title,
      subtitle: cleanText(li.querySelector('.sub-title')),
      ongoing: li.classList.contains('ongoing'),
    }]
  })
  if (items.length === 0) return []

  // The list is chronological: a time going backwards means it crossed midnight.
  let dayOffset = 0
  const starts = items.map((item, i) => {
    if (i > 0 && item.minutes < items[i - 1].minutes) dayOffset += 1
    return dayOffset * DAY + item.minutes * MINUTE
  })

  const ends = starts.map((start, i) => (i + 1 < starts.length ? starts[i + 1] : start + LAST_PROGRAM_FALLBACK_MS))
  const base = pickDayBase(starts, ends, items.findIndex((item) => item.ongoing), now)

  return items.map((item, i) => ({
    title: item.title,
    subtitle: item.subtitle,
    start: base + starts[i],
    end: base + ends[i],
  }))
}

// The list has times but no dates, and around midnight it may be "today's" or
// still "yesterday's" list. Pick the day where a program covers `now`, best of
// all the one mi.tv marked "ongoing"; default to today.
function pickDayBase(starts: number[], ends: number[], ongoingIndex: number, now: number): number {
  const today = argentinaMidnight(now)
  const candidates = [today, today - DAY]
  const coveringIndex = (base: number) => starts.findIndex((start, i) => base + start <= now && now < base + ends[i])
  return candidates.find((base) => ongoingIndex >= 0 && coveringIndex(base) === ongoingIndex)
    ?? candidates.find((base) => coveringIndex(base) >= 0)
    ?? today
}

export class MiTvGuide {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly failedAt = new Map<string, number>()
  private readonly queued: string[] = []
  private readonly pending = new Set<string>()
  private active = 0
  private updateTimer: ReturnType<typeof setTimeout> | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private readonly onUpdate: () => void

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate
    this.restore()
  }

  // Fetches schedules (that aren't fresh already) for these channels, in order.
  request(channelIds: string[]): void {
    const now = Date.now()
    for (const id of channelIds) {
      const slug = CHANNEL_GUIDE_ALIAS[id]
      if (!slug || this.pending.has(slug) || !this.needsFetch(slug, now)) continue
      this.pending.add(slug)
      this.queued.push(slug)
    }
    this.pump()
  }

  getNowPlaying(channelId: string, now = Date.now()): NowPlaying | null {
    const slug = CHANNEL_GUIDE_ALIAS[channelId]
    const programs = slug ? this.cache.get(slug)?.programs : undefined
    const program = programs?.find((p) => p.start <= now && now < p.end)
    if (!program) return null
    return {
      title: program.title,
      meta: program.subtitle,
      timeRange: `${timeFormatter.format(program.start)} - ${timeFormatter.format(program.end)}`,
      progress: Math.min(1, Math.max(0, (now - program.start) / (program.end - program.start))),
    }
  }

  private needsFetch(slug: string, now: number): boolean {
    const failed = this.failedAt.get(slug)
    if (failed !== undefined && now - failed < FAILURE_RETRY_MS) return false
    const entry = this.cache.get(slug)
    if (!entry) return true
    if (now - entry.fetchedAt > CACHE_MAX_AGE_MS) return true
    // Ran past the end of what we have (also covers empty schedules).
    const last = entry.programs[entry.programs.length - 1]
    return !last || now >= last.start
  }

  private pump(): void {
    while (this.active < CONCURRENCY && this.queued.length > 0) {
      const slug = this.queued.shift()!
      this.active += 1
      void this.load(slug).finally(() => {
        this.active -= 1
        this.pending.delete(slug)
        this.pump()
      })
    }
  }

  private async load(slug: string): Promise<void> {
    try {
      const html = await fetchText(`/ar/async/channel/${encodeURIComponent(slug)}/${AR_UTC_OFFSET_MIN}`)
      const now = Date.now()
      this.cache.set(slug, { fetchedAt: now, programs: parseSchedule(html, now) })
      this.failedAt.delete(slug)
      this.scheduleSave()
      this.scheduleUpdate()
    } catch (error) {
      this.failedAt.set(slug, Date.now())
      console.warn(`[mi.tv] ${slug}:`, error)
    }
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) return
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null
      this.onUpdate()
    }, UPDATE_THROTTLE_MS)
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(this.cache)))
      } catch {
        // Storage full/unavailable: the in-memory cache still works.
      }
    }, 2000)
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const now = Date.now()
      for (const [slug, entry] of Object.entries(JSON.parse(raw) as Record<string, CacheEntry>)) {
        if (entry && Array.isArray(entry.programs) && now - entry.fetchedAt < CACHE_MAX_AGE_MS) this.cache.set(slug, entry)
      }
    } catch {
      // Corrupt cache: start fresh.
    }
  }
}
