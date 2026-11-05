import { channels as allChannels, ADULT_CATEGORY, type ChannelV2 } from './channels-v2'
import { GuideView, type NowPlaying } from './guide-view'
import { ShakaPlayer } from './player'
import { checkForUpdates } from './update-checker'
import { showUpdateModal } from './update-modal'

// Everything except the +18 category. Used for the in-player channel list, so
// adult channels are only reachable through their own (age-gated) category.
const channels = allChannels.filter((channel) => channel.category !== ADULT_CATEGORY)

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

const FALLBACK_GUIDE_REFRESH_MS = 5 * 60 * 1000
const GRID_WIDTH_MINUTES = 24 * 60
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const ARGENTINA_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TIME_ZONE,
})
const GUIDE_CACHE_KEY_PREFIX = 'guide-cache-v1:'
const DEFAULT_CONTENT_API_URL = 'https://contentapi-ar.cdn.telefonica.com/29/default/es-AR/schedules'
const CONTENT_API_DEVICE_TYPES = 'null|401'
const CONTENT_API_CHANNEL_MAPS = '99|null'
const CONTENT_API_FIELDS = 'Pid,Title,Description,ChannelName,ChannelNumber,CallLetter,Start,End,EpgNetworkDvr,LiveChannelPid,LiveProgramPid,EpgSerieId,SeriesPid,SeriesId,SeasonPid,SeasonNumber,images.videoFrame,images.banner,LiveToVod,AgeRatingPid,forbiddenTechnology,IsSoDisabled'
const CONTENT_API_RELATIONS = 'Genre'
const CONTENT_API_ATTRIBUTES = 'ca_cpvrDisable,ca_descriptors,ca_blackout_target,ca_blackout_areas'
const CONTENT_API_ORDER = 'START_TIME:a'
const CONTENT_API_CONCURRENCY = 3
const CONTENT_API_TIMEOUT_MS = 8000
// Next day's guide is prefetched after startup has settled, not during it.
const NEXT_DAY_PREFETCH_DELAY_MS = 30 * 1000

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
  movistarSchedule: Record<number, GuideProgram[]>
  schedule: Record<number, GuideProgram[]>
  logoMap: Record<number, string>
}

interface CachedGuideDay extends GuideDayPayload {
  savedAt: string
  expiresAt: string
}

const screenGuide = document.getElementById('screen-guide')!
const screenPlayer = document.getElementById('screen-player')!
const gridLoadingOverlay = document.getElementById('grid-loading')!
const video = document.getElementById('video') as HTMLVideoElement
const loadingSpinner = document.getElementById('loading-spinner')!
const loadingLogo = document.getElementById('loading-logo') as HTMLElement
const loadingNumber = document.getElementById('loading-number') as HTMLElement
const loadingName = document.getElementById('loading-name') as HTMLElement
const errorOverlay = document.getElementById('error-overlay')!
const errorMessage = document.getElementById('error-message')!
const playerOverlay = document.getElementById('player-overlay')!
const overlayChannelName = document.getElementById('overlay-channel-name')!
const overlaySpeedBadge = document.getElementById('overlay-speed-badge')!
const overlayChannelNumber = document.getElementById('overlay-channel-number')!
const guideOverlay = document.getElementById('guide-overlay')!
const guideList = document.getElementById('guide-list')!
const backPressTooltip = document.getElementById('back-press-tooltip')!
let liveGuideLogoMap: Record<number, string> = {}
let liveMovistarSchedule: Record<number, GuideProgram[]> = {}
let liveSchedule: Record<number, GuideProgram[]> = {}

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

