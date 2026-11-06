// Guide screen: category rail on the left and a grid of channel cards showing
// what's on now. Owns its own DOM, D-pad focus and the
// +18 age gate; main.ts feeds it data and decides what opening a channel means.
//
// Built for low-end TV hardware: cards are cloned from a template in one
// fragment, logos are lazy <img>s, focus changes only touch two cards, and
// only transform/opacity are animated.
import { ADULT_CATEGORY, CATEGORY_ORDER, type ChannelCategoryV2, type ChannelV2 } from './channels-v2'

export interface NowPlaying {
  title: string
  meta: string
  timeRange: string
  progress: number // 0..1
}

export interface GuideViewOptions {
  root: HTMLElement
  channels: ChannelV2[]
  getNowPlaying: (channel: ChannelV2) => NowPlaying | null
  getLogoUrl: (channel: ChannelV2) => string | null
  onOpenChannel: (channel: ChannelV2) => void
  // Cards that scrolled into (or near) view, so their program info can be loaded lazily.
  onCardsVisible?: (channels: ChannelV2[]) => void
  // Back pressed with nothing left to close (rail focused): main decides (exit prompt).
  onBackAtRoot: () => void
}

type CategoryKey = ChannelCategoryV2 | 'ALL'
type Zone = 'rail' | 'grid'

const GRID_COLUMNS = 4 // keep in sync with .gv-grid in style.css
const PROGRAM_REFRESH_MS = 60 * 1000
const CLOCK_REFRESH_MS = 15 * 1000
const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const CATEGORY_META: Record<CategoryKey, { label: string, icon: string }> = {
  ALL: { label: 'Todos', icon: '📺' },
  GENERAL: { label: 'General', icon: '📡' },
  FUTBOL: { label: 'Fútbol', icon: '⚽' },
  DEPORTES: { label: 'Deportes', icon: '🏆' },
  PELICULAS: { label: 'Películas y series', icon: '🎬' },
  INFANTIL: { label: 'Infantiles', icon: '🧸' },
  DOCUMENTALES: { label: 'Documentales', icon: '🌍' },
  VARIEDAD: { label: 'Variedades', icon: '✨' },
  MUSICA: { label: 'Música', icon: '🎵' },
  INTERIOR: { label: 'Interior', icon: '🏙️' },
  INTERNACIONAL: { label: 'Internacional', icon: '🌐' },
  EEUU: { label: 'Estados Unidos', icon: '🇺🇸' },
  URUGUAY: { label: 'Uruguay', icon: '🇺🇾' },
  PARAGUAY: { label: 'Paraguay', icon: '🇵🇾' },
  OTROS: { label: 'Otros', icon: '📻' },
  MAS: { label: '+18', icon: '🔞' },
}

const clockFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE })
const dateFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE })

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase()
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

// One card, cloned for every channel (cheaper than parsing innerHTML per card).
const cardTemplate = (() => {
  const card = el('button', 'gv-card')
  card.type = 'button'
  card.innerHTML = `
    <span class="gv-card-logo"><img alt="" loading="lazy" decoding="async"><span class="gv-initials"></span></span>
    <span class="gv-card-name"></span>
    <span class="gv-card-num"></span>
    <span class="gv-card-prog"></span>
  `
  return card
})()

export class GuideView {
  private readonly opts: GuideViewOptions
  private readonly publicChannels: ChannelV2[]
  private readonly categories: { key: CategoryKey, count: number }[]

  private readonly railButtons: HTMLButtonElement[] = []
  private readonly gridEl: HTMLElement
  private readonly gridScroller: HTMLElement
  private readonly sectionTitle: HTMLElement
  private readonly sectionCount: HTMLElement
  private readonly clockEl: HTMLElement
  private readonly dateEl: HTMLElement
  private readonly gate: { root: HTMLElement, buttons: HTMLButtonElement[] }

  private zone: Zone = 'grid'
  private categoryIndex = -1
  private cardIndex = 0
  private cards: HTMLButtonElement[] = []
  private visible: ChannelV2[] = []
  private adultUnlocked = false
  private gateFocus = 0
  private timers: ReturnType<typeof setInterval>[] = []
  private readonly cardChannel = new WeakMap<Element, ChannelV2>()
  private readonly visibilityObserver: IntersectionObserver | null

