import { channels, CHANNEL_ID_BY_NUMBER } from './channels'

const TELERED_CHANNEL_NUMBERS = new Set(
  channels
    .filter((channel) => !Object.prototype.hasOwnProperty.call(CHANNEL_ID_BY_NUMBER, channel.movistarNumber))
    .map((channel) => channel.movistarNumber),
)
import { ShakaPlayer } from './player'
import { GridNavigation, type NavigationCell } from './navigation'

// Platform abstraction for Android (Capacitor) and Tizen
interface PlatformAPI {
  isNative: boolean
  closeApp: () => Promise<void>
  onBackButton: (callback: () => Promise<void>) => void
}

function getPlatformAPI(): PlatformAPI {
  // Check for Tizen
  if ('tizen' in window) {
    return {
      isNative: true,
      closeApp: async () => {
        try {
          (window as any).tizen.application.getCurrentApplication().exit()
        } catch (e) {
          console.warn('Tizen exit failed:', e)
        }
      },
      onBackButton: (callback: () => Promise<void>) => {
        try {
          (window as any).tizen.inputdevice.registerKey('0')
          document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.keyCode === 10009 || event.key === 'Backspace' || event.key === 'BrowserBack') {
              event.preventDefault()
              callback().catch(console.error)
            }
          })
        } catch (e) {
          console.warn('Tizen back button registration failed:', e)
        }
      },
    }
  }

  // Fallback to Capacitor (Android)
  if ('Capacitor' in window) {
    const cap = (window as any).Capacitor
    return {
      isNative: !!cap.isNativePlatform?.(),
      closeApp: async () => {
        try {
          cap.exec('App', 'exit', {})
        } catch {
          if ('app' in navigator) {
            (navigator as any).app.exitApp()
          }
        }
      },
      onBackButton: (callback: () => Promise<void>) => {
        try {
          cap.Plugins?.App?.addListener('backButton', callback)
        } catch (e) {
          console.warn('Capacitor back button registration failed:', e)
        }
      },
    }
  }

  // Web fallback (no native platform)
  return {
    isNative: false,
    closeApp: async () => {
      console.warn('closeApp: not on native platform')
    },
    onBackButton: () => {
      console.warn('onBackButton: not on native platform')
    },
  }
}

const platformAPI = getPlatformAPI()

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

// interface GuideEndpointProgram {
//   title: string
//   startDate?: string | null
//   endDate?: string | null
//   raw?: string
// }

// interface GuideEndpointChannel {
//   name: string
//   channelNumber?: number | null
//   programs: GuideEndpointProgram[]
// }

// interface GuideEndpointResponse {
//   channels: GuideEndpointChannel[]
// }

