import { channels as rawChannels, CHANNEL_ID_BY_NUMBER } from './channels'

const channels = [...rawChannels].sort((a, b) => a.number - b.number)
import { ShakaPlayer } from './player'
import { GridNavigation, type NavigationCell } from './navigation'

shaka.polyfill.installAll()

if (!shaka.Player.isBrowserSupported()) {
  document.body.innerHTML = '<p style="color:white;padding:2rem">Browser not supported</p>'
  throw new Error('Shaka Player not supported')
}

interface GuideProgram {
  start: string
  end: string
  title: string
}

interface NormalizedGuideProgram extends GuideProgram {
  startMinutes: number
  endMinutes: number
  wrapsDay: boolean
}

interface GuideApiProgram {
  start: string
  end: string
  name?: {
    es?: string
  }
}

interface GuideApiResponse {
  data?: GuideApiProgram[]
}

interface RenderableProgramCell {
  programIndex: number
  program: NormalizedGuideProgram
  geometry: {
    left: number
    width: number
  }
  splitLabel: {
    title: string
    meta: string
  }
  isCurrent: boolean
}

interface ChannelRowRenderState {
  channel: typeof channels[number]
  rowIndex: number
  rowElement: HTMLElement
  laneElement: HTMLElement
  cells: RenderableProgramCell[]
  loadedProgramIndexes: Set<number>
}

const FALLBACK_GUIDE_REFRESH_MS = 5 * 60 * 1000
const ROOT_REM_PIXELS = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
const GRID_PIXELS_PER_30_MIN = 15 * ROOT_REM_PIXELS
const GRID_PIXELS_PER_MINUTE = GRID_PIXELS_PER_30_MIN / 30
const GRID_WIDTH_MINUTES = 24 * 60
const CELL_MARGIN_TOTAL_PX = 2
const TIMELINE_STEP_MINUTES = 30
const CHANNEL_COLUMN_WIDTH = 120
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const GUIDE_API_REGION = 'bklkOggBImCQp3+kUWjJrhVDoBFSFSWjzSVpxbnS96ChubJcYAr+ijxovCNqP1KU/DmaJp5YruVlQn196OMSzfB+es1ldEyx0nj9Xd+Uw0uwJNTQm0t/AtpF09zm9PUy0bdSLRtnYlY='
const ARGENTINA_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TIME_ZONE,
})
const GUIDE_CACHE_KEY_PREFIX = 'guide-cache-v1:'
const GUIDE_API_COOLDOWN_KEY = 'guide-api-cooldown-until'
const GUIDE_API_COOLDOWN_MS = 15 * 60 * 1000
const GUIDE_API_REQUEST_DELAY_MS = 150
const ROW_LAZY_BUFFER_PX = 240
const PROGRAM_LAZY_BUFFER_PX = 200

interface GuideDayPayload {
  schedule: Record<number, GuideProgram[]>
  logoMap: Record<number, string>
}

interface CachedGuideDay extends GuideDayPayload {
  savedAt: string
  expiresAt: string
}

const screenGrid = document.getElementById('screen-grid')!
const screenPlayer = document.getElementById('screen-player')!
const channelGrid = document.getElementById('channel-grid')!
const video = document.getElementById('video') as HTMLVideoElement
const loadingSpinner = document.getElementById('loading-spinner')!
const errorOverlay = document.getElementById('error-overlay')!
const errorMessage = document.getElementById('error-message')!
const playerOverlay = document.getElementById('player-overlay')!
const overlayChannelName = document.getElementById('overlay-channel-name')!
const overlayChannelNumber = document.getElementById('overlay-channel-number')!
const guideOverlay = document.getElementById('guide-overlay')!
const guideList = document.getElementById('guide-list')!
const backPressTooltip = document.getElementById('back-press-tooltip')!
let liveGuideLogoMap: Record<number, string> = {}

let lastBackPressTime = -Infinity
const DOUBLE_BACK_TIMEOUT = 2000

function showBackPressTooltip(): void {
  backPressTooltip.hidden = false
  setTimeout(() => {
    backPressTooltip.hidden = true
  }, 3000)
}

async function closeApp(): Promise<void> {
  if ('Capacitor' in window) {
    const cap = (window as any).Capacitor
    if (cap.isNativePlatform?.()) {
      cap.nativeChannel?.postMessage({
        type: 'events',
        channel: 'APP',
        event: 'appStateChange',
        data: { isActive: false },
      })

      try {
        cap.exec('App', 'exit', {})
      } catch {
        if ('app' in navigator) {
          (navigator as any).app.exitApp()
        }
      }
    }
  } else if ('app' in navigator) {
    (navigator as any).app.exitApp()
  }
}

const gridHero = document.createElement('section')
gridHero.className = 'searcherblockwrapper'
gridHero.innerHTML = `
  <div class="searcherblock">
    <p class="searcherblock-kicker">Grilla en vivo</p>
    <h1>Argentina TV</h1>
    <p class="searcherblock-copy">Navegá canales y horarios con las flechas. Enter abre el canal seleccionado.</p>
  </div>
`

const gridShell = document.createElement('div')
gridShell.className = 'grillatv'

