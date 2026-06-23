const PPV_API_URL = 'https://api.ppv.to/api/streams'

interface PpvSubstream {
  iframe?: string
  source_tag?: string
  locale?: string
}

interface PpvStream {
  name: string
  poster?: string
  starts_at?: number
  locale?: string
  source_tag?: string
  category?: string
  substreams?: Record<string, PpvSubstream>
}
interface PpvCategory {
  name: string
  poster?: string
  starts_at?: number
  category?: string
  streams?: PpvStream[]
}

interface PpvApiResponse {
  streams?: PpvCategory[]
}

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

let mundialEvents: PpvStream[] = []
let focusedEventIndex = 0
let isSubstreamPickerOpen = false
let focusedSubstreamIndex = 0
let currentSubstreams: { label: string; iframe: string }[] = []
let isIframeOpen = false

const screenMundial = document.getElementById('screen-mundial')!
const mundialContent = document.getElementById('mundial-content')!
const substreamOverlay = document.getElementById('mundial-substream-overlay')!
const substreamEventName = document.getElementById('mundial-substream-event-name')!
const substreamList = document.getElementById('mundial-substream-list')!
const iframeOverlay = document.getElementById('mundial-iframe-overlay')!
const iframeEl = document.getElementById('mundial-iframe') as HTMLIFrameElement
const iframeCloseBtn = document.getElementById('mundial-iframe-close')!
const mundialBackBtn = document.getElementById('mundial-back-btn')!

function formatStartTime(ts: number): string {
  const date = new Date(ts * 1000)
  const now = new Date()
  const isToday = date.toLocaleDateString('es-AR', { timeZone: ARGENTINA_TZ }) === now.toLocaleDateString('es-AR', { timeZone: ARGENTINA_TZ })
  const timeStr = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ARGENTINA_TZ,
  })
  if (isToday) return `Hoy ${timeStr}`
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ARGENTINA_TZ,
  })
}

function isLive(event: PpvStream): boolean {
  if (!event.starts_at) return false
  const now = Date.now() / 1000
  return event.starts_at <= now && now - event.starts_at < 5 * 3600
}

function renderMundialEvents(): void {
  mundialContent.innerHTML = ''

  if (mundialEvents.length === 0) {
    mundialContent.innerHTML = '<div class="mundial-empty">No hay partidos disponibles</div>'
    return
  }

  const grid = document.createElement('div')
  grid.className = 'mundial-events-grid'

  mundialEvents.forEach((event, index) => {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'mundial-event-card'
    card.dataset.index = String(index)

    const live = isLive(event)
    const posterHtml = event.poster
      ? `<img class="mundial-event-poster" src="${event.poster}" alt="${event.name}" loading="lazy">`
      : `<div class="mundial-event-poster-placeholder">⚽</div>`

    const timeHtml = event.starts_at
      ? `<span class="mundial-event-time${live ? ' mundial-live' : ''}">${live ? '● EN VIVO' : formatStartTime(event.starts_at)}</span>`
      : ''

    card.innerHTML = `
      ${posterHtml}
      <div class="mundial-event-info">
        <span class="mundial-event-name">${event.name}</span>
        ${timeHtml}
      </div>
    `

    card.addEventListener('click', () => {
      focusedEventIndex = index
      openSubstreamPicker(index)
    })
    grid.appendChild(card)
  })

  mundialContent.appendChild(grid)
  updateEventFocus()
}

function getEventCards(): HTMLButtonElement[] {
  return Array.from(mundialContent.querySelectorAll<HTMLButtonElement>('.mundial-event-card'))
}

function getGridColumns(): number {
  const grid = mundialContent.querySelector<HTMLElement>('.mundial-events-grid')
  if (!grid) return 1
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
  return Math.max(1, cols)
}