interface ContentApiItem {
  Pid?: string
  Title?: string
  Description?: string
  ChannelName?: string
  ChannelNumber?: number | string
  CallLetter?: string
  Start?: number | string
  End?: number | string
  LiveChannelPid?: string
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
const GRID_PIXELS_PER_30_MIN = 6 * ROOT_REM_PIXELS
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
const DEFAULT_CONTENT_API_URL = 'https://contentapi-ar.cdn.telefonica.com/29/default/es-AR/schedules'
const CONTENT_API_DEVICE_TYPES = 'null|401'
const CONTENT_API_CHANNEL_MAPS = '99|null'
const CONTENT_API_FIELDS = 'Pid,Title,Description,ChannelName,ChannelNumber,CallLetter,Start,End,EpgNetworkDvr,LiveChannelPid,LiveProgramPid,EpgSerieId,SeriesPid,SeriesId,SeasonPid,SeasonNumber,images.videoFrame,images.banner,LiveToVod,AgeRatingPid,forbiddenTechnology,IsSoDisabled'
const CONTENT_API_RELATIONS = 'Genre'
const CONTENT_API_ATTRIBUTES = 'ca_cpvrDisable,ca_descriptors,ca_blackout_target,ca_blackout_areas'
const CONTENT_API_ORDER = 'START_TIME:a'
const CONTENT_API_CHUNK_DELAY_MS = 120

const CHANNEL_PID_CHUNKS: string[][] = [
  ['lch3339', 'lch3075', 'lch3077', 'lch3346', 'lch3337', 'lch3983', 'lch3338', 'lch3267', 'lch3340', 'lch6358'],
  ['lch3079', 'lch3805', 'lch6467', 'lch6601', 'lch3175', 'lch3125', 'lch3124', 'lch3179', 'lch3280', 'lch3320'],
  ['lch3308', 'lch3356', 'lch3266', 'lch3899', 'lch3895', 'lch6240', 'lch3349', 'lch3281', 'lch3123', 'lch3269'],
  ['lch3268', 'lch3351', 'lch3804', 'lch3317', 'lch3348', 'lch3358', 'lch3891', 'lch3440', 'lch3869', 'lch3984'],
  ['lch3173', 'lch6603', 'lch3178', 'lch3802', 'lch3321', 'lch3887', 'lch3352', 'lch3177', 'lch3900', 'lch3078'],
  ['lch3318', 'lch3310', 'lch3896', 'lch3888', 'lch3993', 'lch3122', 'lch3119', 'lch3117', 'lch3118', 'lch3121'],
  ['lch3127', 'lch3128', 'lch3120', 'lch3129', 'lch3328', 'lch3329', 'lch3363', 'lch7075', 'lch3270', 'lch3353'],
  ['lch3305', 'lch3306', 'lch3304', 'lch3071', 'lch3990', 'lch5662', 'lch3364', 'lch3950', 'lch3980', 'lch3988'],
  ['lch3978', 'lch3322', 'lch3893', 'lch3070', 'lch3176', 'lch3126', 'lch3890', 'lch3894', 'lch3897', 'lch3312'],
  ['lch3172', 'lch3342', 'lch3991', 'lch3361', 'lch3282', 'lch3369', 'lch6935', 'lch7072', 'lch3303', 'lch3350'],
  ['lch3265', 'lch3868', 'lch3347', 'lch3989', 'lch3076', 'lch3341', 'lch3987', 'lch3998'],
]

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
const loadingLogo = document.getElementById('loading-logo') as HTMLElement
const loadingNumber = document.getElementById('loading-number') as HTMLElement
const loadingName = document.getElementById('loading-name') as HTMLElement
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
  await platformAPI.closeApp()
}

const gridHero = document.createElement('section')
gridHero.className = 'searcherblockwrapper'
gridHero.innerHTML = `
  <div class="searcherblock">
    <p class="searcherblock-kicker">Grilla en vivo</p>
    <h1>Argentina TV</h1>
    <p class="searcherblock-copy">Disfruta de todos los canales en un solo lugar</p>
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
  return platformAPI.isNative
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
  const initialFocus = findInitialGridFocus(currentProgramRows, nowMinutes)
  focusGridChannelRow(initialFocus.rowIndex)
  renderVisibleCellsForViewport()
  updateAllBlockTextPositions()
  updateCurrentTimeFabVisibility()
}

currentTimeFab.addEventListener('click', () => {
  jumpToCurrentTime()
})

function setChannelLogos(logoMap: Record<number, string>): void {
  channels.forEach((ch) => {
    const logoUrl = ch.image ?? logoMap[ch.movistarNumber]
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

function getArgentinaDayRange(dayOffset: number): { start: number; end: number } {
  const now = new Date()
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const arMillis = utcMillis - 3 * 60 * 60 * 1000
  const arDate = new Date(arMillis)
  const year = arDate.getUTCFullYear()
  const month = arDate.getUTCMonth()
  const day = arDate.getUTCDate()
  const startUtcMillis = Date.UTC(year, month, day, 0, 0, 0) + 3 * 60 * 60 * 1000
  const start = Math.floor((startUtcMillis + dayOffset * 24 * 60 * 60 * 1000) / 1000)
  return { start, end: start + 24 * 60 * 60 }
}

function toContentEpochSeconds(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
  }
  return null
}

function toArgentinaTimeFromEpoch(epochSeconds: number | null): string | null {
  if (!epochSeconds) return null
  return formatUtcIsoToArgentinaTime(new Date(epochSeconds * 1000).toISOString())
}

function buildContentApiUrl(startTime: number, endTime: number, liveChannelPids: string[]): string {
  const params = new URLSearchParams({
    ca_deviceTypes: CONTENT_API_DEVICE_TYPES,
    ca_channelmaps: CONTENT_API_CHANNEL_MAPS,
    fields: CONTENT_API_FIELDS,
    includeRelations: CONTENT_API_RELATIONS,
    orderBy: CONTENT_API_ORDER,
    filteravailability: 'false',
    includeAttributes: CONTENT_API_ATTRIBUTES,
    starttime: String(startTime),
    endtime: String(endTime),
    livechannelpids: liveChannelPids.join(','),
    offset: '0',
    limit: '1000',
  })

  return `${DEFAULT_CONTENT_API_URL}?${params.toString()}`
}

function buildProxiedContentApiUrls(startTime: number, endTime: number, liveChannelPids: string[]): string[] {
  const apiUrl = buildContentApiUrl(startTime, endTime, liveChannelPids)
  return [
    `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
    `https://r.jina.ai/http://${apiUrl.replace(/^https?:\/\//, '')}`,
  ]
}

