export interface Channel {
  id: string
  name: string
  shortName: string
  color: string
  keyId: string
  key: string
  getManifestUrl: () => string
}

const mtRed = ['cdnlb', 'cdn02', 'cdn03']

function getGigaredHost(): string {
  return mtRed[Math.floor(Math.random() * mtRed.length)]
}

function buildGigaredManifest(path: string): string {
  return `https://${getGigaredHost()}.gigared.com.ar${path}`
}

export const channels: Channel[] = [
  {
    id: 'espn-premium',
    name: 'ESPN Premium',
    shortName: 'ESPN+',
    color: '#cc0000',
    keyId: 'dca96877c202470bdad9839bea525c0a',
    key: 'd651871131d4b26f0095bcb9771b8f2f',
    getManifestUrl: () => buildGigaredManifest('/live/eds/ESPN_Premium/sa_live_dash/ESPN_Premium.mpd'),
  },
  {
    id: 'tnt-sports',
    name: 'TNT Sports',
    shortName: 'TNT',
    color: '#0033cc',
    keyId: 'f26eb059fb0854f4d4218c895d7ae803',
    key: 'ffcb3fd4bd5657889215be4cb6275d1b',
    getManifestUrl: () => buildGigaredManifest('/live/eds/TNT_Sports_Premium/sa_live_dash/TNT_Sports_Premium.mpd'),
  },
]
