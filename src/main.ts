import { channels as rawChannels } from './channels'

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

const FALLBACK_GUIDE_REFRESH_MS = 5 * 60 * 1000
const GRID_PIXELS_PER_HOUR = 120
const GRID_PIXELS_PER_MINUTE = GRID_PIXELS_PER_HOUR / 60
const GRID_WIDTH_MINUTES = 24 * 60
const TIMELINE_STEP_MINUTES = 30
const CHANNEL_COLUMN_WIDTH = 320

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
  <div class="searcherblockmeta">
    <span class="searcherchip" id="grid-status">Cargando guía...</span>
    <span class="searcherchip">${channels.length} canales</span>
    <span class="searcherchip">Hora de Buenos Aires</span>
  </div>
`
const gridStatus = gridHero.querySelector('#grid-status') as HTMLElement

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
  const formatter = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const parts = formatter.formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
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

function extractScheduleFromHtml(html: string): Record<number, GuideProgram[]> {
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

  liveGuideLogoMap = logoMap
  setChannelLogos(liveGuideLogoMap)
  return schedule
}

async function fetchGuideSchedule(): Promise<Record<number, GuideProgram[]>> {
  const browserLikeHeaders: HeadersInit = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  }

  const sources = [
    'https://www.telered.com.ar/layout/grillaTVupd.php?prti=0&prtf=24&chlf=0&chlt=0&wn=0&pack=Digital',
    `https://corsproxy.io/?${encodeURIComponent('https://www.telered.com.ar/layout/grillaTVupd.php?prti=0&prtf=24&chlf=0&chlt=0&wn=0&pack=Digital')}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.telered.com.ar/layout/grillaTVupd.php?prti=0&prtf=24&chlf=0&chlt=0&wn=0&pack=Digital')}`,
    `https://r.jina.ai/http://www.telered.com.ar/layout/grillaTVupd.php?prti=0&prtf=23&chlf=0&chlt=0&wn=0&pack=Digital`,
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
      const parsed = extractScheduleFromHtml(html)
      if (Object.keys(parsed).length > 0) {
        return parsed
      }
    } catch {
      // try next source
    }
  }

  return {}
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
let currentChannelIndex = 0

function showScreen(screen: Screen): void {
  currentScreen = screen
  screenGrid.classList.toggle('active', screen === 'grid')
  screenPlayer.classList.toggle('active', screen === 'player')

  if (screen === 'grid') {
    gridNavigation?.restoreFocus()
  }
}

function scrollGridToCurrentTime(nowMinutes: number): void {
  const currentLeft = CHANNEL_COLUMN_WIDTH + nowMinutes * GRID_PIXELS_PER_MINUTE
  const target = Math.max(0, currentLeft - (gridShell.clientWidth / 2))
  gridShell.scrollLeft = target
}

function renderEpgGrid(schedule: Record<number, GuideProgram[]>): void {
  const nowMinutes = getArgentinaNowMinutes()
  const totalWidth = GRID_WIDTH_MINUTES * GRID_PIXELS_PER_MINUTE

  buildTimelineHeader()
  rowsContainer.innerHTML = ''
  currentTimeIndicator.style.left = `${CHANNEL_COLUMN_WIDTH + nowMinutes * GRID_PIXELS_PER_MINUTE}px`
  currentTimeIndicator.style.height = '100%'
  currentTimeIndicator.style.top = '0'

  currentProgramRows = []

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
        <span class="channel-sticky-live">Sin programa en vivo</span>
      </span>
    `
    sticky.addEventListener('click', () => {
      void openChannel(rowIndex)
    })

    const lane = document.createElement('div')
    lane.className = 'channel-programs'
    lane.style.width = `${totalWidth}px`

    const normalizedPrograms = normalizeProgramsInSourceOrder(schedule[channel.number] ?? [])

    const rowCells: NavigationCell[] = []
    const currentProgram = getCurrentProgram(schedule[channel.number] ?? [], nowMinutes)

    normalizedPrograms.forEach((program, programIndex) => {
      const left = program.startMinutes * GRID_PIXELS_PER_MINUTE
      const width = Math.max((program.endMinutes - program.startMinutes) * GRID_PIXELS_PER_MINUTE, 1)
      const isCurrent = currentProgram
        ? currentProgram.start === program.start && currentProgram.end === program.end && currentProgram.title === program.title
        : false

      const block = document.createElement('button')
      block.type = 'button'
      block.className = 'program-block'
      if (isCurrent) {
        block.classList.add('current')
      }
      block.style.left = `${left}px`
      block.style.width = `${width}px`
      block.innerHTML = `
        <span class="program-block-time">${program.start}-${program.end}</span>
        <span class="program-block-title">${program.title}</span>
      `
      block.addEventListener('click', (event) => {
        event.stopPropagation()
        if (gridNavigation) {
          gridNavigation.focusPosition(rowIndex, programIndex)
        }
        void openChannel(rowIndex)
      })

      lane.appendChild(block)
      rowCells.push({
        element: block,
        rowIndex,
        programIndex,
        startMinutes: program.startMinutes,
        endMinutes: program.endMinutes,
        wrapsDay: program.wrapsDay,
      })
    })

    const currentProgramText = sticky.querySelector('.channel-sticky-live') as HTMLElement | null
    if (currentProgramText) {
      currentProgramText.textContent = currentProgram
        ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
        : 'Sin programa en vivo'
    }

    row.append(sticky, lane)
    rowsContainer.appendChild(row)
    currentProgramRows.push(rowCells)
  })

  gridNavigation = new GridNavigation(currentProgramRows)
  const initialFocus = findInitialGridFocus(currentProgramRows, nowMinutes)
  gridNavigation.focusPosition(initialFocus.rowIndex, initialFocus.programIndex)
  setChannelLogos(liveGuideLogoMap)

  requestAnimationFrame(() => scrollGridToCurrentTime(nowMinutes))
}

void (async () => {
  const schedule = await fetchGuideSchedule()
  renderEpgGrid(schedule)
  await loadGuideNowPlaying(schedule)
  scheduleGuideRefresh(schedule)
  gridStatus.textContent = `${Object.keys(schedule).length || channels.length} canales actualizados`
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
  gridStatus.textContent = `${Object.keys(schedule).length || channels.length} canales actualizados`
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
      if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
        void closeApp()
      } else {
        showBackPressTooltip()
      }
      lastBackPressTime = now
      return
    }

    if (gridNavigation?.handleKey(e.key)) {
      e.preventDefault()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const focused = gridNavigation?.getFocusedPosition()
      if (focused) {
        void openChannel(focused.rowIndex)
      }
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