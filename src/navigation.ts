export class GridNavigation {
  private items: HTMLElement[]
  private cols: number
  private focusIndex: number = 0

  constructor(items: HTMLElement[], cols: number) {
    this.items = items
    this.cols = cols
  }

  focusFirst(): void {
    this.focusIndex = 0
    this.applyFocus()
  }

  handleKey(key: string): boolean {
    const total = this.items.length
    if (total === 0) return false

    let next = this.focusIndex

    switch (key) {
      case 'ArrowRight':
        if ((this.focusIndex + 1) % this.cols !== 0 && this.focusIndex + 1 < total) {
          next = this.focusIndex + 1
        }
        break
      case 'ArrowLeft':
        if (this.focusIndex % this.cols !== 0) {
          next = this.focusIndex - 1
        }
        break
      case 'ArrowDown':
        if (this.focusIndex + this.cols < total) {
          next = this.focusIndex + this.cols
        }
        break
      case 'ArrowUp':
        if (this.focusIndex - this.cols >= 0) {
          next = this.focusIndex - this.cols
        }
        break
      default:
        return false
    }

    if (next !== this.focusIndex) {
      this.focusIndex = next
      this.applyFocus()
    }

    return true
  }

  getFocusedIndex(): number {
    return this.focusIndex
  }

  restoreFocus(): void {
    this.applyFocus()
  }

  private applyFocus(): void {
    this.items.forEach((el, i) => {
      if (i === this.focusIndex) {
        el.classList.add('focused')
        el.focus()
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      } else {
        el.classList.remove('focused')
      }
    })
  }
}
