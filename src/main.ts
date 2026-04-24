import { channels } from './channels'
import { ShakaPlayer } from './player'
import { GridNavigation } from './navigation'

// Install Shaka polyfills
shaka.polyfill.installAll()

if (!shaka.Player.isBrowserSupported()) {
  document.body.innerHTML = '<p style="color:white;padding:2rem">Browser not supported</p>'
  throw new Error('Shaka Player not supported')
}

// --- Agenda types ---
interface Match {
  time: string
  homeTeam: string
  awayTeam: string
  channel: string
  league: string
  channelOptions: string[]
}

interface GuideProgram {
  start: string
  end: string
  title: string
}

// Map API channel names → our channel colors
const CHANNEL_COLOR_MAP: Record<string, string> = {
  'ESPN PREMIUM': '#cc0000',
  'TNT SPORTS':   '#0033cc',
  'ESPN':         '#ff6600',
  'ESPN 2':       '#cc3333',
  'ESPN 3':       '#ff3333',
  'ESPN 4':       '#ff9900',
  'FOX SPORTS':   '#009900',
  'FOX SPORTS 2': '#00cc00',
  'FOX SPORTS 3': '#00ff99',
  'TYC SPORTS':   '#9933ff',
}

const CHANNEL_ID_MAP: Record<string, string> = {
  'ESPN PREMIUM': 'espn-premium',
  'TNT SPORTS': 'tnt-sports',
  'ESPN': 'espn',
  'ESPN 2': 'espn-2',
  'ESPN 3': 'espn-3',
  'ESPN 4': 'espn-4',
  'FOX SPORTS': 'fox-sports',
  'FOX SPORTS 2': 'fox-sports-2',
  'FOX SPORTS 3': 'fox-sports-3',
  'TYC SPORTS': 'tyc-sports',
}

const GUIDE_CHANNEL_NUMBER_BY_ID: Record<string, number> = {
  'tyc-sports': 50,
  'espn': 51,
  'espn-2': 52,
  'espn-3': 53,
  'fox-sports': 54,
  'fox-sports-2': 55,
  'fox-sports-3': 56,
  'espn-premium': 58,
  'tnt-sports': 59,
  'espn-4': 124,
}

const OUR_CHANNELS = new Set(Object.keys(CHANNEL_COLOR_MAP))
const FALLBACK_GUIDE_REFRESH_MS = 5 * 60 * 1000

// --- DOM refs ---
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
const agendaSection = document.getElementById('agenda-section')!
const agendaList = document.getElementById('agenda-list')!
const agendaElements: HTMLElement[] = []
const backPressTooltip = document.getElementById('back-press-tooltip')!

// --- Back press tracking ---
let lastBackPressTime = -Infinity
const DOUBLE_BACK_TIMEOUT = 2000

function showBackPressTooltip(): void {
  backPressTooltip.hidden = false
  setTimeout(() => {
    backPressTooltip.hidden = true
  }, 3000)
}

async function closeApp(): Promise<void> {
  // Use Capacitor native bridge to exit app on Android
  if ('Capacitor' in window) {
    const cap = (window as any).Capacitor
    if (cap.isNativePlatform?.()) {
      cap.nativeChannel?.postMessage({
        type: 'events',
        channel: 'APP',
        event: 'appStateChange',
        data: { isActive: false },
      })
      // Also try direct call if available
      try {
        cap.exec('App', 'exit', {})
      } catch {
        // Fallback: try using navigator
        if ('app' in navigator) {
          (navigator as any).app.exitApp()
        }
      }
    }
  } else if ('app' in navigator) {
    (navigator as any).app.exitApp()
  }
}

// --- Build channel grid ---
const COLS = 3
const cardElements: HTMLElement[] = []

channels.forEach((ch, i) => {
  const card = document.createElement('div')
  card.className = 'channel-card'
  card.setAttribute('role', 'gridcell')
  card.setAttribute('tabindex', '0')
  card.dataset.channelId = ch.id

  card.innerHTML = `
    <div class="card-banner" style="background:${ch.color}">
      <span class="card-channel-number">${i + 1}</span>
      <span class="card-short-name">${ch.shortName}</span>
    </div>
    <div class="card-body">
      <span class="card-name">${ch.name}</span>
      <span class="card-live-badge">&#9679; EN VIVO</span>
    </div>
  `

  channelGrid.appendChild(card)
  cardElements.push(card)
})

const nav = new GridNavigation(cardElements, COLS)
nav.focusFirst()

type GridFocusArea = 'channels' | 'agenda'
let gridFocusArea: GridFocusArea = 'channels'
let agendaFocusIndex = 0

function clearAgendaFocus(): void {
  agendaElements.forEach(card => card.classList.remove('focused'))
}