async function fetchContentApiChunk(startTime: number, endTime: number, liveChannelPids: string[]): Promise<ContentApiItem[]> {
  const sources = buildProxiedContentApiUrls(startTime, endTime, liveChannelPids)

  for (const source of sources) {
    try {
      const res = await fetch(source, {
        method: 'GET',
        mode: 'cors',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })

      if (!res.ok) continue

      const data = await res.json() as { Content?: ContentApiItem[]; Items?: ContentApiItem[]; items?: ContentApiItem[]; Results?: ContentApiItem[] } | ContentApiItem[]
      if (Array.isArray(data)) return data
      if (Array.isArray(data.Content)) return data.Content
      if (Array.isArray(data.Items)) return data.Items
      if (Array.isArray(data.items)) return data.items
      if (Array.isArray(data.Results)) return data.Results
    } catch {
      // Try next proxy source.
    }
  }

  return []
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

function mergeGuideScheduleCache(
  dayKey: string,
  scheduleDelta: Record<number, GuideProgram[]>,
  logoMapOverride?: Record<number, string>,
): GuideDayPayload {
  const cached = readGuideDayCache(dayKey)
  const payload: GuideDayPayload = {
    schedule: {
      ...(cached?.schedule ?? {}),
      ...scheduleDelta,
    },
    logoMap: logoMapOverride ?? cached?.logoMap ?? {},
  }
  writeGuideDayCache(dayKey, payload)
  return payload
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

// function extractBackgroundImageUrl(element: HTMLElement | null): string | null {
//   if (!element) return null
//   const styleValue = element.style.backgroundImage || element.getAttribute('style') || ''
//   const match = styleValue.match(/url\(['"]?(.*?)['"]?\)/)
//   if (!match?.[1]) return null

//   let url = match[1]
//   if (url.startsWith('//')) {
//     url = `https:${url}`
//   } else if (url.startsWith('/')) {
//     url = `https://www.telered.com.ar${url}`
//   }

//   return url
// }

// function extractGuideDataFromHtmlV1(html: string): { schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> } {
//   const doc = new DOMParser().parseFromString(html, 'text/html')
//   const channelRows = Array.from(doc.querySelectorAll('ul.listacanales > li'))
//   const schedule: Record<number, GuideProgram[]> = {}
//   const logoMap: Record<number, string> = {}

//   channelRows.forEach((row) => {
//     const numberText = row.querySelector('.chtitle .chnumheader')?.textContent?.trim() ?? ''
//     const numberMatch = numberText.match(/\d+/)
//     if (!numberMatch) return

//     const channelNumber = Number(numberMatch[0])
//     if (Number.isNaN(channelNumber)) return

//     const logoEl = row.querySelector('.chtitle .logowrapper') as HTMLElement | null
//     const logoUrl = extractBackgroundImageUrl(logoEl)
//     if (logoUrl) {
//       logoMap[channelNumber] = logoUrl
//     }

//     const programRows = Array.from(row.querySelectorAll('ul li[data-horadesdeex][data-horahastaex]'))
//     const programs: GuideProgram[] = []

//     programRows.forEach((programRow) => {
//       const start = programRow.getAttribute('data-horadesdeex')?.trim() ?? ''
//       const end = programRow.getAttribute('data-horahastaex')?.trim() ?? ''
//       const title = programRow.querySelector('.programwrapper')?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
//       if (!start || !end || !title) return
//       programs.push({ start, end, title })
//     })

//     if (programs.length > 0) {
//       schedule[channelNumber] = programs
//     }
//   })

//   if (channelRows.length === 0) {
//     const fallbackRows = Array.from(doc.querySelectorAll('li')).filter((row) => {
//       const text = row.textContent ?? ''
//       return /Ver\s+m[áa]s/i.test(text) && /\d{1,4}/.test(text)
//     })

//     fallbackRows.forEach((row) => {
//       const rowText = (row.textContent ?? '').replace(/\s+/g, ' ').trim()
//       const numberMatch = rowText.match(/(\d{1,4})\s*Ver\s+m[áa]s/i) ?? rowText.match(/^(\d{1,4})\b/)
//       if (!numberMatch) return

//       const channelNumber = Number(numberMatch[1])
//       if (Number.isNaN(channelNumber)) return

//       const programItems = Array.from(row.querySelectorAll('ul li'))
//       const programStarts: { title: string, start: string }[] = []

//       programItems.forEach((programRow) => {
//         const programText = (programRow.textContent ?? '').replace(/\s+/g, ' ').trim()
//         const timeMatch = programText.match(/(\d{1,2}:\d{2})\s*hs/i)
//         if (!timeMatch) return

//         const start = timeMatch[1]
//         const title = programText.replace(timeMatch[0], '').trim()
//         if (!title) return
//         programStarts.push({ title, start })
//       })

//       if (programStarts.length === 0) return

//       const programs: GuideProgram[] = programStarts.map((program, index) => {
//         const next = programStarts[index + 1]
//         const end = next?.start ?? '00:00'
//         return { start: program.start, end, title: program.title }
//       })

//       schedule[channelNumber] = programs
//     })
//   }

//   return { schedule, logoMap }
// }

// function parseMovistarProgramText(text: string): GuideProgram | null {
//   const compact = text.replace(/\s+/g, ' ').trim()
//   if (!compact) return null

//   const match = compact.match(/^(.*?)(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
//   if (!match) return null

//   const title = match[1].trim()
//   const start = match[2]
//   const end = match[3]
//   if (!title || !start || !end) return null

//   return { title, start, end }
// }

function normalizeChannelName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildChannelNameIndex(): Map<string, number> {
  const index = new Map<string, number>()
  channels.forEach((channel) => {
    const variants = [channel.name, channel.shortName]
    variants.forEach((name) => {
      const normalized = normalizeChannelName(name)
      if (normalized && !index.has(normalized)) {
        index.set(normalized, channel.movistarNumber)
      }
    })
  })
  return index
}

// function extractGuideDataFromHtmlV2(html: string): { schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> } {
//   const doc = new DOMParser().parseFromString(html, 'text/html')
//   const schedule: Record<number, GuideProgram[]> = {}
//   const logoMap: Record<number, string> = {}

//   const wrapper = doc.querySelector('div[class*="schedulesWrapper"]')
//   const channelsWrapper = doc.querySelector('div[class*="channels"]')
//   if (!wrapper || !channelsWrapper) return { schedule, logoMap }

//   const rows = Array.from(wrapper.children).filter((node): node is HTMLElement => node instanceof HTMLElement)
//   const rowPrograms: GuideProgram[][] = rows.map((row) => {
//     const programs: GuideProgram[] = []
//     const items = row.querySelectorAll('article[class*="scheduleItem"]')
//     items.forEach((item) => {
//       const parsed = parseMovistarProgramText(item.textContent ?? '')
//       if (parsed) programs.push(parsed)
//     })
//     return programs
//   })

//   const channelNameIndex = buildChannelNameIndex()
//   const channelRows = Array.from(channelsWrapper.querySelectorAll('div[class*="channel"]'))
//   const channelNames = channelRows
//     .map((row) => row.querySelector('a')?.getAttribute('title')?.trim() ?? '')
//     .filter((name) => name.length > 0)

//   if (rowPrograms.every((row) => row.length === 0) || channelNames.length === 0) {
//     return { schedule, logoMap }
//   }

//   const totalRows = Math.min(channelNames.length, rowPrograms.length)
//   for (let i = 0; i < totalRows; i += 1) {
//     const channelName = channelNames[i]
//     const normalized = normalizeChannelName(channelName)
//     const channelNumber = normalized ? channelNameIndex.get(normalized) : undefined
//     if (!channelNumber) continue

//     const programs = rowPrograms[i]
//     if (programs.length === 0) continue

//     schedule[channelNumber] = programs
//   }

//   return { schedule, logoMap }
// }

function hasChannelSchedule(schedule: Record<number, GuideProgram[]>, channelNumber: number): boolean {
  return (schedule[channelNumber]?.length ?? 0) > 0
}

async function fetchGuideScheduleFromApiChannel(
  channelNumber: number,
  dayOffset = 0,
): Promise<GuideProgram[] | null> {
  if (Date.now() < getGuideApiCooldownUntil()) {
    return null
  }

  const channelId = CHANNEL_ID_BY_NUMBER[channelNumber]
  if (!channelId) return null

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
        return null
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

      return programs.length > 0 ? programs : null
    } catch {
      // Try next proxy source.
    }
  }

  return null
}

