import type { UpdateCheckResult } from './update-checker'

/**
 * Creates and shows an update notification modal
 */
export function showUpdateModal(updateInfo: UpdateCheckResult): void {
  // Create modal container
  const modal = document.createElement('div')
  modal.className = 'update-modal-overlay'

  const modalBox = document.createElement('div')
  modalBox.className = 'update-modal-box'

  const closeButton = document.createElement('button')
  closeButton.className = 'update-modal-close'
  closeButton.textContent = '×'
  closeButton.setAttribute('aria-label', 'Cerrar')

  const title = document.createElement('h2')
  title.className = 'update-modal-title'
  title.textContent = 'Nueva versión disponible'

  const content = document.createElement('div')
  content.className = 'update-modal-content'

  const versionInfo = document.createElement('div')
  versionInfo.className = 'update-modal-version-info'
  versionInfo.innerHTML = `
    <div class="version-item">
      <span class="version-label">Versión actual:</span>
      <span class="version-number">${updateInfo.currentVersion}</span>
    </div>
    <div class="version-arrow">→</div>
    <div class="version-item">
      <span class="version-label">Nueva versión:</span>
      <span class="version-number version-new">${updateInfo.latestVersion}</span>
    </div>
  `

  const message = document.createElement('p')
  message.className = 'update-modal-message'
  message.textContent = 'Una nueva versión de Argentina TV está disponible. ¡Actualiza ahora para obtener las últimas mejoras y correcciones!'

  const buttons = document.createElement('div')
  buttons.className = 'update-modal-buttons'

  const updateButton = document.createElement('button')
  updateButton.className = 'update-modal-button update-button'
  updateButton.textContent = 'Actualizar'

  const dismissButton = document.createElement('button')
  dismissButton.className = 'update-modal-button dismiss-button'
  dismissButton.textContent = 'Más tarde'

  updateButton.addEventListener('click', () => {
    // Open download URL
    window.open(updateInfo.downloadUrl, '_blank')
    removeModal()
  })

  dismissButton.addEventListener('click', () => {
    removeModal()
  })

  closeButton.addEventListener('click', () => {
    removeModal()
  })

  function removeModal(): void {
    modal.remove()
  }

  buttons.appendChild(updateButton)
  buttons.appendChild(dismissButton)

  content.appendChild(versionInfo)
  content.appendChild(message)

  modalBox.appendChild(closeButton)
  modalBox.appendChild(title)
  modalBox.appendChild(content)
  modalBox.appendChild(buttons)

  modal.appendChild(modalBox)
  document.body.appendChild(modal)
}
