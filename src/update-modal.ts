import type { UpdateCheckResult } from './update-checker'

// Android DownloadManager status constants
const DL_STATUS_SUCCESSFUL = 8
const DL_STATUS_FAILED = 16

export function showUpdateModal(updateInfo: UpdateCheckResult): Promise<void> {
  return new Promise<void>((resolve) => {
    const modal = document.createElement('div')
    modal.className = 'update-modal-overlay'

    const modalBox = document.createElement('div')
    modalBox.className = 'update-modal-box'

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

    // Progress section (hidden until download starts)
    const progressSection = document.createElement('div')
    progressSection.className = 'download-progress-section'
    progressSection.hidden = true

    const progressTrack = document.createElement('div')
    progressTrack.className = 'download-progress-track'

    const progressBar = document.createElement('div')
    progressBar.className = 'download-progress-bar'

    const progressLabel = document.createElement('div')
    progressLabel.className = 'download-progress-label'
    progressLabel.textContent = 'Descargando...'

    progressTrack.appendChild(progressBar)
    progressSection.appendChild(progressTrack)
    progressSection.appendChild(progressLabel)

    const buttons = document.createElement('div')
    buttons.className = 'update-modal-buttons'

    // DOM order matches visual order (left → right): dismiss, update
    const dismissButton = document.createElement('button')
    dismissButton.className = 'update-modal-button dismiss-button'
    dismissButton.textContent = 'Más tarde'

    const updateButton = document.createElement('button')
    updateButton.className = 'update-modal-button update-button'
    updateButton.textContent = 'Actualizar'

    // focusableButtons order matches visual left-to-right order
    const focusableButtons = [dismissButton, updateButton]
    let focusedButtonIndex = 1 // start focus on "Actualizar" (right)

    function updateModalFocus(): void {
      focusableButtons.forEach((btn, i) => {
        btn.classList.toggle('focused', i === focusedButtonIndex)
      })
      focusableButtons[focusedButtonIndex].focus()
    }

    let progressPollInterval: ReturnType<typeof setInterval> | null = null

    function removeModal(): void {
      document.removeEventListener('keydown', handleModalKeydown, { capture: true })
      if (progressPollInterval) clearInterval(progressPollInterval)
      modal.remove()
      resolve()
    }

    function handleModalKeydown(e: KeyboardEvent): void {
      e.stopPropagation()
      e.preventDefault()

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        focusedButtonIndex = Math.max(0, focusedButtonIndex - 1)
        updateModalFocus()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        focusedButtonIndex = Math.min(focusableButtons.length - 1, focusedButtonIndex + 1)
        updateModalFocus()
      } else if (e.key === 'Enter') {
        focusableButtons[focusedButtonIndex].click()
      }
      // Escape / back keys do NOT dismiss — only "Más tarde" does
    }

    updateButton.addEventListener('click', () => {
      const cap = (window as any).Capacitor
      if (cap?.Plugins?.ApkInstaller?.downloadAndInstall) {
        updateButton.textContent = 'Iniciando descarga...'
        updateButton.disabled = true

        void cap.Plugins.ApkInstaller.downloadAndInstall({ url: updateInfo.downloadUrl })
          .then((result: { downloadId?: number }) => {
            progressSection.hidden = false
            progressBar.style.width = '0%'
            progressLabel.textContent = 'Descargando: 0%'

            const downloadId = result?.downloadId
            if (downloadId != null && cap.Plugins.ApkInstaller.checkProgress) {
              progressPollInterval = setInterval(() => {
                void cap.Plugins.ApkInstaller.checkProgress({ downloadId })
                  .then((info: { percent: number; status: number }) => {
                    const { percent, status } = info
                    if (percent >= 0) {
                      progressBar.style.width = `${percent}%`
                      progressLabel.textContent = `Descargando: ${percent}%`
                    }
                    if (status === DL_STATUS_SUCCESSFUL) {
                      if (progressPollInterval) clearInterval(progressPollInterval)
                      progressPollInterval = null
                      progressBar.style.width = '100%'
                      progressLabel.textContent = 'Descarga completa. Instalando...'
                      updateButton.textContent = 'Instalando...'
                    } else if (status === DL_STATUS_FAILED) {
                      if (progressPollInterval) clearInterval(progressPollInterval)
                      progressPollInterval = null
                      progressLabel.textContent = 'Error al descargar'
                      updateButton.textContent = 'Error'
                      updateButton.disabled = false
                    }
                  })
                  .catch(() => { /* polling error, ignore */ })
              }, 500)
            } else {
              // Plugin resolved without downloadId — download runs in system notification
              progressSection.hidden = true
              updateButton.textContent = 'Descargando...'
              progressLabel.textContent = 'Revisa las notificaciones del sistema'
            }
          })
          .catch(() => {
            removeModal()
          })
      } else {
        window.open(updateInfo.downloadUrl, '_blank')
        removeModal()
      }
    })

    dismissButton.addEventListener('click', () => {
      removeModal()
    })

    buttons.appendChild(dismissButton)
    buttons.appendChild(updateButton)

    content.appendChild(versionInfo)
    content.appendChild(message)
    content.appendChild(progressSection)

    modalBox.appendChild(title)
    modalBox.appendChild(content)
    modalBox.appendChild(buttons)

    modal.appendChild(modalBox)
    document.body.appendChild(modal)

    document.addEventListener('keydown', handleModalKeydown, { capture: true })
    updateModalFocus()
  })
}