async function ensureMissingChannelSchedules(
  dayOffset: number,
  schedule: Record<number, GuideProgram[]>,
): Promise<void> {
  const dayKey = getGuideUtcDayKey(dayOffset)
  const missingApiChannels: number[] = []
  let needsTeleredRefresh = false

  channels.forEach((channel) => {
    if (hasChannelSchedule(schedule, channel.movistarNumber)) return

    if (TELERED_CHANNEL_NUMBERS.has(channel.movistarNumber)) {
      needsTeleredRefresh = true
      return
    }

    if (Object.prototype.hasOwnProperty.call(CHANNEL_ID_BY_NUMBER, channel.movistarNumber)) {
      missingApiChannels.push(channel.movistarNumber)
    }
  })

  if (needsTeleredRefresh) {
    const htmlGuide = await fetchGuideScheduleFromHtml(dayOffset)
    if (Object.keys(htmlGuide.schedule).length > 0) {
      const merged = mergeGuideScheduleCache(dayKey, htmlGuide.schedule, htmlGuide.logoMap)
      schedule = merged.schedule
      liveGuideLogoMap = merged.logoMap
      setChannelLogos(liveGuideLogoMap)
      renderEpgGrid(schedule)
      void loadGuideNowPlaying(schedule)
      scheduleGuideRefresh(schedule)
    }
  }

  if (missingApiChannels.length === 0) return

  for (const channelNumber of missingApiChannels) {
    const programs = await fetchGuideScheduleFromApiChannel(channelNumber, dayOffset)
    if (programs && programs.length > 0) {
      const merged = mergeGuideScheduleCache(dayKey, { [channelNumber]: programs })
      schedule = merged.schedule
      renderEpgGrid(schedule)
      void loadGuideNowPlaying(schedule)
      scheduleGuideRefresh(schedule)
    }

    await sleep(GUIDE_API_REQUEST_DELAY_MS)
  }
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

async function fetchGuideScheduleByDay(
  dayOffset = 0,
  options?: { onApiMerge?: (schedule: Record<number, GuideProgram[]>) => void },
): Promise<GuideDayPayload> {
  const dayKey = getGuideUtcDayKey(dayOffset)
  const htmlGuide = await fetchGuideScheduleFromHtml(dayOffset)
  const payload = mergeGuideScheduleCache(dayKey, htmlGuide.schedule, htmlGuide.logoMap)

  void fetchGuideScheduleFromApi(dayOffset).then((apiSchedule) => {
    if (Object.keys(apiSchedule).length === 0) return
    const merged = mergeGuideScheduleCache(dayKey, apiSchedule)
    options?.onApiMerge?.(merged.schedule)
  })

  return payload
}

async function fetchGuideSchedule(): Promise<Record<number, GuideProgram[]>> {
  const todayKey = getGuideUtcDayKey(0)
  const nextDayKey = getGuideUtcDayKey(1)

  const cachedToday = readGuideDayCache(todayKey)
  let todayPayload: GuideDayPayload

  if (!cachedToday) {
    todayPayload = await fetchGuideScheduleByDay(0, {
      onApiMerge: (schedule) => {
        renderEpgGrid(schedule)
        void loadGuideNowPlaying(schedule)
        scheduleGuideRefresh(schedule)
      },
    })
  } else {
    todayPayload = { schedule: cachedToday.schedule, logoMap: cachedToday.logoMap }
    void fetchGuideScheduleByDay(0, {
      onApiMerge: (schedule) => {
        renderEpgGrid(schedule)
        void loadGuideNowPlaying(schedule)
        scheduleGuideRefresh(schedule)
      },
    })

    if (!readGuideDayCache(nextDayKey)) {
      void fetchGuideScheduleByDay(1)
    }
  }

  liveGuideLogoMap = todayPayload.logoMap
  setChannelLogos(liveGuideLogoMap)

  void ensureMissingChannelSchedules(0, { ...todayPayload.schedule })

  return todayPayload.schedule
}

function getCachedScheduleForDay(dayOffset: number): Record<number, GuideProgram[]> | null {
  const dayKey = getGuideUtcDayKey(dayOffset)
  const cached = readGuideDayCache(dayKey)
  return cached?.schedule ?? null
}

async function fetchGuideScheduleFromHtml(dayOffset = 0): Promise<{ schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> }> {
  const range = getArgentinaDayRange(dayOffset)
  const schedule: Record<number, GuideProgram[]> = {}
  const channelNameIndex = buildChannelNameIndex()

  for (const chunk of CHANNEL_PID_CHUNKS) {
    let items: ContentApiItem[] = []

    try {
      items = await fetchContentApiChunk(range.start, range.end, chunk)
    } catch {
      items = []
    }

    items.forEach((item) => {
      const channelNumberValue = typeof item.ChannelNumber === 'number'
        ? item.ChannelNumber
        : Number.isFinite(Number(item.ChannelNumber))
          ? Number(item.ChannelNumber)
          : undefined
      const channelName = item.ChannelName?.trim() || item.CallLetter?.trim() || ''
      const normalized = normalizeChannelName(channelName)
      const channelNumber = channelNumberValue ?? (normalized ? channelNameIndex.get(normalized) : undefined)
      if (!channelNumber) return

      const startEpoch = toContentEpochSeconds(item.Start)
      const endEpoch = toContentEpochSeconds(item.End)
      const start = toArgentinaTimeFromEpoch(startEpoch)
      const end = toArgentinaTimeFromEpoch(endEpoch)
      const title = item.Title?.trim() ?? ''
      if (!title || !start || !end) return

      if (!schedule[channelNumber]) {
        schedule[channelNumber] = []
      }

      schedule[channelNumber].push({ start, end, title })
    })

    await sleep(CONTENT_API_CHUNK_DELAY_MS)
  }

  Object.values(schedule).forEach((programs) => {
    programs.sort((a, b) => a.start.localeCompare(b.start))
  })

  return { schedule, logoMap: {} }
}

async function loadGuideNowPlaying(scheduleOverride?: Record<number, GuideProgram[]>): Promise<void> {
  const cachedSchedule = scheduleOverride ?? getCachedScheduleForDay(0) ?? {}
  const nowMinutes = getArgentinaNowMinutes()

  channels.forEach((ch, i) => {
    const nowElement = guideItems[i]?.querySelector('.guide-item-now') as HTMLElement | null
    if (!nowElement) return

    const currentProgram = getCurrentProgram(cachedSchedule[ch.movistarNumber] ?? [], nowMinutes)
    nowElement.textContent = currentProgram
      ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
      : 'Sin programa en vivo'
  })

  if (!scheduleOverride) {
    void fetchGuideSchedule().then((schedule) => {
      const refreshedMinutes = getArgentinaNowMinutes()
      channels.forEach((ch, i) => {
        const nowElement = guideItems[i]?.querySelector('.guide-item-now') as HTMLElement | null
        if (!nowElement) return

        const currentProgram = getCurrentProgram(schedule[ch.movistarNumber] ?? [], refreshedMinutes)
        nowElement.textContent = currentProgram
          ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
          : 'Sin programa en vivo'
      })
    })
  }
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
    if (loadingHideTimer) clearTimeout(loadingHideTimer)
    loadingHideTimer = setTimeout(() => {
      loadingSpinner.hidden = true
      showOverlay()
    }, 2500)
  },
  onError(msg: string) {
    loadingSpinner.hidden = true
    errorOverlay.hidden = false
    console.error('Shaka playback error:', msg)
    errorMessage.textContent = 'Hubo un error al reproducir el canal'
  },
})