  constructor(opts: GuideViewOptions) {
    this.opts = opts
    this.publicChannels = opts.channels.filter((c) => c.category !== ADULT_CATEGORY)

    const counts = new Map<ChannelCategoryV2, number>()
    opts.channels.forEach((c) => counts.set(c.category, (counts.get(c.category) ?? 0) + 1))
    this.categories = [
      { key: 'ALL', count: this.publicChannels.length },
      ...CATEGORY_ORDER.filter((key) => counts.has(key)).map((key) => ({ key, count: counts.get(key)! })),
    ]

    const root = opts.root
    root.classList.add('gv')
    root.innerHTML = `
      <header class="gv-top">
        <div class="gv-brand">
          <img class="gv-brand-logo" src="./tv-argentina-logo-small.png" alt="">
          <span class="gv-brand-name">Argentina TV</span>
        </div>
        <div class="gv-status">
          <span class="gv-live">En vivo</span>
          <span class="gv-date"></span>
          <span class="gv-clock"></span>
        </div>
      </header>
      <div class="gv-body">
        <nav class="gv-rail" aria-label="Categorías"></nav>
        <main class="gv-main">
          <div class="gv-section"><h2 class="gv-section-title"></h2><span class="gv-section-count"></span></div>
          <div class="gv-grid-scroller"><div class="gv-grid" role="grid"></div></div>
        </main>
      </div>
      <div class="gv-gate" role="alertdialog" aria-modal="true" aria-labelledby="gv-gate-title" hidden>
        <div class="gv-gate-box">
          <span class="gv-gate-icon">🔞</span>
          <h2 id="gv-gate-title">Contenido para mayores de 18 años</h2>
          <p>Esta categoría contiene material exclusivo para adultos. Para continuar, confirmá que tenés 18 años o más.</p>
          <div class="gv-gate-actions">
            <button type="button" class="gv-gate-btn">Volver</button>
            <button type="button" class="gv-gate-btn gv-gate-accept">Tengo 18 años o más</button>
          </div>
        </div>
      </div>
    `

    const q = <T extends Element>(selector: string) => root.querySelector(selector) as T
    this.gridEl = q('.gv-grid')
    this.gridScroller = q('.gv-grid-scroller')
    this.sectionTitle = q('.gv-section-title')
    this.sectionCount = q('.gv-section-count')
    this.clockEl = q('.gv-clock')
    this.dateEl = q('.gv-date')
    this.gate = { root: q('.gv-gate'), buttons: Array.from(root.querySelectorAll<HTMLButtonElement>('.gv-gate-btn')) }

    // Pre-load a screen's worth below the fold so scrolling doesn't show blanks.
    this.visibilityObserver = opts.onCardsVisible && 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        const channels = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => this.cardChannel.get(entry.target))
          .filter((channel): channel is ChannelV2 => !!channel)
        if (channels.length > 0) opts.onCardsVisible!(channels)
      }, { root: this.gridScroller, rootMargin: '600px 0px' })
      : null

    const rail = q<HTMLElement>('.gv-rail')
    this.categories.forEach((category, index) => {
      const meta = CATEGORY_META[category.key]
      const button = el('button', 'gv-cat')
      button.type = 'button'
      button.append(el('span', 'gv-cat-icon', meta.icon), el('span', 'gv-cat-label', meta.label), el('span', 'gv-cat-count', String(category.count)))
      button.addEventListener('click', () => {
        this.selectCategory(index)
        this.enterGrid()
      })
      rail.appendChild(button)
      this.railButtons.push(button)
    })

    this.gridEl.addEventListener('click', (event) => {
      const card = (event.target as HTMLElement).closest('.gv-card')
      const index = card ? this.cards.indexOf(card as HTMLButtonElement) : -1
      if (index >= 0) {
        this.setCardFocus(index)
        this.opts.onOpenChannel(this.visible[index])
      }
    })
    this.gate.buttons[0].addEventListener('click', () => this.closeGate())
    this.gate.buttons[1].addEventListener('click', () => this.acceptGate())

    this.selectCategory(0)
  }

  // Channels in the current category, in display order (for channel up/down).
  get activeChannels(): ChannelV2[] {
    return this.visible.length > 0 ? this.visible : this.publicChannels
  }

  // Channels that never require the age gate (for the in-player channel list).
  get browsableChannels(): ChannelV2[] {
    return this.publicChannels
  }

  show(): void {
    this.updateClock()
    this.refreshPrograms()
    this.stopTimers()
    this.timers.push(setInterval(() => this.refreshPrograms(), PROGRAM_REFRESH_MS))
    this.timers.push(setInterval(() => this.updateClock(), CLOCK_REFRESH_MS))
    this.applyFocus()
  }

  hide(): void {
    this.stopTimers()
  }

  // Puts DOM focus back on the current rail item / card (e.g. after a modal).
  restoreFocus(): void {
    this.applyFocus()
  }

  // Re-reads now-playing info for the rendered cards (no re-render).
  refreshPrograms(): void {
    this.cards.forEach((card, i) => this.fillCardProgram(card, this.visible[i]))
  }

  // Returns true when the key was consumed.
  handleKey(e: KeyboardEvent): boolean {
    const isBack = e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack'
    const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
    if (!isBack && !isArrow && e.key !== 'Enter') return false
    e.preventDefault()

    if (isBack) {
      this.handleBack()
    } else if (!this.gate.root.hidden) {
      this.handleGateKey(e.key)
    } else if (this.zone === 'rail') {
      this.handleRailKey(e.key)
    } else {
      this.handleGridKey(e.key)
    }
    return true
  }

  handleBack(): void {
    if (!this.gate.root.hidden) this.closeGate()
    else if (this.zone === 'grid') this.setZone('rail')
    else this.opts.onBackAtRoot()
  }

  // ===== Navigation =====

  private handleRailKey(key: string): void {
    if (key === 'ArrowUp') this.selectCategory(Math.max(0, this.categoryIndex - 1))
    else if (key === 'ArrowDown') this.selectCategory(Math.min(this.categories.length - 1, this.categoryIndex + 1))
    else if (key === 'ArrowRight' || key === 'Enter') this.enterGrid()
  }

  private handleGridKey(key: string): void {
    const i = this.cardIndex
    const col = i % GRID_COLUMNS
    if (key === 'Enter') {
      const channel = this.visible[i]
      if (channel) this.opts.onOpenChannel(channel)
    } else if (key === 'ArrowLeft') {
      if (col === 0) this.setZone('rail')
      else this.setCardFocus(i - 1)
    } else if (key === 'ArrowRight') {
      if (col < GRID_COLUMNS - 1 && i + 1 < this.cards.length) this.setCardFocus(i + 1)
    } else if (key === 'ArrowUp') {
      if (i >= GRID_COLUMNS) this.setCardFocus(i - GRID_COLUMNS)
    } else if (key === 'ArrowDown') {
      const lastRowStart = Math.floor((this.cards.length - 1) / GRID_COLUMNS) * GRID_COLUMNS
      // On a partial last row, land on its last card instead of doing nothing.
      if (i < lastRowStart) this.setCardFocus(Math.min(i + GRID_COLUMNS, this.cards.length - 1))
    }
  }

  private enterGrid(): void {
    if (this.isLocked()) {
      this.openGate()
      return
    }
    if (this.cards.length > 0) this.setZone('grid')
  }

  private setZone(zone: Zone): void {
    this.zone = zone
    this.applyFocus()
  }

  private applyFocus(): void {
    this.railButtons.forEach((b, i) => b.classList.toggle('is-selected', i === this.categoryIndex))
    this.opts.root.classList.toggle('gv-zone-rail', this.zone === 'rail')
    const target = this.zone === 'rail' ? this.railButtons[this.categoryIndex] : this.cards[this.cardIndex]
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'nearest' })
  }

  private setCardFocus(index: number): void {
    this.cardIndex = index
    this.applyFocus()
  }

  // ===== Categories & cards =====

  private selectCategory(index: number): void {
    if (index === this.categoryIndex) {
      this.applyFocus()
      return
    }
    // Leaving the +18 category locks it again.
    this.adultUnlocked = false
    this.categoryIndex = index
    this.cardIndex = 0
    this.renderGrid()
    this.applyFocus()
  }

  private isLocked(): boolean {
    return this.categories[this.categoryIndex].key === ADULT_CATEGORY && !this.adultUnlocked
  }

  private renderGrid(): void {
    const { key, count } = this.categories[this.categoryIndex]
    this.sectionTitle.textContent = CATEGORY_META[key].label
    this.sectionCount.textContent = `${count} ${count === 1 ? 'canal' : 'canales'}`

    const locked = this.isLocked()
    this.opts.root.classList.toggle('gv-locked', locked)
    this.visible = locked ? [] : key === 'ALL' ? this.publicChannels : this.opts.channels.filter((c) => c.category === key)

    const fragment = document.createDocumentFragment()
    this.cards = this.visible.map((channel) => {
      const card = this.buildCard(channel)
      fragment.appendChild(card)
      return card
    })
    if (locked) {
      const notice = el('div', 'gv-locked-notice')
      notice.append(el('span', 'gv-locked-icon', '🔒'), el('p', '', 'Contenido para mayores de 18 años. Presioná OK para continuar.'))
      fragment.appendChild(notice)
    }
    this.gridEl.replaceChildren(fragment)
    this.gridScroller.scrollTop = 0

    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect()
      this.cards.forEach((card) => this.visibilityObserver!.observe(card))
    } else {
      this.opts.onCardsVisible?.(this.visible)
    }
  }

  private buildCard(channel: ChannelV2): HTMLButtonElement {
    const card = cardTemplate.cloneNode(true) as HTMLButtonElement
    this.cardChannel.set(card, channel)
    card.style.setProperty('--c', channel.color)
    this.setLogo(card.querySelector('img')!, card.querySelector('.gv-initials')!, channel)
    card.querySelector('.gv-card-name')!.textContent = channel.name
    card.querySelector('.gv-card-num')!.textContent = channel.number ? String(channel.number) : ''
    this.fillCardProgram(card, channel)
    return card
  }

  private fillCardProgram(card: HTMLElement, channel: ChannelV2 | undefined): void {
    if (!channel) return
    const info = this.opts.getNowPlaying(channel)
    card.classList.toggle('no-program', !info)
    card.querySelector('.gv-card-prog')!.textContent = info?.title ?? 'Sin programación'
  }

  private setLogo(img: HTMLImageElement, fallback: HTMLElement, channel: ChannelV2): void {
    const url = this.opts.getLogoUrl(channel)
    fallback.textContent = initials(channel.name)
    img.hidden = !url
    fallback.hidden = !!url
    if (url) {
      img.onerror = () => { img.hidden = true; fallback.hidden = false }
      img.src = url
    } else {
      img.removeAttribute('src')
    }
  }

  private updateClock(): void {
    const now = new Date()
    this.clockEl.textContent = clockFormatter.format(now)
    this.dateEl.textContent = dateFormatter.format(now)
  }

  private stopTimers(): void {
    this.timers.forEach(clearInterval)
    this.timers = []
  }

  // ===== +18 gate (shown every time the category is entered) =====

  private openGate(): void {
    this.gate.root.hidden = false
    this.focusGateButton(0) // "Volver" first, so a stray OK doesn't accept
  }

  private closeGate(): void {
    this.gate.root.hidden = true
    this.applyFocus()
  }

  private acceptGate(): void {
    this.gate.root.hidden = true
    this.adultUnlocked = true
    this.renderGrid()
    this.setZone(this.cards.length > 0 ? 'grid' : 'rail')
  }

  private focusGateButton(index: number): void {
    this.gateFocus = Math.min(Math.max(index, 0), this.gate.buttons.length - 1)
    this.gate.buttons.forEach((b, i) => b.classList.toggle('is-focused', i === this.gateFocus))
    this.gate.buttons[this.gateFocus].focus()
  }

  private handleGateKey(key: string): void {
    if (key === 'ArrowLeft' || key === 'ArrowUp') this.focusGateButton(this.gateFocus - 1)
    else if (key === 'ArrowRight' || key === 'ArrowDown') this.focusGateButton(this.gateFocus + 1)
    else if (key === 'Enter') this.gate.buttons[this.gateFocus].click()
  }
}
