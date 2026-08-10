import type { Channel } from './channels'
import HLS from 'hls.js'

export interface PlayerCallbacks {
  onLoading: () => void
  onLoaded: () => void
  onError: (message: string) => void
}

export class ShakaPlayer {
  private player: shaka.Player | null = null
  private hls: HLS | null = null
  private video: HTMLVideoElement
  private callbacks: PlayerCallbacks

  constructor(video: HTMLVideoElement, callbacks: PlayerCallbacks) {
    this.video = video
    this.callbacks = callbacks
  }

  async load(channel: Channel): Promise<void> {
    this.callbacks.onLoading()

    await this.destroyPlayer()
    this.video.crossOrigin = 'anonymous'

    try {
      // Check if channel has getLa14Url method (for LA14 channels)
      let manifestUrl: string
      if (channel.getLa14Url) {
        const la14Url = await channel.getLa14Url()
        if (!la14Url) {
          this.callbacks.onError('Could not get LA14 playback URL')
          return
        }
        manifestUrl = la14Url
      } else {
        manifestUrl = await channel.getManifestUrl()
      }

      const isHls = manifestUrl.toLowerCase().includes('.m3u8')

      console.log(`[Player] Loading channel: ${channel.id}, manifestUrl: ${manifestUrl}, isHls: ${isHls}`)

      const hlsHeaders = channel.category === 'MUNDIAL'
        ? { Referer: 'https://junkieembeds.pages.dev/', Origin: 'https://junkieembeds.pages.dev' }
        : undefined

      // Use hls.js for HLS/m3u8 streams
      if (isHls || manifestUrl.toLowerCase().includes('.m3u8')) {
        console.log(`[Player] Using hls.js for m3u8 playback`)
        try {
          await this.loadWithHls(manifestUrl, hlsHeaders)
        } catch (hlsErr) {
          console.warn(`[Player] HLS failed for primary URL: ${hlsErr}`)
          // Try fallbackM3u8Url if provided on the channel
          const fb = (channel as any).fallbackM3u8Url as string | undefined
          if (fb) {
            console.log(`[Player] Attempting HLS fallback URL: ${fb}`)
            await this.loadWithHls(fb, hlsHeaders)
          } else {
            throw hlsErr
          }
        }
      } else {
        // Use Shaka Player for DASH streams
        console.log(`[Player] Using Shaka Player for DASH playback`)
        try {
          await this.loadWithShaka(channel, manifestUrl)
        } catch (dashErr) {
          console.warn(`[Player] DASH failed for primary URL: ${dashErr}`)
          const fb = (channel as any).fallbackM3u8Url as string | undefined
          if (fb) {
            console.log(`[Player] Attempting M3U8 fallback URL: ${fb}`)
            await this.loadWithHls(fb)
          } else {
            throw dashErr
          }
        }
      }

      console.log(`[Player] Successfully loaded: ${channel.id}`)
      this.callbacks.onLoaded()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[Player] Error: ${msg}`)
      this.callbacks.onError(msg || 'Error al reproducir el canal')
    }
  }

  private async loadWithHls(manifestUrl: string, headers?: Record<string, string>): Promise<void> {
    console.log(`[Player] loadWithHls: ${manifestUrl}`)

    if (HLS.isSupported()) {
      this.hls = new HLS({
        debug: false,
        lowLatencyMode: false,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value))
          }
        },
      })
      this.hls.loadSource(manifestUrl)
      this.hls.attachMedia(this.video)

      return new Promise((resolve, reject) => {
        this.hls!.once(HLS.Events.MANIFEST_PARSED, () => {
          console.log(`[Player] HLS manifest parsed`)
          resolve()
        })
        this.hls!.once(HLS.Events.ERROR, (_event: any, data: any) => {
          console.error(`[Player] HLS error:`, data)
          reject(new Error(`HLS Error: ${data.type} - ${data.details}`))
        })
      })
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback for Safari native HLS support
      console.log(`[Player] Using native HLS support`)
      this.video.src = manifestUrl
      return new Promise((resolve, reject) => {
        this.video.addEventListener('canplay', () => resolve(), { once: true })
        this.video.addEventListener('error', () => reject(new Error('Failed to load HLS')), { once: true })
      })
    } else {
      throw new Error('HLS is not supported in this browser')
    }
  }

  private async loadWithShaka(channel: Channel, manifestUrl: string): Promise<void> {
    console.log(`[Player] loadWithShaka: ${manifestUrl}`)

    const player = new shaka.Player(this.video)
    this.player = player

    player.addEventListener('error', (event: shaka.PlayerEvent) => {
      const detail = event.detail
      const msg = detail?.message ?? `Error code ${detail?.code ?? 'unknown'}`
      console.error(`[Player] Shaka error:`, msg)
      this.callbacks.onError(msg)
    })

    // Fetch Shaka setup from backend each time (manifest URLs are short-lived)
    const setupUrl = `https://fuchibol.vallejo.ar/api/get-shaka-setup?channel=${encodeURIComponent(channel.id)}`
    let setupResp: Response
    try {
      setupResp = await fetch(setupUrl, { method: 'GET' })
    } catch (err) {
      console.error('[Player] Failed to fetch Shaka setup:', err)
      this.callbacks.onError('Stream unavailable')
      throw new Error('Stream unavailable')
    }

    if (!setupResp.ok) {
      console.error('[Player] Shaka setup returned non-200:', setupResp.status)
      this.callbacks.onError('Stream unavailable')
      throw new Error('Stream unavailable')
    }

    const data = await setupResp.json().catch((e) => ({ error: `invalid_json: ${e}` }))
    if (!data || data.error) {
      console.error('[Player] Shaka setup error:', data?.error ?? data)
      this.callbacks.onError('Stream unavailable')
      throw new Error('Stream unavailable')
    }

    const manifestUri: string = data.originalManifestUri || data.manifestUri
    const fallbackManifests: string[] = Array.isArray(data.fallbackManifests) ? data.fallbackManifests : []
    const clearKeys: Record<string, string> = data.clearKeys || {}

    // Configure DASH DRM with returned clearKeys
    player.configure({ drm: { clearKeys } })

    // Configure network request headers for fubohd.com URLs
    const isFuboHdSession = manifestUri && manifestUri.includes('fubohd.com')
    if (isFuboHdSession) {
      console.log('Detected fubohd.com session, forcing referer/origin headers')
      const networkingEngine = player.getNetworkingEngine()
      networkingEngine.registerRequestFilter((_requestType: number, request: any) => {
        request.headers = request.headers || {}
        request.headers['Referer'] = 'https://fubohd.com/'
        request.headers['referer'] = 'https://fubohd.com/'
        request.headers['Origin'] = 'https://fubohd.com'
        request.headers['origin'] = 'https://fubohd.com'
      })
    }

    // Try loading primary manifest, then fallbacks in order
    const allManifests = [manifestUri, ...fallbackManifests]
    let lastErr: any = null
    for (const uri of allManifests) {
      if (!uri) continue
      try {
        console.log(`[Player] Attempting Shaka load: ${uri}`)
        await player.load(uri)
        // success
        return
      } catch (err) {
        console.warn(`[Player] Shaka load failed for ${uri}:`, err)
        lastErr = err
      }
    }

    // All attempts failed
    console.error('[Player] All Shaka manifest loads failed')
    this.callbacks.onError('Error al reproducir el canal')
    throw lastErr || new Error('Shaka load failed')
  }

  async destroyPlayer(): Promise<void> {
    if (this.player) {
      await this.player.destroy()
      this.player = null
    }
    if (this.hls) {
      this.hls.destroy()
      this.hls = null
    }
    this.video.src = ''
    this.video.removeAttribute('crossorigin')
  }
}