function updateEventFocus(): void {
  const cards = getEventCards()
  cards.forEach((card, i) => card.classList.toggle('focused', i === focusedEventIndex))
  cards[focusedEventIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

const LOCALE_FLAG: Record<string, string> = {
  'en': '🇬🇧', 'en-us': '🇺🇸', 'en-gb': '🇬🇧', 'en-au': '🇦🇺',
  'es': '🇪🇸', 'es-ar': '🇦🇷', 'es-mx': '🇲🇽', 'es-us': '🇺🇸', 'es-419': '🌎',
  'pt': '🇵🇹', 'pt-br': '🇧🇷',
  'de': '🇩🇪', 'fr': '🇫🇷', 'it': '🇮🇹', 'nl': '🇳🇱',
  'ru': '🇷🇺', 'pl': '🇵🇱', 'tr': '🇹🇷',
  'ar': '🇸🇦', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
}

function localeToFlag(locale: string | undefined): string {
  if (!locale) return ''
  const key = locale.toLowerCase()
  return LOCALE_FLAG[key] ?? LOCALE_FLAG[key.split('-')[0]] ?? ''
}

function openSubstreamPicker(index: number): void {
  const event = mundialEvents[index]
  if (!event) return

  const substreams = Object.entries(event.substreams ?? {})
    .filter(([, sub]) => sub.iframe)
    .map(([, sub]) => ({
      label: [localeToFlag(sub.locale), sub.source_tag].filter(Boolean).join(' ') || '▶',
      iframe: sub.iframe!,
    }))

  if (substreams.length === 0) return

  currentSubstreams = substreams
  focusedSubstreamIndex = 0
  isSubstreamPickerOpen = true

  substreamEventName.textContent = event.name
  substreamList.innerHTML = ''

  substreams.forEach((sub, i) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mundial-substream-item'
    btn.textContent = sub.label
    btn.dataset.index = String(i)
    btn.addEventListener('click', () => {
      focusedSubstreamIndex = i
      openIframe(sub.iframe)
    })
    substreamList.appendChild(btn)
  })

  substreamOverlay.hidden = false
  updateSubstreamFocus()
}

function closeSubstreamPicker(): void {
  isSubstreamPickerOpen = false
  substreamOverlay.hidden = true
}

function getSubstreamItems(): HTMLButtonElement[] {
  return Array.from(substreamList.querySelectorAll<HTMLButtonElement>('.mundial-substream-item'))
}

function updateSubstreamFocus(): void {
  const items = getSubstreamItems()
  items.forEach((item, i) => item.classList.toggle('focused', i === focusedSubstreamIndex))
  items[focusedSubstreamIndex]?.scrollIntoView({ block: 'nearest' })
}

function openIframe(url: string): void {
  isIframeOpen = true
  iframeEl.src = url
  iframeOverlay.hidden = false
  closeSubstreamPicker()
}

function closeIframe(): void {
  isIframeOpen = false
  iframeOverlay.hidden = true
  iframeEl.src = ''
}

iframeCloseBtn.addEventListener('click', closeIframe)
mundialBackBtn.addEventListener('click', () => {
  screenMundial.dispatchEvent(new CustomEvent('mundial:back'))
})

export async function initMundialScreen(): Promise<void> {
  mundialContent.innerHTML = '<div class="mundial-loading"><div class="mundial-loading-dots"><span></span><span></span><span></span></div><span>Cargando partidos...</span></div>'
  focusedEventIndex = 0

  try {
    const response = await fetch(PPV_API_URL)
    const data = await response.json() as PpvApiResponse
    const category = (data.streams ?? []).find(c => c.category === 'Football');
    mundialEvents = category?.streams ?? [];
    renderMundialEvents()
  } catch {
    mundialContent.innerHTML = '<div class="mundial-error">Error al cargar los partidos. Intenta de nuevo.</div>'
  }
}

export function handleMundialKey(e: KeyboardEvent): boolean {
  if (isIframeOpen) {
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      closeIframe()
      return true
    }
    return false
  }

  if (isSubstreamPickerOpen) {
    // ArrowLeft and Back both dismiss the picker
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' || e.key === 'ArrowLeft') {
      e.preventDefault()
      closeSubstreamPicker()
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusedSubstreamIndex = Math.max(0, focusedSubstreamIndex - 1)
      updateSubstreamFocus()
      return true
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusedSubstreamIndex = Math.min(currentSubstreams.length - 1, focusedSubstreamIndex + 1)
      updateSubstreamFocus()
      return true
    }
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault()
      const sub = currentSubstreams[focusedSubstreamIndex]
      if (sub) openIframe(sub.iframe)
      return true
    }
    return true
  }

  // 2-D grid navigation: Left/Right move by 1, Up/Down move by one full row
  const cols = getGridColumns()
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    focusedEventIndex = Math.min(mundialEvents.length - 1, focusedEventIndex + 1)
    updateEventFocus()
    return true
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    focusedEventIndex = Math.max(0, focusedEventIndex - 1)
    updateEventFocus()
    return true
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedEventIndex = Math.min(mundialEvents.length - 1, focusedEventIndex + cols)
    updateEventFocus()
    return true
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusedEventIndex - cols >= 0) {
      focusedEventIndex -= cols
      updateEventFocus()
    } else {
      // Already on the top row — signal main.ts to shift focus to the header
      return false
    }
    return true
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    openSubstreamPicker(focusedEventIndex)
    return true
  }

  return false
}