// Proxy indexes in the order to try them. The last proxy that worked moves to
// the front, so after the first chunk the rest skip the dead ones.
const proxyOrder = [0, 1, 2]

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// null = every proxy failed (as opposed to [] = a proxy answered with no items).
async function fetchContentApiChunk(startTime: number, endTime: number, liveChannelPids: string[]): Promise<ContentApiItem[] | null> {
  const sources = buildProxiedContentApiUrls(startTime, endTime, liveChannelPids)

  for (const proxyIndex of [...proxyOrder]) {
    const source = sources[proxyIndex]
    if (!source) continue
    try {
      const res = await fetchWithTimeout(source, {
        method: 'GET',
        mode: 'cors',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      }, CONTENT_API_TIMEOUT_MS)

      if (!res.ok) continue
      proxyOrder.splice(proxyOrder.indexOf(proxyIndex), 1)
      proxyOrder.unshift(proxyIndex)

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

  return null
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

function mergeMovistarScheduleCache(
  dayKey: string,
  movistarScheduleDelta: Record<number, GuideProgram[]>,
  logoMapOverride?: Record<number, string>,
): GuideDayPayload {
  const cached = readGuideDayCache(dayKey)
  const payload: GuideDayPayload = {
    movistarSchedule: {
      ...(cached?.movistarSchedule ?? {}),
      ...movistarScheduleDelta,
    },
    schedule: cached?.schedule ?? {},
    logoMap: logoMapOverride ?? cached?.logoMap ?? {},
  }
  // Never cache an empty guide: a failed fetch would otherwise stick for the whole day.
  if (Object.keys(payload.movistarSchedule).length > 0) writeGuideDayCache(dayKey, payload)
  return payload
}

function getChannelPrograms(channel: typeof channels[number]): GuideProgram[] {
  // Check movistarSchedule first if channel has movistarNumber
  if (channel.movistarNumber && liveMovistarSchedule[channel.movistarNumber]?.length) {
    return liveMovistarSchedule[channel.movistarNumber]
  }
  // Fallback to schedule keyed by internal number
  return liveSchedule[channel.number] ?? []
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
        index.set(normalized, channel.number)
      }
    })
  })
  return index
}

async function fetchGuideScheduleByDay(dayOffset = 0): Promise<GuideDayPayload> {
  const dayKey = getGuideUtcDayKey(dayOffset)
  const htmlGuide = await fetchGuideScheduleFromHtml(dayOffset)
  return mergeMovistarScheduleCache(dayKey, htmlGuide.schedule, htmlGuide.logoMap)
}

async function fetchGuideSchedule(): Promise<void> {
  const todayKey = getGuideUtcDayKey(0)
  const nextDayKey = getGuideUtcDayKey(1)

  const cachedToday = readGuideDayCache(todayKey)
  let todayPayload: GuideDayPayload

  if (!cachedToday || Object.keys(cachedToday.movistarSchedule ?? {}).length === 0) {
    todayPayload = await fetchGuideScheduleByDay(0)
  } else {
    todayPayload = cachedToday
  }

  liveGuideLogoMap = todayPayload.logoMap
  liveMovistarSchedule = todayPayload.movistarSchedule
  liveSchedule = todayPayload.schedule

  // Fetch next day if not cached
  if (!readGuideDayCache(nextDayKey)) {
    setTimeout(() => void fetchGuideScheduleByDay(1), NEXT_DAY_PREFETCH_DELAY_MS)
  }

}

