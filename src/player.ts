import type { Channel } from './channels'

export interface PlayerCallbacks {
  onLoading: () => void
  onLoaded: () => void
  onError: (message: string) => void
}

export class ShakaPlayer {
  private player: shaka.Player | null = null
  private video: HTMLVideoElement
  private callbacks: PlayerCallbacks

  constructor(video: HTMLVideoElement, callbacks: PlayerCallbacks) {
    this.video = video
    this.callbacks = callbacks
  }

  async load(channel: Channel): Promise<void> {
    this.callbacks.onLoading()

    await this.destroyPlayer()

    const player = new shaka.Player(this.video)
    this.player = player

    player.configure({
      drm: {
        clearKeys: {
          [channel.keyId]: channel.key,
        },
      },
    })

    player.addEventListener('error', (event: shaka.PlayerEvent) => {
      const detail = event.detail
      const msg = detail?.message ?? `Error code ${detail?.code ?? 'unknown'}`
      this.callbacks.onError(msg)
    })

    try {
      await player.load(channel.getManifestUrl())
      this.callbacks.onLoaded()
    } catch {
      if (channel.fallback) {
        if(channel.fallback.keyId && channel.fallback.key) {
          player.configure({ drm: { clearKeys: { [channel.fallback.keyId]: channel.fallback.key } } })
        }
        try {
          await player.load(channel.fallback.url)
          this.callbacks.onLoaded()
          return
        } catch (err2) {
          const msg = err2 instanceof Error ? err2.message : String(err2)
          this.callbacks.onError(msg)
          return
        }
      }
      this.callbacks.onError('Error al reproducir el canal')
    }
  }

  async destroyPlayer(): Promise<void> {
    if (this.player) {
      await this.player.destroy()
      this.player = null
    }
  }
}
