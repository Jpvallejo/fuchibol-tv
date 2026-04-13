import { channels } from './channels'
import { ShakaPlayer } from './player'
import { GridNavigation } from './navigation'

// Install Shaka polyfills
shaka.polyfill.installAll()

if (!shaka.Player.isBrowserSupported()) {
  document.body.innerHTML = '<p style="color:white;padding:2rem">Browser not supported</p>'
  throw new Error('Shaka Player not supported')
}

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

// --- Build channel grid ---
const COLS = 3
const cardElements: HTMLElement[] = []

channels.forEach((ch, _i) => {
  const card = document.createElement('div')
  card.className = 'channel-card'
  card.setAttribute('role', 'gridcell')
  card.setAttribute('tabindex', '0')
  card.dataset.channelId = ch.id

  card.innerHTML = `
    <div class="card-banner" style="background:${ch.color}">
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

async function openChannel(index: number): Promise<void> {
  const ch = channels[index]
  if (!ch) return

  overlayChannelName.textContent = ch.name
  showScreen('player')
  hideOverlay()

  await shakaPlayer.load(ch)
}

async function returnToGrid(): Promise<void> {
  if (overlayTimer) clearTimeout(overlayTimer)
  hideOverlay()
  await shakaPlayer.destroyPlayer()
  video.src = ''
  loadingSpinner.hidden = true
  errorOverlay.hidden = true
  showScreen('grid')
  nav.restoreFocus()
}

// --- Keyboard handler ---
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (currentScreen === 'grid') {
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
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault()
      returnToGrid()
      return
    }
    showOverlay()
  }
})

// --- Card click support ---
cardElements.forEach((card, i) => {
  card.addEventListener('click', () => {
    openChannel(i)
  })
})
