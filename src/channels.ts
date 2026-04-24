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
  {
    id: 'espn',
    name: 'ESPN',
    shortName: 'ESPN',
    color: '#ff6600',
    keyId: '8b55a3ba068f882f49b36d216f29506f',
    key: '77f418bbcfc73739ebca9c52321472d3',
    getManifestUrl: () => buildGigaredManifest('/live/eds/ESPN/sa_live_dash/ESPN.mpd'),
  },
  {
    id: 'espn-2',
    name: 'ESPN 2',
    shortName: 'ESPN 2',
    color: '#cc3333',
    keyId: '02819f905f4e126d492693e44c688b82',
    key: 'a12adec960cd1e33ad3b8ddbf0dd22b9',
    getManifestUrl: () => buildGigaredManifest('/live/eds/ESPN2/sa_live_dash/ESPN2.mpd'),
  },
  {
    id: 'espn-3',
    name: 'ESPN 3',
    shortName: 'ESPN 3',
    color: '#ff3333',
    keyId: 'ad0c72e30648501377425a62a2bf095c',
    key: '2cfbc73f423203a9fc8a1d983ec4e8bb',
    getManifestUrl: () => buildGigaredManifest('/live/eds/ESPN3/sa_live_dash/ESPN3.mpd'),
  },
  {
    id: 'espn-4',
    name: 'ESPN 4',
    shortName: 'ESPN 4',
    color: '#ff9900',
    keyId: 'ecafef3b8979c737d05ea191a02b7617',
    key: 'f46cd12052b0da221a3a178e2bde0162',
    getManifestUrl: () => buildGigaredManifest('/live/eds/ESPN4/sa_live_dash/ESPN4.mpd'),
  },
  {
    id: 'fox-sports',
    name: 'Fox Sports',
    shortName: 'Fox',
    color: '#009900',
    keyId: '6c0016fff15fcc3cc5d103f821189100',
    key: '94d789ac388ccbbfbd2cf91d5b7db028',
    getManifestUrl: () => buildGigaredManifest('/live/eds/Fox_Sports/sa_live_dash/Fox_Sports.mpd'),
  },
  {
    id: 'fox-sports-2',
    name: 'Fox Sports 2',
    shortName: 'Fox 2',
    color: '#00cc00',
    keyId: 'a2e448d00073c0a66e02caa20a2fe135',
    key: '70e9e4adfb2f0b5ac127654c1a56d238',
    getManifestUrl: () => buildGigaredManifest('/live/eds/Fox_Sports_2/sa_live_dash/Fox_Sports_2.mpd'),
  },
  {
    id: 'fox-sports-3',
    name: 'Fox Sports 3',
    shortName: 'Fox 3',
    color: '#00ff99',
    keyId: 'f2f0d2f5e823bf3bd1113ed83b244c57',
    key: 'addd4c11afb303beb21f95f79a935561',
    getManifestUrl: () => buildGigaredManifest('/live/eds/Fox_Sports_3/sa_live_dash/Fox_Sports_3.mpd'),
  },
  {
    id: 'tyc-sports',
    name: 'TyC Sports',
    shortName: 'TyC',
    color: '#9933ff',
    keyId: 'cac7b52cb14661fe3db0449020791d97',
    key: '0c2780acce4ef9d7334ef25be445ceb4',
    getManifestUrl: () => buildGigaredManifest('/live/eds/TyC_Sports/sa_live_dash/TyC_Sports.mpd'),
  },
]