function blurChannelFocus(): void {
  cardElements.forEach(card => card.classList.remove('focused'))
}

function applyAgendaFocus(nextIndex: number): void {
  if (agendaElements.length === 0) return

  agendaFocusIndex = Math.max(0, Math.min(nextIndex, agendaElements.length - 1))
  gridFocusArea = 'agenda'
  blurChannelFocus()

  agendaElements.forEach((card, i) => {
    card.classList.toggle('focused', i === agendaFocusIndex)
  })

  const focused = agendaElements[agendaFocusIndex]
  focused?.focus()
  focused?.scrollIntoView({ block: 'nearest', inline: 'center' })
}

function focusChannels(): void {
  gridFocusArea = 'channels'
  clearAgendaFocus()
  nav.restoreFocus()
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
  const formatter = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const parts = formatter.formatToParts(new Date())
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function isCurrentProgram(startMinutes: number, endMinutes: number, nowMinutes: number): boolean {
  if (endMinutes < startMinutes) {
    return nowMinutes >= startMinutes || nowMinutes < endMinutes
  }
  return nowMinutes >= startMinutes && nowMinutes < endMinutes
}

function getCurrentProgram(programs: GuideProgram[], nowMinutes: number): GuideProgram | null {
  for (const program of programs) {
    const start = parseHourToMinutes(program.start)
    const end = parseHourToMinutes(program.end)
    if (start === null || end === null) continue
    if (isCurrentProgram(start, end, nowMinutes)) {
      return program
    }
  }
  return null
}

function minutesUntilTime(targetMinutes: number, nowMinutes: number): number {
  if (targetMinutes >= nowMinutes) {
    return targetMinutes - nowMinutes
  }
  return targetMinutes + 24 * 60 - nowMinutes
}

function getEarliestCurrentProgramEndDelayMs(scheduleByChannelNumber: Record<number, GuideProgram[]>): number | null {
  const nowMinutes = getArgentinaNowMinutes()
  let minMinutesUntilEnd: number | null = null

  channels.forEach((channel) => {
    const channelNumber = GUIDE_CHANNEL_NUMBER_BY_ID[channel.id]
    if (!channelNumber) return

    const currentProgram = getCurrentProgram(scheduleByChannelNumber[channelNumber] ?? [], nowMinutes)
    if (!currentProgram) return

    const endMinutes = parseHourToMinutes(currentProgram.end)
    if (endMinutes === null) return

    const minutesUntilEnd = Math.max(1, minutesUntilTime(endMinutes, nowMinutes))
    if (minMinutesUntilEnd === null || minutesUntilEnd < minMinutesUntilEnd) {
      minMinutesUntilEnd = minutesUntilEnd
    }
  })

  if (minMinutesUntilEnd === null) return null
  // Small buffer to avoid reloading exactly on boundary
  return minMinutesUntilEnd * 60 * 1000 + 5000
}

function isAgendaEventStillValid(
  agendaStartMinutes: number,
  currentProgramStartMinutes: number,
  nowMinutes: number,
  graceMinutes = 30,
): boolean {
  // Future agenda items are always valid (never filter them out)
  if (agendaStartMinutes > nowMinutes) {
    return true
  }

  // For past agenda items, check if current program started more than grace minutes after
  if (currentProgramStartMinutes >= agendaStartMinutes) {
    return currentProgramStartMinutes <= agendaStartMinutes + graceMinutes
  }

  // Otherwise, keep the past agenda item (don't filter)
  return true
}

function extractScheduleFromHtml(html: string): Record<number, GuideProgram[]> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const channelRows = Array.from(doc.querySelectorAll('ul.listacanales > li'))
  const schedule: Record<number, GuideProgram[]> = {}

  channelRows.forEach((row) => {
    const numberText = row.querySelector('.chtitle .chnumheader')?.textContent?.trim() ?? ''
    const numberMatch = numberText.match(/\d+/)
    if (!numberMatch) return
    const channelNumber = Number(numberMatch[0])
    if (Number.isNaN(channelNumber)) return

    const programRows = Array.from(
      row.querySelectorAll('ul li[data-horadesdeex][data-horahastaex]')
    )

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
    'https://www.telered.com.ar/buscador-grilla',
    `https://corsproxy.io/?${encodeURIComponent('https://www.telered.com.ar/buscador-grilla')}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.telered.com.ar/buscador-grilla')}`,
    `https://r.jina.ai/http://www.telered.com.ar/buscador-grilla`,
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

    const channelNumber = GUIDE_CHANNEL_NUMBER_BY_ID[ch.id]
    if (!channelNumber) {
      nowElement.textContent = 'Sin datos'
      return
    }

    const currentProgram = getCurrentProgram(schedule[channelNumber] ?? [], nowMinutes)
    nowElement.textContent = currentProgram
      ? `${currentProgram.start}-${currentProgram.end} ${currentProgram.title}`
      : 'Sin programa en vivo'
  })
}

