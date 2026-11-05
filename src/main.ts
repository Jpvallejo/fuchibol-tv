import { channels as allChannels, ADULT_CATEGORY, type ChannelV2 } from './channels-v2'
import { GuideView } from './guide-view'
import { MiTvGuide } from './mitv-guide'
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

// Program info comes from mi.tv (see mitv-guide.ts), fetched lazily per channel.
const GUIDE_RECHECK_MS = 5 * 60 * 1000

// The previous guide source cached whole days under these keys; no longer used.
try {
  Object.keys(localStorage).filter((key) => key.startsWith('guide-cache-v1:')).forEach((key) => localStorage.removeItem(key))
} catch {
  // Storage unavailable: nothing to clean.
}

const mitvGuide = new MiTvGuide(() => {
  guideView.refreshPrograms()
  if (isGuideOpen) updateGuideOverlayPrograms()
})

// In-player channel list: show what's on for each channel.
function updateGuideOverlayPrograms(): void {
  channels.forEach((channel, i) => {
    const nowElement = guideItems[i]?.querySelector('.guide-item-now')
    if (!nowElement) return
    const info = mitvGuide.getNowPlaying(channel.id)
    nowElement.textContent = info ? `${info.timeRange}  ${info.title}` : 'Sin programación'
  })
}

const guideItems: HTMLElement[] = []

channels.forEach((ch) => {
  const item = document.createElement('div')
  item.className = 'guide-item'
  item.innerHTML = `
    <span class="guide-item-number">${ch.number || ''}</span>
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
  getNowPlaying: (channel) => mitvGuide.getNowPlaying(channel.id),
  getLogoUrl: (channel) => channel.image,
  onOpenChannel: (channel) => void openChannel(channel),
  onCardsVisible: (visible) => mitvGuide.request(visible.map((channel) => channel.id)),
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

setInterval(() => {
  if (currentScreen === 'guide') mitvGuide.request(guideView.activeChannels.map((channel) => channel.id))
}, GUIDE_RECHECK_MS)

async function openChannel(channel: ChannelV2): Promise<void> {
  currentChannel = channel
  // -1 for +18 channels (not in the in-player guide list).
  currentChannelIndex = channels.indexOf(channel)

  overlayChannelNumber.textContent = channel.number ? `${channel.number}` : ''
  overlayChannelName.textContent = channel.name

  loadingLogo.style.backgroundImage = channel.image ? `url('${channel.image}')` : ''
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
  updateGuideOverlayPrograms()
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
  mitvGuide.request(channels.slice(Math.max(0, guideFocusIndex - 6), guideFocusIndex + 12).map((channel) => channel.id))
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