const epgTrack = document.createElement('div')
epgTrack.className = 'epg-track'

const currentTimeIndicator = document.createElement('div')
currentTimeIndicator.className = 'current-time-indicator'
currentTimeIndicator.innerHTML = '<span class="current-time-label">Ahora</span>'

const timelineHeader = document.createElement('div')
timelineHeader.className = 'grillalineadetiempo'

const rowsContainer = document.createElement('div')
rowsContainer.className = 'listacanales'

epgTrack.append(currentTimeIndicator, timelineHeader, rowsContainer)
gridShell.append(epgTrack)
channelGrid.replaceChildren(gridHero, gridShell)

const currentTimeFab = document.createElement('button')
currentTimeFab.type = 'button'
currentTimeFab.className = 'current-time-fab'
currentTimeFab.textContent = 'Hora actual'
currentTimeFab.setAttribute('aria-label', 'Volver a la hora actual')
screenGrid.appendChild(currentTimeFab)

function isNativePlatform(): boolean {
  if (!('Capacitor' in window)) return false
  const cap = (window as any).Capacitor
  return !!cap.isNativePlatform?.()
}

function isCurrentTimeVisible(): boolean {
  const channelColumnPx = getChannelColumnPx()
  const currentLeft = channelColumnPx + getArgentinaNowMinutes() * GRID_PIXELS_PER_MINUTE
  return currentLeft >= gridShell.scrollLeft && currentLeft <= gridShell.scrollLeft + gridShell.clientWidth
}

function updateCurrentTimeFabVisibility(): void {
  currentTimeFab.hidden = isNativePlatform() || isCurrentTimeVisible() || currentScreen !== 'grid'
}

function jumpToCurrentTime(): void {
  const nowMinutes = getArgentinaNowMinutes()
  scrollGridToCurrentTime(nowMinutes)
  renderVisibleCellsForViewport()
  updateAllBlockTextPositions()
  updateCurrentTimeFabVisibility()
}

currentTimeFab.addEventListener('click', () => {
  jumpToCurrentTime()
})

function setChannelLogos(logoMap: Record<number, string>): void {
  channels.forEach((ch) => {
    const logoUrl = ch.image ?? logoMap[ch.number]
    const logoEl = document.getElementById(`grid-logo-${ch.id}`)
    if (logoUrl && logoEl instanceof HTMLElement) {
      logoEl.style.backgroundImage = `url('${logoUrl}')`
    }
  })
}

function parseHourToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return hour * 60 + minute
}