let overlayTimer: ReturnType<typeof setTimeout> | null = null
let loadingHideTimer: ReturnType<typeof setTimeout> | null = null

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
  const timelineLeft = Math.max(0, gridShell.scrollLeft - CHANNEL_COLUMN_WIDTH)
  const timelineRight = timelineLeft + Math.max(0, gridShell.clientWidth - CHANNEL_COLUMN_WIDTH)
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
      <span class="channel-sticky-logo-group">
        <span class="channel-sticky-logo" id="grid-logo-${channel.id}"></span>
        <span class="channel-sticky-name">${channel.name}</span>
      </span>
    `
    sticky.addEventListener('click', () => {
      void openChannel(rowIndex)
    })
    channelStickyButtons.push(sticky)

    const lane = document.createElement('div')
    lane.className = 'channel-programs'
    lane.style.width = `${totalWidth}px`

    const normalizedPrograms = normalizeProgramsInSourceOrder(schedule[channel.movistarNumber] ?? [])

    const currentProgram = getCurrentProgram(schedule[channel.movistarNumber] ?? [], nowMinutes)
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
  renderEpgGrid({})

  const schedule = await fetchGuideSchedule()
  renderEpgGrid(schedule)
  await loadGuideNowPlaying(schedule)
  scheduleGuideRefresh(schedule)
})()

async function openChannel(index: number): Promise<void> {
  const ch = channels[index]
  if (!ch) return

  currentChannelIndex = index
  // Keep the grid focus in sync so returning to the grid restores
  // the last-viewed channel instead of jumping to the start.
  focusedGridChannelRow = index
  overlayChannelNumber.textContent = `${ch.number}`
  overlayChannelName.textContent = ch.name

  const logoUrl = ch.image ?? liveGuideLogoMap[ch.movistarNumber]
  loadingLogo.style.backgroundImage = logoUrl ? `url('${logoUrl}')` : ''
  loadingNumber.textContent = `Canal ${ch.number}`
  loadingName.textContent = ch.name

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
  if (loadingHideTimer) clearTimeout(loadingHideTimer)
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
  const cachedSchedule = getCachedScheduleForDay(0)
  if (cachedSchedule) {
    void loadGuideNowPlaying(cachedSchedule)
  } else {
    void loadGuideNowPlaying()
  }
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
    const currentProgram = getCurrentProgram(scheduleByChannelNumber[channel.movistarNumber] ?? [], nowMinutes)
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

platformAPI.onBackButton(async () => {
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