function clearAgenda(): void {
  agendaList.innerHTML = ''
  agendaElements.length = 0
  agendaFocusIndex = 0
  agendaSection.hidden = true
}

// --- Build guide list ---
const guideItems: HTMLElement[] = []

channels.forEach((ch, i) => {
  const item = document.createElement('div')
  item.className = 'guide-item'
  item.innerHTML = `
    <span class="guide-item-number">${i + 1}</span>
    <span class="guide-item-color" style="background:${ch.color}"></span>
    <span class="guide-item-text">
      <span class="guide-item-name">${ch.name}</span>
      <span class="guide-item-now">Cargando...</span>
    </span>
  `
  guideList.appendChild(item)
  guideItems.push(item)
})

// --- Player setup ---
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
    errorMessage.textContent = msg
  },
})

// --- Overlay timer ---
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

// --- Screen switching ---
type Screen = 'grid' | 'player'
let currentScreen: Screen = 'grid'

function showScreen(screen: Screen): void {
  currentScreen = screen
  screenGrid.classList.toggle('active', screen === 'grid')
  screenPlayer.classList.toggle('active', screen === 'player')
}

// Always start on the grid screen
showScreen('grid')
nav.focusFirst()

// --- Current channel tracking ---
let currentChannelIndex = 0

async function openChannel(index: number): Promise<void> {
  const ch = channels[index]
  if (!ch) return

  currentChannelIndex = index
  overlayChannelNumber.textContent = `${index + 1}`
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
  focusChannels()
}

// --- CH+ / CH- cycling ---
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

// --- Guide overlay ---
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

// --- Agenda ---
async function loadAgenda(scheduleByChannelNumber: Record<number, GuideProgram[]>): Promise<void> {
  clearAgenda()

  try {
    const res = await fetch('https://v0-fuchibol.vercel.app/api/get-agenda')
    const data: { matches: Match[] } = await res.json()

    const relevant = data.matches.filter((m) =>
      m.channelOptions?.some(c => OUR_CHANNELS.has(c.toUpperCase()))
    )

    if (relevant.length === 0) return

    const nowMinutes = getArgentinaNowMinutes()

    relevant.forEach(match => {
      const ourChannel = match.channelOptions.find(c => OUR_CHANNELS.has(c.toUpperCase()))
      const mappedChannelId = ourChannel ? CHANNEL_ID_MAP[ourChannel.toUpperCase()] : undefined
      const mappedChannelNumber = mappedChannelId ? GUIDE_CHANNEL_NUMBER_BY_ID[mappedChannelId] : undefined
      const mappedChannelIndex = mappedChannelId
        ? channels.findIndex(channel => channel.id === mappedChannelId)
        : -1
      const color = ourChannel ? CHANNEL_COLOR_MAP[ourChannel.toUpperCase()] : '#333'

      const agendaStartMinutes = parseHourToMinutes(match.time)
      if (agendaStartMinutes === null) return

      if (mappedChannelNumber !== undefined) {
        const currentProgram = getCurrentProgram(
          scheduleByChannelNumber[mappedChannelNumber] ?? [],
          nowMinutes,
        )

        if (currentProgram) {
          const currentProgramStartMinutes = parseHourToMinutes(currentProgram.start)
          if (
            currentProgramStartMinutes !== null &&
            !isAgendaEventStillValid(agendaStartMinutes, currentProgramStartMinutes, nowMinutes, 30)
          ) {
            return
          }
        }
      }

      const card = document.createElement('div')
      card.className = 'agenda-card'
      card.tabIndex = -1
      if (mappedChannelIndex >= 0) {
        card.dataset.channelIndex = String(mappedChannelIndex)
      }
      card.innerHTML = `
        <div class="agenda-card-bar" style="background:${color}"></div>
        <div class="agenda-card-body">
          <span class="agenda-time">${match.time}</span>
          <span class="agenda-league">${match.league}</span>
          <span class="agenda-teams">${match.homeTeam}</span>
          <span class="agenda-vs">vs</span>
          <span class="agenda-teams">${match.awayTeam}</span>
          <span class="agenda-channel">${ourChannel ?? match.channel}</span>
        </div>
      `

      card.addEventListener('click', () => {
        const indexValue = card.dataset.channelIndex
        if (!indexValue) return
        const channelIndex = Number(indexValue)
        if (!Number.isNaN(channelIndex) && channelIndex >= 0) {
          openChannel(channelIndex)
        }
      })

      agendaList.appendChild(card)
      agendaElements.push(card)
    })

    agendaSection.hidden = agendaElements.length === 0
  } catch {
    // silently skip if fetch fails
  }
}

let guideRefreshTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleGuideAndAgendaRefresh(scheduleByChannelNumber: Record<number, GuideProgram[]>): void {
  if (guideRefreshTimeout) {
    clearTimeout(guideRefreshTimeout)
  }

  const delayMs = getEarliestCurrentProgramEndDelayMs(scheduleByChannelNumber) ?? FALLBACK_GUIDE_REFRESH_MS
  guideRefreshTimeout = setTimeout(() => {
    void refreshGuideAndAgenda()
  }, delayMs)
}

async function refreshGuideAndAgenda(): Promise<void> {
  const schedule = await fetchGuideSchedule()
  await loadGuideNowPlaying(schedule)
  await loadAgenda(schedule)
  scheduleGuideAndAgendaRefresh(schedule)
}

async function initGuideAndAgenda(): Promise<void> {
  await refreshGuideAndAgenda()
}

void initGuideAndAgenda()

// --- Intercept system shortcut keys ---
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Block remote shortcut keys from opening other apps
  const blockedKeys = [
    'ChannelUp',      // CH +
    'ChannelDown',    // CH -
    'Guide',          // Guide/EPG
  ]

  if (blockedKeys.includes(e.key)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
}, { capture: true })

// --- Keyboard handler ---
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (currentScreen === 'grid') {
    // Back button on grid → show tooltip, double press closes app
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      const now = Date.now()
      if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
        // Double press detected → close app
        closeApp()
      } else {
        // First press → show tooltip
        showBackPressTooltip()
      }
      lastBackPressTime = now
      return
    }

    if (gridFocusArea === 'agenda') {
      if (e.key === 'ArrowLeft' && agendaFocusIndex > 0) {
        e.preventDefault()
        applyAgendaFocus(agendaFocusIndex - 1)
        return
      }

      if (e.key === 'ArrowRight' && agendaFocusIndex < agendaElements.length - 1) {
        e.preventDefault()
        applyAgendaFocus(agendaFocusIndex + 1)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusChannels()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const focusedAgendaCard = agendaElements[agendaFocusIndex]
        const indexValue = focusedAgendaCard?.dataset.channelIndex
        if (!indexValue) return
        const channelIndex = Number(indexValue)
        if (!Number.isNaN(channelIndex) && channelIndex >= 0) {
          openChannel(channelIndex)
        }
        return
      }

      return
    }

    if (
      e.key === 'ArrowUp' &&
      agendaElements.length > 0 &&
      nav.getFocusedIndex() < COLS
    ) {
      e.preventDefault()
      applyAgendaFocus(Math.min(nav.getFocusedIndex(), agendaElements.length - 1))
      return
    }

    if (nav.handleKey(e.key)) {
      e.preventDefault()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      openChannel(nav.getFocusedIndex())
      return
    }
  }

  if (currentScreen === 'player') {
    // Back → close guide or return to grid
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      if (isGuideOpen) {
        closeGuide()
      } else {
        returnToGrid()
      }
      return
    }

    // CH+ / CH- and Arrow Up/Down for channel navigation (only if guide is closed)
    if (!isGuideOpen) {
      if (e.key === 'ChannelUp' || e.key === 'ArrowUp') {
        e.preventDefault()
        channelUp()
        return
      }
      if (e.key === 'ChannelDown' || e.key === 'ArrowDown') {
        e.preventDefault()
        channelDown()
        return
      }
    }

    // OK / Enter
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isGuideOpen) {
          // Select focused guide channel, unless it is already playing
          selectGuideChannel(guideFocusIndex)
      } else {
        openGuide()
      }
      return
    }

    // Arrow navigation inside guide
    if (isGuideOpen) {
      if (e.key === 'ArrowUp' && guideFocusIndex > 0) {
        e.preventDefault()
        guideFocusIndex--
        applyGuideFocus()
      } else if (e.key === 'ArrowDown' && guideFocusIndex < channels.length - 1) {
        e.preventDefault()
        guideFocusIndex++
        applyGuideFocus()
      }
      return
    }

    // Any other key while watching → show overlay
    showOverlay()
  }
})

// --- Card click support ---
cardElements.forEach((card, i) => {
  card.addEventListener('click', () => {
    openChannel(i)
  })
})

// --- Capacitor back button handler ---
if ('Capacitor' in window) {
  const cap = (window as any).Capacitor
  try {
    cap.Plugins?.App?.addListener('backButton', async () => {
      const now = Date.now()
      if (currentScreen === 'grid') {
        if (now - lastBackPressTime < DOUBLE_BACK_TIMEOUT) {
          // Double press detected → close app
          await closeApp()
        } else {
          // First press → show tooltip
          showBackPressTooltip()
        }
        lastBackPressTime = now
      } else {
        // In player screen, close guide or return to grid
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