function formatMinutes(minutes: number): string {
  const normalized = ((minutes % GRID_WIDTH_MINUTES) + GRID_WIDTH_MINUTES) % GRID_WIDTH_MINUTES
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function getArgentinaNowMinutes(): number {
  const parts = ARGENTINA_TIME_FORMATTER.formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function formatUtcIsoToArgentinaTime(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = ARGENTINA_TIME_FORMATTER.formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildGuideApiWindow(dayOffset = 0): { startIso: string, endIso: string } {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const day = now.getUTCDate() + dayOffset

  const startUtc = new Date(Date.UTC(year, month, day, 3, 0, 0, 0))
  const endUtc = new Date(Date.UTC(year, month, day + 1, 6, 0, 0, 0))
  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  }
}

function buildGuideApiUrl(channelId: string, dayOffset = 0): string {
  const { startIso, endIso } = buildGuideApiWindow(dayOffset)
  const url = new URL(`https://cdn.bo.flow.com.ar/content/api/v1/Channel/${encodeURIComponent(channelId)}/schedules`)
  url.searchParams.set('page', '0')
  url.searchParams.set('size', '1000')
  url.searchParams.set('filter[end][gt]', startIso)
  url.searchParams.set('filter[start][lt]', endIso)
  url.searchParams.set('sort', 'start')
  url.searchParams.set('images', 'S_DESC')
  url.searchParams.set('region', GUIDE_API_REGION)
  return url.toString()
}

function buildProxiedGuideApiUrls(channelId: string, dayOffset = 0): string[] {
  const apiUrl = buildGuideApiUrl(channelId, dayOffset)
  return [
    `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
    `https://r.jina.ai/http://${apiUrl.replace(/^https?:\/\//, '')}`,
  ]
}

function getGuideUtcDayKey(dayOffset = 0): string {
  const now = new Date()
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, 0, 0, 0, 0))
  const year = target.getUTCFullYear()
  const month = String(target.getUTCMonth() + 1).padStart(2, '0')
  const day = String(target.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readGuideDayCache(dayKey: string): CachedGuideDay | null {
  try {
    const storageKey = `${GUIDE_CACHE_KEY_PREFIX}${dayKey}`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedGuideDay
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.schedule || typeof parsed.schedule !== 'object') return null
    if (!parsed.logoMap || typeof parsed.logoMap !== 'object') return null
    if (!parsed.expiresAt) return null

    const expiresAtMs = Date.parse(parsed.expiresAt)
    if (Number.isNaN(expiresAtMs) || Date.now() >= expiresAtMs) {
      localStorage.removeItem(storageKey)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function getGuideDayExpiryIso(dayKey: string): string {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
  }

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const expiresAt = new Date(Date.UTC(year, month, day + 1, 3, 0, 0, 0))
  return expiresAt.toISOString()
}

function writeGuideDayCache(dayKey: string, payload: GuideDayPayload): void {
  const cacheValue: CachedGuideDay = {
    ...payload,
    savedAt: new Date().toISOString(),
    expiresAt: getGuideDayExpiryIso(dayKey),
  }
  try {
    localStorage.setItem(`${GUIDE_CACHE_KEY_PREFIX}${dayKey}`, JSON.stringify(cacheValue))
  } catch {
    // Ignore storage errors and continue with in-memory data.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getGuideApiCooldownUntil(): number {
  try {
    const raw = localStorage.getItem(GUIDE_API_COOLDOWN_KEY)
    if (!raw) return 0
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

function setGuideApiCooldown(msFromNow: number): void {
  const until = Date.now() + msFromNow
  try {
    localStorage.setItem(GUIDE_API_COOLDOWN_KEY, String(until))
  } catch {
    // Ignore storage errors.
  }
}

function getCurrentProgram(programs: GuideProgram[], nowMinutes: number): GuideProgram | null {
  const normalizedPrograms = normalizeProgramsInSourceOrder(programs)
  const nowCandidates = [
    nowMinutes - GRID_WIDTH_MINUTES,
    nowMinutes,
    nowMinutes + GRID_WIDTH_MINUTES,
  ]

  for (const program of normalizedPrograms) {
    const isCurrent = nowCandidates.some(
      (candidate) => candidate >= program.startMinutes && candidate < program.endMinutes,
    )
    if (isCurrent) {
      return program
    }
  }
  return null
}

function normalizeProgramsInSourceOrder(programs: GuideProgram[]): NormalizedGuideProgram[] {
  if (programs.length === 0) return []

  const firstStartMinutes = parseHourToMinutes(programs[0].start)
  // The source array is chronological; if it starts at a late hour, it belongs to the previous day.
  let dayOffset = firstStartMinutes !== null && firstStartMinutes >= 18 * 60 ? -1 : 0
  let previousStartMinutes: number | null = null
  const normalized: NormalizedGuideProgram[] = []

  programs.forEach((program) => {
    const startMinutes = parseHourToMinutes(program.start)
    const endMinutes = parseHourToMinutes(program.end)
    if (startMinutes === null || endMinutes === null) return

    if (previousStartMinutes !== null && startMinutes < previousStartMinutes) {
      dayOffset += 1
    }

    const absoluteStart = startMinutes + dayOffset * GRID_WIDTH_MINUTES
    const endDayOffset = endMinutes <= startMinutes ? dayOffset + 1 : dayOffset
    const absoluteEnd = endMinutes + endDayOffset * GRID_WIDTH_MINUTES

    normalized.push({
      ...program,
      startMinutes: absoluteStart,
      endMinutes: absoluteEnd,
      wrapsDay: false,
    })

    previousStartMinutes = startMinutes
  })

  return normalized
}

function cellMatchesTime(cell: NavigationCell, minutes: number): boolean {
  if (!cell.wrapsDay) {
    return minutes >= cell.startMinutes && minutes < cell.endMinutes
  }

  return minutes >= cell.startMinutes || minutes < (cell.endMinutes - GRID_WIDTH_MINUTES)
}

function findInitialGridFocus(rows: NavigationCell[][], nowMinutes: number): { rowIndex: number, programIndex: number } {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const currentIndex = row.findIndex((cell) => cellMatchesTime(cell, nowMinutes))
    if (currentIndex !== -1) {
      return { rowIndex, programIndex: currentIndex }
    }
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    if (rows[rowIndex].length > 0) {
      return { rowIndex, programIndex: 0 }
    }
  }

  return { rowIndex: 0, programIndex: 0 }
}

function splitProgramLabel(value: string): { title: string, meta: string } {
  const compact = value.trim().replace(/\s+/g, ' ')
  if (!compact) return { title: '', meta: '' }

  const separators = [' - ', ' | ', ' / ']
  for (const separator of separators) {
    const index = compact.indexOf(separator)
    if (index > 0) {
      return {
        title: compact.slice(0, index).trim(),
        meta: compact.slice(index + separator.length).trim(),
      }
    }
  }

  return { title: compact, meta: '' }
}

function calculateProgramCellGeometry(args: {
  startMinutes: number
  endMinutes: number
  minimumMinutes: number
  maximumMinutes: number
}): { left: number, width: number } | null {
  const { startMinutes, endMinutes, minimumMinutes, maximumMinutes } = args

  if (![startMinutes, endMinutes, minimumMinutes, maximumMinutes].every(Number.isFinite)) {
    return null
  }
  if (startMinutes >= endMinutes || minimumMinutes >= maximumMinutes) {
    return null
  }

  const clampedStart = Math.max(minimumMinutes, startMinutes)
  const clampedEnd = Math.min(maximumMinutes, endMinutes)
  const width = (clampedEnd - clampedStart) * GRID_PIXELS_PER_MINUTE - CELL_MARGIN_TOTAL_PX

  if (width <= 0) {
    return null
  }

  return {
    left: clampedStart * GRID_PIXELS_PER_MINUTE,
    width,
  }
}

function buildTimelineHeader(): void {
  const totalWidth = GRID_WIDTH_MINUTES * GRID_PIXELS_PER_MINUTE

  timelineHeader.innerHTML = ''

  const spacer = document.createElement('div')
  spacer.className = 'timeline-channel-spacer'
  spacer.textContent = 'Canales'

  const track = document.createElement('div')
  track.className = 'timeline-track'
  track.style.width = `${totalWidth}px`

  for (let minute = 0; minute <= GRID_WIDTH_MINUTES; minute += TIMELINE_STEP_MINUTES) {
    const tick = document.createElement('div')
    tick.className = `timeline-tick ${minute % 60 === 0 ? 'major' : 'minor'}`
    tick.style.left = `${minute * GRID_PIXELS_PER_MINUTE}px`

    if (minute % 60 === 0) {
      const label = document.createElement('span')
      label.className = 'timeline-label'
      label.textContent = formatMinutes(minute)
      tick.appendChild(label)
    }

    track.appendChild(tick)
  }

  timelineHeader.append(spacer, track)
}

function extractBackgroundImageUrl(element: HTMLElement | null): string | null {
  if (!element) return null
  const styleValue = element.style.backgroundImage || element.getAttribute('style') || ''
  const match = styleValue.match(/url\(['"]?(.*?)['"]?\)/)
  if (!match?.[1]) return null

  let url = match[1]
  if (url.startsWith('//')) {
    url = `https:${url}`
  } else if (url.startsWith('/')) {
    url = `https://www.telered.com.ar${url}`
  }

  return url
}

function extractGuideDataFromHtml(html: string): { schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const channelRows = Array.from(doc.querySelectorAll('ul.listacanales > li'))
  const schedule: Record<number, GuideProgram[]> = {}
  const logoMap: Record<number, string> = {}

  channelRows.forEach((row) => {
    const numberText = row.querySelector('.chtitle .chnumheader')?.textContent?.trim() ?? ''
    const numberMatch = numberText.match(/\d+/)
    if (!numberMatch) return

    const channelNumber = Number(numberMatch[0])
    if (Number.isNaN(channelNumber)) return

    const logoEl = row.querySelector('.chtitle .logowrapper') as HTMLElement | null
    const logoUrl = extractBackgroundImageUrl(logoEl)
    if (logoUrl) {
      logoMap[channelNumber] = logoUrl
    }

    const programRows = Array.from(row.querySelectorAll('ul li[data-horadesdeex][data-horahastaex]'))
    const programs: GuideProgram[] = []

    programRows.forEach((programRow) => {
      const start = programRow.getAttribute('data-horadesdeex')?.trim() ?? ''
      const end = programRow.getAttribute('data-horahastaex')?.trim() ?? ''
      const title = programRow.querySelector('.programwrapper')?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
      if (!start || !end || !title) return
      programs.push({ start, end, title })
    })

    if (programs.length > 0) {
      schedule[channelNumber] = programs
    }
  })

  return { schedule, logoMap }
}

async function fetchGuideScheduleFromApi(dayOffset = 0): Promise<Record<number, GuideProgram[]>> {
  const schedule: Record<number, GuideProgram[]> = {}

  if (Date.now() < getGuideApiCooldownUntil()) {
    return schedule
  }

  for (const [channelNumberText, channelId] of Object.entries(CHANNEL_ID_BY_NUMBER)) {
    let fetchedForChannel = false

    for (const source of buildProxiedGuideApiUrls(channelId, dayOffset)) {
      try {
        const response = await fetch(source, {
          method: 'GET',
          mode: 'cors',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        })

        if (response.status === 429) {
          setGuideApiCooldown(GUIDE_API_COOLDOWN_MS)
          return schedule
        }

        if (!response.ok) continue

        const text = await response.text()
        const payload = JSON.parse(text) as GuideApiResponse
        const programs = (payload.data ?? [])
          .map((item) => {
            const start = formatUtcIsoToArgentinaTime(item.start)
            const end = formatUtcIsoToArgentinaTime(item.end)
            const title = item.name?.es?.trim().replace(/\s+/g, ' ') ?? ''

            if (!start || !end || !title) return null

            return { start, end, title }
          })
          .filter((program): program is GuideProgram => program !== null)

        if (programs.length > 0) {
          schedule[Number(channelNumberText)] = programs
          fetchedForChannel = true
          break
        }
      } catch {
        // Try next proxy source.
      }
    }

    if (!fetchedForChannel) {
      continue
    }

    await sleep(GUIDE_API_REQUEST_DELAY_MS)
  }

  return schedule
}

async function fetchGuideScheduleByDay(dayOffset = 0): Promise<GuideDayPayload> {
  const [htmlGuide, apiGuide] = await Promise.all([
    fetchGuideScheduleFromHtml(dayOffset),
    fetchGuideScheduleFromApi(dayOffset),
  ])
  return {
    schedule: {
      ...htmlGuide.schedule,
      ...apiGuide,
    },
    logoMap: htmlGuide.logoMap,
  }
}

async function fetchGuideSchedule(): Promise<Record<number, GuideProgram[]>> {
  const todayKey = getGuideUtcDayKey(0)
  const nextDayKey = getGuideUtcDayKey(1)

  let today = readGuideDayCache(todayKey)

  if (!today) {
    const [todayFetched, nextDayFetched] = await Promise.all([
      fetchGuideScheduleByDay(0),
      fetchGuideScheduleByDay(1),
    ])

    writeGuideDayCache(todayKey, todayFetched)
    writeGuideDayCache(nextDayKey, nextDayFetched)

    today = {
      ...todayFetched,
      savedAt: new Date().toISOString(),
      expiresAt: getGuideDayExpiryIso(todayKey),
    }
  } else if (!readGuideDayCache(nextDayKey)) {
    const nextDayFetched = await fetchGuideScheduleByDay(1)
    writeGuideDayCache(nextDayKey, nextDayFetched)
  }

  if (!today) {
    const todayFetched = await fetchGuideScheduleByDay(0)
    writeGuideDayCache(todayKey, todayFetched)
    today = {
      ...todayFetched,
      savedAt: new Date().toISOString(),
      expiresAt: getGuideDayExpiryIso(todayKey),
    }
  }

  liveGuideLogoMap = today.logoMap
  setChannelLogos(liveGuideLogoMap)

  return today.schedule
}

async function fetchGuideScheduleFromHtml(dayOffset = 0): Promise<{ schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> }> {
  const browserLikeHeaders: HeadersInit = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  }

  const teleredGuideUrl = `https://www.telered.com.ar/layout/grillaTVupd.php?prti=0&prtf=24&chlf=0&wn=${dayOffset}&pack=Digital`

  const sources = [
    teleredGuideUrl,
    `https://corsproxy.io/?${encodeURIComponent(teleredGuideUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(teleredGuideUrl)}`,
    `https://r.jina.ai/http://${teleredGuideUrl.replace(/^https?:\/\//, '')}`,
  ]

  for (const source of sources) {
    try {
      const res = await fetch(source, {
        method: 'GET',
        mode: 'cors',
        headers: browserLikeHeaders,
      })
      if (!res.ok) continue
      const html = await res.text()
      const parsed = extractGuideDataFromHtml(html)
      if (Object.keys(parsed.schedule).length > 0) {
        return parsed
      }
    } catch {
      // try next source
    }
  }

  return { schedule: {}, logoMap: {} }
}

async function loadGuideNowPlaying(scheduleOverride?: Record<number, GuideProgram[]>): Promise<void> {
  const schedule = scheduleOverride ?? await fetchGuideSchedule()
  const nowMinutes = getArgentinaNowMinutes()

  channels.forEach((ch, i) => {
    const nowElement = guideItems[i]?.querySelector('.guide-item-now') as HTMLElement | null
    if (!nowElement) return

    const currentProgram = getCurrentProgram(schedule[ch.number] ?? [], nowMinutes)
    nowElement.textContent = currentProgram
      ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
      : 'Sin programa en vivo'
  })
}

const guideItems: HTMLElement[] = []

channels.forEach((ch) => {
  const item = document.createElement('div')
  item.className = 'guide-item'
  item.innerHTML = `
    <span class="guide-item-number">${ch.number}</span>
    <span class="guide-item-color" style="background:${ch.color}"></span>
    <span class="guide-item-text">
      <span class="guide-item-name">${ch.name}</span>
      <span class="guide-item-now">Cargando...</span>
    </span>
  `
  guideList.appendChild(item)
  guideItems.push(item)
})

const shakaPlayer = new ShakaPlayer(video, {
  onLoading() {
    loadingSpinner.hidden = false
    errorOverlay.hidden = true
  },
  onLoaded() {
    loadingSpinner.hidden = true
    showOverlay()
  },
  onError(msg: string) {
    loadingSpinner.hidden = true
    errorOverlay.hidden = false
    console.error('Shaka playback error:', msg)
    errorMessage.textContent = 'Hubo un error al reproducir el canal'
  },
})

let overlayTimer: ReturnType<typeof setTimeout> | null = null

function showOverlay(): void {
  playerOverlay.classList.add('visible')
  resetOverlayTimer()
}

function hideOverlay(): void {
  playerOverlay.classList.remove('visible')
}

function resetOverlayTimer(): void {
  if (overlayTimer) clearTimeout(overlayTimer)
  overlayTimer = setTimeout(hideOverlay, 5000)
}

type Screen = 'grid' | 'player'
let currentScreen: Screen = 'grid'
let gridNavigation: GridNavigation | null = null
let currentProgramRows: NavigationCell[][] = []
let rowRenderStates: ChannelRowRenderState[] = []
let lazyRenderRafId: number | null = null
let channelStickyButtons: HTMLButtonElement[] = []
let focusedGridChannelRow = 0
let currentChannelIndex = 0

function showScreen(screen: Screen): void {
  currentScreen = screen
  screenGrid.classList.toggle('active', screen === 'grid')
  screenPlayer.classList.toggle('active', screen === 'player')
  updateCurrentTimeFabVisibility()

  if (screen === 'grid') {
    focusGridChannelRow(focusedGridChannelRow)
  }
}

function focusGridChannelRow(rowIndex: number): void {
  if (channelStickyButtons.length === 0) return

  const clamped = Math.min(Math.max(rowIndex, 0), channelStickyButtons.length - 1)
  focusedGridChannelRow = clamped

  channelStickyButtons.forEach((button, index) => {
    button.classList.toggle('focused-row', index === clamped)
  })

  const target = channelStickyButtons[clamped]
  target?.focus()
  target?.scrollIntoView({ block: 'nearest' })
}

function moveGridChannelFocus(delta: number): void {
  focusGridChannelRow(focusedGridChannelRow + delta)
}

function getChannelColumnPx(): number {
  return Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--channel-column'),
  ) || 250
}

function scrollGridToCurrentTime(nowMinutes: number): void {
  const channelColumnPx = getChannelColumnPx()
  const currentLeft = channelColumnPx + nowMinutes * GRID_PIXELS_PER_MINUTE
  const target = Math.max(0, currentLeft - gridShell.clientWidth / 2)
  gridShell.scrollLeft = target
}

function isRowNearViewport(rowElement: HTMLElement): boolean {
  const rowRect = rowElement.getBoundingClientRect()
  const shellRect = gridShell.getBoundingClientRect()
  return rowRect.bottom >= shellRect.top - ROW_LAZY_BUFFER_PX && rowRect.top <= shellRect.bottom + ROW_LAZY_BUFFER_PX
}

function isCellNearHorizontalViewport(left: number, width: number): boolean {
  const channelColumnPx = getChannelColumnPx()
  const timelineLeft = Math.max(0, gridShell.scrollLeft - channelColumnPx)
  const timelineRight = timelineLeft + Math.max(0, gridShell.clientWidth - channelColumnPx)
  return (left + width) >= (timelineLeft - PROGRAM_LAZY_BUFFER_PX) && left <= (timelineRight + PROGRAM_LAZY_BUFFER_PX)
}

function updateAllBlockTextPositions(): void {
  const scrollLeft = gridShell.scrollLeft
  rowRenderStates.forEach((state) => {
    state.laneElement.querySelectorAll<HTMLElement>('.program-block').forEach((block) => {
      const blockLeft = Number.parseFloat(block.style.left) || 0
      const shift = Math.max(0, scrollLeft - blockLeft)
      block.classList.toggle('text-shifted', shift > 0)
      const title = block.querySelector('.program-block-title') as HTMLElement | null
      const meta = block.querySelector('.program-block-meta') as HTMLElement | null
      if (title) title.style.transform = `translateX(${shift}px)`
      if (meta) meta.style.transform = `translateX(${shift}px)`
    })
  })
}

function ensureLazyRenderHandlersBound(): void {
  if ((ensureLazyRenderHandlersBound as any)._bound) return
  ;(ensureLazyRenderHandlersBound as any)._bound = true

  const schedule = () => {
    if (lazyRenderRafId !== null) return
    lazyRenderRafId = requestAnimationFrame(() => {
      lazyRenderRafId = null
      renderVisibleCellsForViewport()
      updateAllBlockTextPositions()
      updateCurrentTimeFabVisibility()
    })
  }

  gridShell.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
}

function renderVisibleCellsForViewport(): void {
  rowRenderStates.forEach((state) => {
    if (!isRowNearViewport(state.rowElement)) {
      return
    }

    state.cells.forEach((cell) => {
      if (state.loadedProgramIndexes.has(cell.programIndex)) {
        return
      }
      if (!isCellNearHorizontalViewport(cell.geometry.left, cell.geometry.width)) {
        return
      }

      const block = document.createElement('button')
      block.type = 'button'
      block.className = 'program-block'
      if (cell.isCurrent) {
        block.classList.add('current')
      }
      block.style.left = `${cell.geometry.left}px`
      block.style.width = `${cell.geometry.width}px`
      block.innerHTML = `
        <span class="program-block-title">${cell.splitLabel.title}</span>
        <span class="program-block-meta">${cell.splitLabel.meta || state.channel.shortName}</span>
      `
      block.addEventListener('click', (event) => {
        event.stopPropagation()
        if (gridNavigation) {
          gridNavigation.focusPosition(state.rowIndex, cell.programIndex)
        }
        void openChannel(state.rowIndex)
      })

      state.laneElement.appendChild(block)
      state.loadedProgramIndexes.add(cell.programIndex)

      currentProgramRows[state.rowIndex].push({
        element: block,
        rowIndex: state.rowIndex,
        programIndex: cell.programIndex,
        startMinutes: cell.program.startMinutes,
        endMinutes: cell.program.endMinutes,
        wrapsDay: cell.program.wrapsDay,
      })
      currentProgramRows[state.rowIndex].sort((a, b) => a.programIndex - b.programIndex)
    })
  })
}

function renderEpgGrid(schedule: Record<number, GuideProgram[]>): void {
  const nowMinutes = getArgentinaNowMinutes()
  const totalWidth = GRID_WIDTH_MINUTES * GRID_PIXELS_PER_MINUTE

  buildTimelineHeader()
  rowsContainer.innerHTML = ''
  currentTimeIndicator.style.left = `${getChannelColumnPx() + nowMinutes * GRID_PIXELS_PER_MINUTE}px`
  currentTimeIndicator.style.height = '100%'
  currentTimeIndicator.style.top = '0'

  currentProgramRows = channels.map(() => [])
  rowRenderStates = []
  channelStickyButtons = []

  channels.forEach((channel, rowIndex) => {
    const row = document.createElement('div')
    row.className = 'channel-row'
    row.style.minWidth = `${CHANNEL_COLUMN_WIDTH + totalWidth}px`

    const sticky = document.createElement('button')
    sticky.type = 'button'
    sticky.className = 'channel-sticky'
    sticky.style.borderLeftColor = channel.color
    sticky.innerHTML = `
      <span class="channel-sticky-number">${channel.number}</span>
      <span class="channel-sticky-logo" id="grid-logo-${channel.id}"></span>
      <span class="channel-sticky-copy">
        <span class="channel-sticky-name">${channel.name}</span>
        <span class="channel-sticky-live">Cargando...</span>
      </span>
    `
    sticky.addEventListener('click', () => {
      void openChannel(rowIndex)
    })
    channelStickyButtons.push(sticky)

    const lane = document.createElement('div')
    lane.className = 'channel-programs'
    lane.style.width = `${totalWidth}px`

    const normalizedPrograms = normalizeProgramsInSourceOrder(schedule[channel.number] ?? [])

    const currentProgram = getCurrentProgram(schedule[channel.number] ?? [], nowMinutes)
    const cells: RenderableProgramCell[] = []

    normalizedPrograms.forEach((program, programIndex) => {
      const geometry = calculateProgramCellGeometry({
        startMinutes: program.startMinutes,
        endMinutes: program.endMinutes,
        minimumMinutes: 0,
        maximumMinutes: GRID_WIDTH_MINUTES,
      })
      if (!geometry) return

      const splitLabel = splitProgramLabel(program.title)
      const isCurrent = currentProgram
        ? currentProgram.start === program.start && currentProgram.end === program.end && currentProgram.title === program.title
        : false

      cells.push({
        programIndex,
        program,
        geometry,
        splitLabel,
        isCurrent,
      })
    })

    const currentProgramText = sticky.querySelector('.channel-sticky-live') as HTMLElement | null
    if (currentProgramText) {
      currentProgramText.textContent = currentProgram
        ? currentProgram.title
        : 'Sin programa en vivo'
    }

    row.append(sticky, lane)
    rowsContainer.appendChild(row)
    rowRenderStates.push({
      channel,
      rowIndex,
      rowElement: row,
      laneElement: lane,
      cells,
      loadedProgramIndexes: new Set<number>(),
    })
  })

  ensureLazyRenderHandlersBound()
  renderVisibleCellsForViewport()
  updateAllBlockTextPositions()

  rowRenderStates.forEach((state) => {
    currentProgramRows[state.rowIndex].forEach((cell) => {
      cell.rowIndex = state.rowIndex
    })
  })

  gridNavigation = new GridNavigation(currentProgramRows)
  const initialFocus = findInitialGridFocus(currentProgramRows, nowMinutes)
  gridNavigation.focusPosition(initialFocus.rowIndex, initialFocus.programIndex)
  focusedGridChannelRow = initialFocus.rowIndex
  focusGridChannelRow(initialFocus.rowIndex)
  setChannelLogos(liveGuideLogoMap)

  requestAnimationFrame(() => {
    scrollGridToCurrentTime(nowMinutes)
    renderVisibleCellsForViewport()
    updateAllBlockTextPositions()
    updateCurrentTimeFabVisibility()
  })
}

void (async () => {
  const schedule = await fetchGuideSchedule()
  renderEpgGrid(schedule)
  await loadGuideNowPlaying(schedule)
  scheduleGuideRefresh(schedule)
})()

async function openChannel(index: number): Promise<void> {
  const ch = channels[index]
  if (!ch) return

  currentChannelIndex = index
  overlayChannelNumber.textContent = `${ch.number}`
  overlayChannelName.textContent = ch.name
  showScreen('player')
  hideOverlay()

  await shakaPlayer.load(ch)
}

function selectGuideChannel(index: number): void {
  if (index === currentChannelIndex) {
    closeGuide()
    showOverlay()
    return
  }

  closeGuide()
  void openChannel(index)
}

async function returnToGrid(): Promise<void> {
  closeGuide()
  if (overlayTimer) clearTimeout(overlayTimer)
  hideOverlay()
  await shakaPlayer.destroyPlayer()
  video.src = ''
  loadingSpinner.hidden = true
  errorOverlay.hidden = true
  showScreen('grid')
}

async function channelUp(): Promise<void> {
  const next = (currentChannelIndex + 1) % channels.length
  closeGuide()
  await openChannel(next)
}

async function channelDown(): Promise<void> {
  const next = (currentChannelIndex - 1 + channels.length) % channels.length
  closeGuide()
  await openChannel(next)
}

let isGuideOpen = false
let guideFocusIndex = 0

function openGuide(): void {
  isGuideOpen = true
  guideFocusIndex = currentChannelIndex
  guideOverlay.hidden = false
  applyGuideFocus()
  if (overlayTimer) clearTimeout(overlayTimer)
  hideOverlay()
}

function closeGuide(): void {
  isGuideOpen = false
  guideOverlay.hidden = true
}

function applyGuideFocus(): void {
  guideItems.forEach((item, i) => {
    item.classList.toggle('focused', i === guideFocusIndex)
  })
  guideItems[guideFocusIndex]?.scrollIntoView({ block: 'nearest' })
}

let guideRefreshTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleGuideRefresh(scheduleByChannelNumber: Record<number, GuideProgram[]>): void {
  if (guideRefreshTimeout) {
    clearTimeout(guideRefreshTimeout)
  }

  const nowMinutes = getArgentinaNowMinutes()
  let minMinutesUntilEnd: number | null = null

  channels.forEach((channel) => {
    const currentProgram = getCurrentProgram(scheduleByChannelNumber[channel.number] ?? [], nowMinutes)
    if (!currentProgram) return

    const endMinutes = parseHourToMinutes(currentProgram.end)
    if (endMinutes === null) return

    const minutesUntilEnd = Math.max(1, endMinutes >= nowMinutes ? endMinutes - nowMinutes : endMinutes + GRID_WIDTH_MINUTES - nowMinutes)
    if (minMinutesUntilEnd === null || minutesUntilEnd < minMinutesUntilEnd) {
      minMinutesUntilEnd = minutesUntilEnd
    }
  })

  const delayMs = minMinutesUntilEnd === null
    ? FALLBACK_GUIDE_REFRESH_MS
    : minMinutesUntilEnd * 60 * 1000 + 5000

  guideRefreshTimeout = setTimeout(() => {
    void refreshGuideNowPlaying()
  }, delayMs)
}

async function refreshGuideNowPlaying(): Promise<void> {
  const schedule = await fetchGuideSchedule()
  renderEpgGrid(schedule)
  await loadGuideNowPlaying(schedule)
  scheduleGuideRefresh(schedule)
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const blockedKeys = ['ChannelUp', 'ChannelDown', 'Guide']

  if (blockedKeys.includes(e.key)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
}, { capture: true })

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (currentScreen === 'grid') {
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      const now = Date.now()
      if (!isCurrentTimeVisible()) {
        jumpToCurrentTime()
        lastBackPressTime = now
        return
      }
      if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
        void closeApp()
      } else {
        showBackPressTooltip()
      }
      lastBackPressTime = now
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveGridChannelFocus(-1)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveGridChannelFocus(1)
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      gridShell.scrollLeft = Math.max(0, gridShell.scrollLeft - GRID_PIXELS_PER_30_MIN)
      renderVisibleCellsForViewport()
      updateCurrentTimeFabVisibility()
      return
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      gridShell.scrollLeft += GRID_PIXELS_PER_30_MIN
      renderVisibleCellsForViewport()
      updateCurrentTimeFabVisibility()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      void openChannel(focusedGridChannelRow)
      return
    }
  }

  if (currentScreen === 'player') {
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      if (isGuideOpen) {
        closeGuide()
      } else {
        void returnToGrid()
      }
      return
    }

    if (!isGuideOpen) {
      if (e.key === 'ChannelUp' || e.key === 'ArrowUp') {
        e.preventDefault()
        void channelUp()
        return
      }
      if (e.key === 'ChannelDown' || e.key === 'ArrowDown') {
        e.preventDefault()
        void channelDown()
        return
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (isGuideOpen) {
        selectGuideChannel(guideFocusIndex)
      } else {
        openGuide()
      }
      return
    }

    if (isGuideOpen) {
      if (e.key === 'ArrowUp' && guideFocusIndex > 0) {
        e.preventDefault()
        guideFocusIndex -= 1
        applyGuideFocus()
      } else if (e.key === 'ArrowDown' && guideFocusIndex < channels.length - 1) {
        e.preventDefault()
        guideFocusIndex += 1
        applyGuideFocus()
      }
      return
    }

    showOverlay()
  }
})

guideItems.forEach((item, i) => {
  item.addEventListener('click', () => {
    selectGuideChannel(i)
  })
})

if ('Capacitor' in window) {
  const cap = (window as any).Capacitor
  try {
    cap.Plugins?.App?.addListener('backButton', async () => {
      const now = Date.now()
      if (currentScreen === 'grid') {
        if (!isCurrentTimeVisible()) {
          jumpToCurrentTime()
          lastBackPressTime = now
          return
        }
        if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
          await closeApp()
        } else {
          showBackPressTooltip()
        }
        lastBackPressTime = now
      } else {
        if (isGuideOpen) {
          closeGuide()
        } else {
          await returnToGrid()
        }
      }
    })
  } catch {
    // Capacitor not available, will use keyboard events
  }
}