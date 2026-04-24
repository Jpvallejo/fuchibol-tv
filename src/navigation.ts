export interface NavigationCell {
  element: HTMLElement
  rowIndex: number
  programIndex: number
  startMinutes: number
  endMinutes: number
  wrapsDay: boolean
}

export interface FocusPosition {
  rowIndex: number
  programIndex: number
}

export class GridNavigation {
  private rows: NavigationCell[][]
  private focusRowIndex = 0
  private focusProgramIndex = 0
  private focusMinutes = 0

  constructor(rows: NavigationCell[][]) {
    this.rows = rows
  }

  setRows(rows: NavigationCell[][]): void {
    this.rows = rows
    this.focusRowIndex = 0
    this.focusProgramIndex = 0
    this.focusMinutes = 0
  }

  focusFirst(rowIndex = 0, programIndex = 0): void {
    this.focusPosition(rowIndex, programIndex)
  }

  focusPosition(rowIndex: number, programIndex: number): void {
    const row = this.rows[rowIndex]
    if (!row || row.length === 0) {
      const fallback = this.findFirstAvailableCell()
      if (fallback) {
        this.setFocus(fallback.rowIndex, fallback.programIndex)
      }
      return
    }

    const clampedProgramIndex = Math.min(Math.max(programIndex, 0), row.length - 1)
    this.setFocus(rowIndex, clampedProgramIndex)
  }

  handleKey(key: string): boolean {
    if (this.rows.length === 0) return false

    switch (key) {
      case 'ArrowRight':
        return this.moveHorizontal(1)
      case 'ArrowLeft':
        return this.moveHorizontal(-1)
      case 'ArrowDown':
        return this.moveVertical(1)
      case 'ArrowUp':
        return this.moveVertical(-1)
      default:
        return false
    }
  }

  getFocusedPosition(): FocusPosition | null {
    const row = this.rows[this.focusRowIndex]
    if (!row || row.length === 0) return null

    return {
      rowIndex: this.focusRowIndex,
      programIndex: this.focusProgramIndex,
    }
  }

  restoreFocus(): void {
    this.applyFocus()
  }

  private moveHorizontal(delta: number): boolean {
    const row = this.rows[this.focusRowIndex]
    if (!row || row.length === 0) return false

    const nextIndex = this.focusProgramIndex + delta
    if (nextIndex < 0 || nextIndex >= row.length) {
      return false
    }

    this.setFocus(this.focusRowIndex, nextIndex)
    return true
  }

  private moveVertical(delta: number): boolean {
    if (this.rows.length === 0) return false

    const targetRowIndex = this.findNextRowIndex(this.focusRowIndex, delta)
    if (targetRowIndex === null) return false

    const targetRow = this.rows[targetRowIndex]
    if (!targetRow || targetRow.length === 0) return false

    const targetProgramIndex = this.findBestCellIndex(targetRow, this.focusMinutes)
    this.setFocus(targetRowIndex, targetProgramIndex)
    return true
  }

  private setFocus(rowIndex: number, programIndex: number): void {
    const row = this.rows[rowIndex]
    if (!row || row.length === 0) return

    const cell = row[programIndex]
    if (!cell) return

    this.focusRowIndex = rowIndex
    this.focusProgramIndex = programIndex
    this.focusMinutes = this.getCellCenterMinutes(cell)
    this.applyFocus()
  }

  private applyFocus(): void {
    this.rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        const focused = rowIndex === this.focusRowIndex && cellIndex === this.focusProgramIndex
        cell.element.classList.toggle('focused', focused)
        if (focused) {
          cell.element.focus()
          cell.element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
      })
    })
  }

  private findFirstAvailableCell(): FocusPosition | null {
    for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex += 1) {
      if (this.rows[rowIndex].length > 0) {
        return { rowIndex, programIndex: 0 }
      }
    }

    return null
  }

  private findNextRowIndex(startRowIndex: number, delta: number): number | null {
    let rowIndex = startRowIndex + delta

    while (rowIndex >= 0 && rowIndex < this.rows.length) {
      if (this.rows[rowIndex].length > 0) {
        return rowIndex
      }
      rowIndex += delta
    }

    return null
  }

  private findBestCellIndex(row: NavigationCell[], targetMinutes: number): number {
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY

    row.forEach((cell, index) => {
      if (this.cellContainsMinutes(cell, targetMinutes)) {
        bestIndex = index
        bestDistance = -1
        return
      }

      const center = this.getCellCenterMinutes(cell)
      const distance = Math.abs(center - targetMinutes)
      if (distance < bestDistance) {
        bestIndex = index
        bestDistance = distance
      }
    })

    return bestIndex
  }

  private cellContainsMinutes(cell: NavigationCell, targetMinutes: number): boolean {
    if (!cell.wrapsDay) {
      return targetMinutes >= cell.startMinutes && targetMinutes < cell.endMinutes
    }

    return targetMinutes >= cell.startMinutes || targetMinutes < (cell.endMinutes - 24 * 60)
  }

  private getCellCenterMinutes(cell: NavigationCell): number {
    const duration = cell.endMinutes - cell.startMinutes
    return (cell.startMinutes + (duration / 2)) % (24 * 60)
  }
}