async function fetchGuideScheduleFromHtml(dayOffset = 0): Promise<{ schedule: Record<number, GuideProgram[]>, logoMap: Record<number, string> }> {
  const range = getArgentinaDayRange(dayOffset)
  const schedule: Record<number, GuideProgram[]> = {}
  const channelNameIndex = buildChannelNameIndex()

  const addItems = (items: ContentApiItem[]) => items.forEach((item) => {
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

  // A few chunks in flight at once instead of one at a time. If a chunk fails
  // on every proxy, the source is down: stop instead of firing the rest.
  let next = 0
  let sourceDown = false
  await Promise.all(Array.from({ length: CONTENT_API_CONCURRENCY }, async () => {
    while (!sourceDown && next < CHANNEL_PID_CHUNKS.length) {
      const chunk = CHANNEL_PID_CHUNKS[next++]
      const items = await fetchContentApiChunk(range.start, range.end, chunk).catch(() => null)
      if (items === null) sourceDown = true
      else addItems(items)
    }
  }))

  Object.values(schedule).forEach((programs) => {
    programs.sort((a, b) => a.start.localeCompare(b.start))
  })

  return { schedule, logoMap: {} }
}

async function loadGuideNowPlaying(): Promise<void> {
  const nowMinutes = getArgentinaNowMinutes()

  channels.forEach((ch, i) => {
    const nowElement = guideItems[i]?.querySelector('.guide-item-now') as HTMLElement | null
    if (!nowElement) return

    const programs = getChannelPrograms(ch)
    const currentProgram = getCurrentProgram(programs, nowMinutes)
    nowElement.textContent = currentProgram
      ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
      : 'Sin programa en vivo'
  })

  if (!liveMovistarSchedule || Object.keys(liveMovistarSchedule).length === 0) {
    void fetchGuideSchedule().then(() => {
      const refreshedMinutes = getArgentinaNowMinutes()
      channels.forEach((ch, i) => {
        const nowElement = guideItems[i]?.querySelector('.guide-item-now') as HTMLElement | null
        if (!nowElement) return

        const programs = getChannelPrograms(ch)
        const currentProgram = getCurrentProgram(programs, refreshedMinutes)
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

// Lets viewers with a fast connection catch up to the live edge (ArrowRight
// speeds up, ArrowLeft slows back down to normal) without a jarring seek —
// min is 1x since slowing below normal only increases live delay further.
const PLAYBACK_SPEED_STEP = 0.25
const PLAYBACK_SPEED_MIN = 1
const PLAYBACK_SPEED_MAX = 2

function updateSpeedBadge(): void {
  if (video.playbackRate === 1) {
    overlaySpeedBadge.hidden = true
    overlaySpeedBadge.textContent = ''
  } else {
    overlaySpeedBadge.hidden = false
    overlaySpeedBadge.textContent = `${video.playbackRate.toFixed(2)}x`
  }
}

function changePlaybackSpeed(delta: number): void {
  const next = Math.round((video.playbackRate + delta) * 100) / 100
  const clamped = Math.min(PLAYBACK_SPEED_MAX, Math.max(PLAYBACK_SPEED_MIN, next))
  shakaPlayer.setPlaybackRate(clamped)
  updateSpeedBadge()
  showOverlay()
}

function resetPlaybackSpeed(): void {
  shakaPlayer.setPlaybackRate(1)
  updateSpeedBadge()
}

type Screen = 'guide' | 'player'
let currentScreen: Screen = 'guide'
let currentChannelIndex = 0
let currentChannel: ChannelV2 | null = null

function getNowPlaying(channel: ChannelV2): NowPlaying | null {
  const nowMinutes = getArgentinaNowMinutes()
  const frames = [nowMinutes - GRID_WIDTH_MINUTES, nowMinutes, nowMinutes + GRID_WIDTH_MINUTES]
  for (const program of normalizeProgramsInSourceOrder(getChannelPrograms(channel))) {
    // "now" expressed in the program's day frame (programs can span midnight)
    const frameNow = frames.find((minutes) => minutes >= program.startMinutes && minutes < program.endMinutes)
    if (frameNow === undefined) continue
    const duration = program.endMinutes - program.startMinutes
    const { title, meta } = splitProgramLabel(program.title)
    return {
      title,
      meta,
      timeRange: `${program.start} - ${program.end}`,
      progress: duration > 0 ? Math.min(1, Math.max(0, (frameNow - program.startMinutes) / duration)) : 0,
    }
  }
  return null
}

function handleExitRequest(): void {
  const now = Date.now()
  if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
    void closeApp()
  } else {
    showBackPressTooltip()
  }
  lastBackPressTime = now
}

const guideView = new GuideView({
  root: screenGuide,
  channels: allChannels,
  getNowPlaying,
  getLogoUrl: (channel) => channel.image ?? liveGuideLogoMap[channel.number] ?? null,
  onOpenChannel: (channel) => void openChannel(channel),
  onBackAtRoot: handleExitRequest,
})

function showScreen(screen: Screen): void {
  currentScreen = screen
  screenGuide.classList.toggle('active', screen === 'guide')
  screenPlayer.classList.toggle('active', screen === 'player')
  if (screen === 'guide') guideView.show()
  else guideView.hide()
}

// Startup: show the guide immediately; the update check and the program guide
// load in the background and fill in when they arrive.
showScreen('guide')
gridLoadingOverlay.hidden = true

void (async () => {
  try {
    const updateInfo = await checkForUpdates()
    // The modal swallows keys while open, so the guide underneath is inert.
    if (updateInfo?.hasUpdate) {
      await showUpdateModal(updateInfo)
      if (currentScreen === 'guide') guideView.restoreFocus()
    }
  } catch (e) {
    console.warn('Update check error:', e)
  }
})()

void (async () => {
  await fetchGuideSchedule()
  guideView.refreshPrograms()
  await loadGuideNowPlaying()
  scheduleGuideRefresh()
})()

async function openChannel(channel: ChannelV2): Promise<void> {
  currentChannel = channel
  // -1 for +18 channels (not in the in-player guide list).
  currentChannelIndex = channels.indexOf(channel)

  overlayChannelNumber.textContent = channel.number ? `${channel.number}` : ''
  overlayChannelName.textContent = channel.name

  const logoUrl = channel.image ?? liveGuideLogoMap[channel.number]
  loadingLogo.style.backgroundImage = logoUrl ? `url('${logoUrl}')` : ''
  loadingNumber.textContent = channel.number ? `Canal ${channel.number}` : ''
  loadingName.textContent = channel.name

  showScreen('player')
  hideOverlay()
  resetPlaybackSpeed()

  await shakaPlayer.load(channel)
}

function selectGuideChannel(index: number): void {
  if (index === currentChannelIndex) {
    closeGuide()
    showOverlay()
    return
  }

  closeGuide()
  const channel = channels[index]
  if (channel) void openChannel(channel)
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
  showScreen('guide')
}

async function channelUp(): Promise<void> {
  const list = guideView.activeChannels
  const index = currentChannel ? list.indexOf(currentChannel) : -1
  closeGuide()
  await openChannel(list[(index + 1) % list.length])
}

async function channelDown(): Promise<void> {
  const list = guideView.activeChannels
  const index = currentChannel ? list.indexOf(currentChannel) : 0
  closeGuide()
  await openChannel(list[(index - 1 + list.length) % list.length])
}

let isGuideOpen = false
let guideFocusIndex = 0

function openGuide(): void {
  isGuideOpen = true
  guideFocusIndex = Math.max(0, currentChannelIndex)
  guideOverlay.hidden = false
  applyGuideFocus()
  void loadGuideNowPlaying()
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

function scheduleGuideRefresh(): void {
  if (guideRefreshTimeout) {
    clearTimeout(guideRefreshTimeout)
  }

  const nowMinutes = getArgentinaNowMinutes()
  let minMinutesUntilEnd: number | null = null

  channels.forEach((channel) => {
    const programs = getChannelPrograms(channel)
    const currentProgram = getCurrentProgram(programs, nowMinutes)
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
  await fetchGuideSchedule()
  guideView.refreshPrograms()
  await loadGuideNowPlaying()
  scheduleGuideRefresh()
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
  if (currentScreen === 'guide') {
    guideView.handleKey(e)
    return
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
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        changePlaybackSpeed(PLAYBACK_SPEED_STEP)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        changePlaybackSpeed(-PLAYBACK_SPEED_STEP)
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
  if (currentScreen === 'guide') {
    guideView.handleBack()
  } else if (isGuideOpen) {
    closeGuide()
  } else {
    await returnToGrid()
  }
})
