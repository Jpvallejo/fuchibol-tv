export interface Channel {
  id: string
  name: string
  shortName: string
  color: string
  number: number
  category?: ChannelCategory
  image: string | null
  keyId: string
  key: string
  getManifestUrl: () => string
  fallback?: { url: string; keyId: string; key: string }
}

const mtRed = ['cdnlb', 'cdn02', 'cdn03']

function getGigaredHost(): string {
  return mtRed[Math.floor(Math.random() * mtRed.length)]
}

function buildGigaredManifest(path: string): string {
  return `https://${getGigaredHost()}.gigared.com.ar${path}`
}

export const CHANNEL_ID_BY_NUMBER: Record<number, string> = {
  2014: 'hbMAAzaqDDeSCIBhaCW_OQ',
  310: 'PDBE9vBHXQYBlgCLtcVpIw',
  2003: 'ciwOM-VXylKqJzf9viWjeA',
  2004: 'wbidhpzmabaDfMcZTc-Wgg',
  2015: 'zqVvs3FsL8K_dCUnWqt7SA',
  2000: 'tnqww25oGSPXrqamnOOqsw',
  2025: 'PNtwH85WxWLCq9YQDAL3UQ',
  2033: 'Udqzh8pyX4ZJUmmeNZ4voQ',
  2034: 'YS6jffitXAkU47DggbrKHg',
  2035: 'aW5SZQAtH50WVnv2bgYslQ',
  2036: 'UXOPMKA8jylVCKBQUsufyw',
  2037: 'TuOPfNE6Hir1JE4yflHx1A',
  2062: 'skR_HWeVKregO8eFKeplew',
  2065: 'Vqfw5SS8gWr332vJUn6aKQ',
  2066: 'Mpn70pqyaDdZN60vclCdHw',
  2058: 'BJtk3lOacTL4LgGEdKHqgg',

};

const CHANNEL_IMAGE_BY_NUMBER: Record<number, string|null> = {
  2: '/logo/9-logos-AMERICA-2705.png', // America TV
  11: '/logo/10-logos-TELEFE-2705.png', // Telefe
  7: '/logo/11-logo-tvpublica-20210302.png', // TV Publica
  9: '/logo/13-logos-CANAL9-2705.png', // Canal 9
  100: '/logo/15-logos-TN-2705.png', // TN
  105: '/logo/16-logo-A24_80-20250210.png', // A24
  102: '/logo/17-logos-C5Nhd-270218.png', // C5N
  104: '/logo/18-logos-CRONICA-2705.png', // Cronica TV
  103: '/logo/19-logos-CANAL26-2705.png', // Canal 26
  101: '/logo/20-logo-lnmas-03082017.png', // LN+
  207: '/logo/50-logos-TYCSPORTS-2705.png', // TyC Sports
  200: '/logo/51-ESPN_tv_rojo.png', // ESPN
  201: '/logo/52-ESPN2_rojo.png', // ESPN 2
  202: '/logo/53-logo-ESPN3-20210302.png', // ESPN 3
  204: '/logo/54-LOGO-foxsports-202302.png', // Fox Sports
  205: '/logo/55-LOGO-foxsports2-202302.png', // Fox Sports 2
  206: '/logo/56-LOGO-foxsports3-202302.png', // Fox Sports 3
  251: '/logo/58-ESPN_PREMIUM.png', // ESPN Premium
  250: '/logo/59-logo-TNTSportsPremium20250123.png', // TNT Sports
  209: '/logo/60-logos-DXTV-2705.png', // DeporTV
  210: '/logo/63-logos-TURBO-2705.png', // Discovery Turbo
  208: '/logo/64-logos-ELGARAGE-2705.png', // El Garage
  107: '/logo/107-logos-CRONICA-2705.png',
  15: '/logo/108-logo-nettv.png',
  110: '/logo/110-logos-AMERICAHD-2705.png',
  111: '/logo/111-logo-tvpublica-20210302.png',
  112: '/logo/112-logos-CANAL9-2705.png',
  113: '/logo/113-logos-TELEFEHD-2705.png',
  114: '/logo/114-logos-ELTRECEHD-2705.png',
  115: '/logo/115-logos-TNHD-2705.png',
  116: '/logo/116-logos-C5Nhd-270218.png',
  117: '/logo/117-logo-A24_80-20250210.png',
  118: '/logo/118-logo-lnmas-03082017.png',
  119: '/logo/119-ip-noticias-20241021.png',
  120: '/logo/120-logos-TYCSPORTS-2705.png',
  121: '/logo/121-ESPN_tv_rojo.png',
  122: '/logo/122-logos-ESPN2-2705.png',
  123: '/logo/123-logo-ESPN3-20210302.png',
  203: '/logo/124-espn4-20231602.png', // ESPN 4
  125: '/logo/125-LOGO-foxsports-202302.png',
  126: '/logo/126-LOGO-foxsports2-202302.png',
  127: '/logo/127-LOGO-foxsports3-202302.png',
  128: '/logo/128-logos-ESPNPREMIUM-270625.svg',
  129: '/logo/129-logos-TNTSportsPremium-270625.svg',
  132: '/logo/132-logo-GOLF-20200616.png',
  133: '/logo/133-logos-TURBO-2705.png',
  169: '/logo/169.png', // Golden
  184: '/logo/184.png',
  301: '/logo/201-cinecanal.png', // Cinecanal
  500: '/logo/195-logos-DISNEYHD-2705.png', // Disney Channel
  503: '/logo/197-logo-DISCOVERYKIDSHD-03082017.png', // Discovery Kids
  501: '/logo/198-disneyjr-web20240808.png', // Disney Junior
  357: '/logo/200-logos-AXN-2705.png', // AXN
  211: '/logo/211-logos-TNT-2705.png',
  215: '/logo/215-logos-AMC-3006.png',
  217: '/logo/217-logos-FX-2705.png',
  306: '/logo/219-logos-MUNDOFOX-2705.png', // Cine.ar
  220: '/logo/220-logos-FILMANDARTS-2705.png',
  221: '/logo/221-logos-A&E-2705.png',
  222: '/logo/222.png',
  510: '/logo/300-logos-PAKAPAKA-2705.png', // PakaPaka
  404: '/logo/404-logos-GOURMET-2705.png',
  406: '/logo/406-logos-E-2705.png',
  416: '/logo/416-logos-UNIFE-20220308.png', // Unife
  402: '/logo/402.png',
  451: '/logo/451-logo-ANIMALPLANET-08032019.png',
  452: '/logo/452-logo-DISCOVERY2019.png',
  453: '/logo/453-homeAndHealth-202205.png',
  454: '/logo/454-logos-HISTORY-2705.png',
  456: '/logo/456-logos-NATIONALGEOGRAPHIC-2705.png',
  457: '/logo/457-logo_TCL_010722.png',
  458: '/logo/458-LOGO-hgtv.png',
  459: '/logo/459-logos-SCIENCE-2705.png',
  750: '/logo/501-logos-MTV-2705.png', // MTV
  // 509: '/logo/509-CM-20210128.png',
  604: '/logo/604-logos-RAI-2705.png', // Discovery World
  605: '/logo/605.png', // Nat Geo
  2000: '/logo/2000.png',
  2001: '/logo/2001.jpg', // Zoo Moo
  300: '/logo/204.png', // Cinemax
  310: '/logo/2002.png', // USA Network
  23: '/logo/23.png', // Señal Maria
  408: '/logo/150.svg',
  409: '/logo/153.svg',
  410: '/logo/152.svg',
  412: '/logo/154.svg',
  413: '/logo/155.svg',
  414: '/logo/156.svg',
  411: '/logo/157.svg',
  177: '/logo/177.png',
  183: '/logo/183.png', // Theater HD
  308: '/logo/209.png', // Space
  212: '/logo/212.png',
  213: '/logo/213.png',
  214: '/logo/214.png',
  309: '/logo/216.png',
  218: '/logo/218.png',
  506: '/logo/301.png', // Cartoonito
  302: 'logo/205-LOGO_STAR_CHANNEL.svg', // Star Channel
  312: '/logo/203.png', // Eurochannel
  507: '/logo/302.png', // Cartoon Network
  505: '/logo/307.png', // Baby TV
  511: '/logo/309.png', // Tooncast
  509: '/logo/311.jpg', // Nick Jr
  401: '/logo/401.png',
  403: '/logo/403.png',
  410: '/logo/410.png', // HBO Plus
  461: '/logo/461.png', // History 2
  508: '/logo/193-logo-NICKHD-11.png', // Nickelodeon
  751: '/logo/508.png', // Nickelodeon
  600: '/logo/600.png', // Discovery Channel
  602: '/logo/602.png', // Discovery Science
  603: '/logo/603.png',
  608: '/logo/608.png',
  609: '/logo/609.png', // History Channel
  610: '/logo/610.png', // DW
  611: '/logo/220-logos-FILMANDARTS-2705.png', // Film and Arts
  6110: '/logo/611.png', // Arirang
  612: '/logo/612.png', // Arirang
  2003: '/logo/2003.png', // Universal
  2004: '/logo/2004.png', // Studio Universal
  2005: '/logo/2005.png',
  2006: '/logo/2006.png', // Golden Plus
  2007: '/logo/2007.png', // Cine Familiar
  2008: '/logo/2008.png', // Cine Premium
  2009: '/logo/2009.png', // Love Nature
  2010: '/logo/2010.png', // Telenovelas
  2011: '/logo/2011.jpg', // 24H
  2012: '/logo/2012.png', // Telehit Musica
  2013: '/logo/2013.png', // Telehit Plus
  2014: '/logo/2014.webp', // NBA TV
  2015: '/logo/2015.webp', // Golf Channel
  2016: '/logo/2016.webp', // TyC Internacional
  2017: '/logo/2017.webp', // America Sports
  2020: '/logo/2020.webp', // Dreamworks
  2025: '/logo/2025.png', // Kidoo
  2033: '/logo/2033.webp', // A3 Series
  2034: '/logo/2034.webp', // A3 Cine
  2035: '/logo/2035.webp',
  2036: '/logo/2036.webp',
  2037: '/logo/2037.webp',
  2042: '/logo/2042.webp', // Paramount
  2051: '/logo/2051.webp', // Universal Premiere
  2052: '/logo/2052.webp', // Universal Cinema
  2053: '/logo/2053.webp', // Universal Comedy
  2054: '/logo/2054.webp', // Universal Crime
  2055: '/logo/2055.webp', // Universal Reality
  2058: '/logo/2058.webp',
  2062: '/logo/2062.png', // Canal Luz
  2065: '/logo/2065.webp', // Vorterix
  2066: '/logo/2066.webp', // Allegro HD
  2067: '/logo/2067.webp', // MTV 00
  2069: '/logo/2069.webp', // MTV Hits
  2070: '/logo/2070.webp', // Nickmusic
  2075: '/logo/2075.webp', // Bloomberg
  2078: '/logo/2078.webp',
  2080: '/logo/2080.webp', // Al Jazeera
  2085: '/logo/2085.webp', // Antena 3
  2089: '/logo/2089.webp', // Argentinísima
  305: '/logo/211-logos-TNT-2705.png', // TNT
  314: '/logo/2035.webp', // DHE
  315: '/logo/213.png', // Volver
  350: '/logo/214.png', // Warner HD
  351: '/logo/177.png', // Adult Swim
  352: '/logo/208-logos-SONY-08082019.png', // Sony Channel
  354: '/logo/217-logos-FX-2705.png', // FX
  355: '/logo/215.png', // AMC
  356: '/logo/212.png', // TNT Series
  360: '/logo/2036.webp', // Pasiones
  361: '/logo/222.png', // Comedy Central
  362: '/logo/402.png', // Investigation Discovery
  363: '/logo/215-logos-AMC-3006.png', // AMC Series
  365: '/logo/2037.webp', // Telemundo HD
  366: '/logo/221-logos-A&E-2705.png', // A&E
  407: '/logo/150.svg', // HBO HD
  504: '/logo/2000.png', // Plim Plim
  601: '/logo/453-homeAndHealth-202205.png', // Discovery H&H
  607: '/logo/451-logo-ANIMALPLANET-08032019.png', // Animal Planet
  651: '/logo/457-logo_TCL_010722.png', // TLC
  653: '/logo/404-logos-GOURMET-2705.png', // El Gourmet
  654: '/logo/218.png', // Lifetime
  655: '/logo/403.png', // Food Network
  658: '/logo/2058.webp', // Hola TV
  700: '/logo/412-logos-A-CULTURA-2705.png', // Canal A
  701: '/logo/406-logos-E-2705.png', // E! Entertainment
  704: '/logo/401.png', // Canal Rural
  752: '/logo/509-CM-20210128.png', // CM
  753: '/logo/510-logos-QUIERO-2705.png', // Quiero Musica
  800: '/logo/609.png', // CNN en Español
  801: '/logo/608.png', // CNN Internacional
  803: '/logo/2078.webp', // BBC World News
  804: '/logo/605.png', // TVE
  805: '/logo/604-logos-RAI-2705.png', // RAI
  806: '/logo/603.png', // France 24
  2038: null, // TBS
  2071: '/logo/2016.webp', // Flow Music XP
  2072: '/logo/2016.webp', // Flow Music 1
  2073: '/logo/2016.webp', // Flow Music 2
  2074: '/logo/2016.webp', // Flow Music 3
  2081: null, // Euronews
  2087: null, // Bandeirantes
  2088: null, // Rede Record
}

// Images are resolved directly from CHANNEL_IMAGE_BY_NUMBER by channel `number`.
// If a channel number is not present in the map, the `image` will be `null`.

type ChannelCategory = 'GENERAL' | 'SPORTS' | 'KIDS' | 'MOVIES' | 'DOCUMENTARY' | 'MUSIC' | 'NEWS'| 'VARIETY' | 'OTHER';

function createChannel(config: {
  id: string
  name: string
  shortName: string
  color: string
  number: number
  keyId: string
  key: string
  path: string
  fallback?: { url: string; keyId: string; key: string },
  category?: ChannelCategory,
}): Channel {
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    color: config.color,
    number: config.number,
    image: CHANNEL_IMAGE_BY_NUMBER[config.number] ?? null,
    keyId: config.keyId,
    key: config.key,
    getManifestUrl: () => buildGigaredManifest(config.path),
    fallback: config.fallback,
    category: config.category,
  }
}

function createCvattvChannel(config: {
  id: string
  name: string
  shortName: string
  color: string
  number: number
  keyId: string
  key: string
  url: string
  category?: ChannelCategory
}): Channel {
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    color: config.color,
    number: config.number,
    image: CHANNEL_IMAGE_BY_NUMBER[config.number] ?? null,
    keyId: config.keyId,
    key: config.key,
    getManifestUrl: () => config.url,
    category: config.category,
  }
}

const channelsRaw: Channel[] = [
  createChannel({
    id: 'america-tv',
    name: 'America TV',
    shortName: 'America',
    color: '#4f86f7',
    number: 2,
    keyId: '32392e5868873c91ca77a0406b3d32d8',
    key: '0f74f66dbeda0bb43b32445ea74d2087',
    path: '/live/eds/AmericaTV/sa_live_dash/AmericaTV.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/AmericaTV/SA_Live_dash_cenc/AmericaTV.mpd', keyId: '8ea235ce0826408b221c498115a9b62d', key: '7aa9266ed91ea4510483370029dfcf45' },
  }),
  createChannel({
    id: 'telefe',
    name: 'Telefe',
    shortName: 'Telefe',
    color: '#00a8e8',
    number: 11,
    keyId: '865b35fdb4c119f3ccfd4ee392928aef',
    key: 'b43adf6d88b3befbf7f69a71dc273e46',
    path: '/live/eds/Telefe/sa_live_dash/Telefe.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/TelefeHD/SA_Live_dash_cenc/TelefeHD.mpd', keyId: '3cec1b1ea9799dda5596e64f37e5ed20', key: 'c69f3afde2085dcaaaddbf55246a0323' },
  }),
  createChannel({
    id: 'tv-publica',
    name: 'TV Publica',
    shortName: 'TVP',
    color: '#0f766e',
    number: 7,
    keyId: 'f50f7ac8cca2bcb40bf4a895b6378cea',
    key: '0ca9392a44d0c0ff79abc01c15df8888',
    category: 'GENERAL',
    path: '/live/eds/TV_Publica/sa_live_dash/TV_Publica.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Canal7/SA_Live_dash_cenc/Canal7.mpd', keyId: 'cc8c82ac2ec7e9799527c29db7354e81', key: 'cc4aae173dd2ef17ae26be3f7ae87662' },
  }),
  createChannel({
    id: 'canal-9',
    name: 'Canal 9',
    shortName: 'C9',
    color: '#f97316',
    number: 9,
    keyId: 'eaecaad505a66fab4161959099767384',
    key: 'ca66afd7ba0f3ce767b698b5e94c84e3',
    category: 'GENERAL',
    path: '/live/eds/Canal_9/sa_live_dash/Canal_9.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/Canal9/SA_Live_dash_cenc/Canal9.mpd', keyId: '24f4ff211136ae6512a1b552200db405', key: '602122f8426c5c942b8c18d299cc6020' },
  }),
  createChannel({
    id: 'tn',
    name: 'TN',
    shortName: 'TN',
    color: '#dc2626',
    number: 100,
    keyId: 'c5bb6f9ef3b632b7ba2797048b4941a0',
    key: '53f33a7ab0729daee5dbe8ecc8ee2c08',
    category: 'GENERAL',
    path: '/live/eds/TN/sa_live_dash/TN.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/TodoNoticias/SA_Live_dash_cenc/TodoNoticias.mpd', keyId: '7ceb1cd0622cd7e88fcdc99fe3a55de6', key: '951637093d41c7388a1ef3f620cfea21' },
  }),
  createChannel({
    id: 'lnmas',
    name: 'LN+',
    shortName: 'LN+',
    color: '#2563eb',
    number: 101,
    keyId: 'ffbe99278cd1aea87b3506d1c06defd6',
    key: 'fa8d96b8c2d97390ab329241a4e651ae',
    path: '/live/eds/LNmas/sa_live_dash/LNmas.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/La_Nacion/SA_Live_dash_cenc/La_Nacion.mpd', keyId: 'f4eade7bbc39b25402acfa301bbad04a', key: 'a74d1df4235a74878327aa8d53ff283c' },
  }),
  createChannel({
    id: 'c5n',
    name: 'C5N',
    shortName: 'C5N',
    color: '#0ea5e9',
    number: 102,
    keyId: 'a4b47d87494bd17dd7acf86ebb6c3a32',
    key: '5df76e3d86d8d88799c52eae263d08b0',
    path: '/live/eds/C5N/sa_live_dash/C5N.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/C5N/SA_Live_dash_cenc/C5N.mpd', keyId: '050df5c6e78c774e78c3e99eef8a1b29', key: '0e4141d6ab21a36cbc4da777ab3096d4' },
  }),
  createChannel({
    id: 'cronica-tv',
    name: 'Cronica TV',
    shortName: 'Cronica',
    color: '#be123c',
    number: 104,
    keyId: '2932730b9b35ad5ded0e4d96af122676',
    key: '57f01dd4f21f8786352399c80d36caf8',
    path: '/live/eds/CronicaTV/sa_live_dash/CronicaTV.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/CronicaTV/SA_Live_dash_cenc/CronicaTV.mpd', keyId: '745e7abcc90d41ab706b2ac2f4371da3', key: '50acd9d19d1361cb4a8a13a867bdc352' },
  }),
  createChannel({
    id: 'canal-26',
    name: 'Canal 26',
    shortName: 'Canal 26',
    color: '#334155',
    number: 103,
    keyId: 'e9a29d60110b731c5f3a141084379a40',
    key: '8dcb1a09a6007fe72d621a09017276ba',
    path: '/live/eds/Canal26/sa_live_dash/Canal26.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/26_TV_HD/SA_Live_dash_cenc/26_TV_HD.mpd', keyId: 'e32aaa4b67430b3b51be1efce5a74ac5', key: 'ad60c5e1d378a97271bf8688f094d092' },
  }),
  createChannel({
    id: 'a24',
    name: 'A24',
    shortName: 'A24',
    color: '#2563eb',
    number: 105,
    keyId: 'c43779fa115f80c118c29665cc78e4ba',
    key: '4303ea7157eb2e6f6ce980bb87183825',
    path: '/live/eds/A24/sa_live_dash/A24.mpd',
    category: 'GENERAL',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/America24/SA_Live_dash_cenc/America24.mpd', keyId: '3b1b027dd011af20fd9956c16dc084fb', key: '45f75aacf06593c9b693fe427c67e5b8' },
  }),
  createChannel({
    id: 'deportv',
    name: 'DeporTV',
    shortName: 'DeporTV',
    color: '#16a34a',
    number: 209,
    keyId: '5f8bcea8ec9fdd5e6927e46ce856824b',
    key: '3cf09d0c9ebeab2edfe600887e61b368',
    path: '/live/eds/DeporTV/sa_live_dash/DeporTV.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/DeporTVHD/SA_Live_dash_cenc/DeporTVHD.mpd', keyId: 'f362097815892a4b83950f1d106ff0b2', key: '4349e42e81c31a8389f4a42fcd298928' },
  }),
  createChannel({
    id: 'tyc-sports',
    name: 'TyC Sports',
    shortName: 'TyC',
    color: '#8b5cf6',
    number: 207,
    keyId: 'cac7b52cb14661fe3db0449020791d97',
    key: '0c2780acce4ef9d7334ef25be445ceb4',
    path: '/live/eds/TyC_Sports/sa_live_dash/TyC_Sports.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/TyCSport/SA_Live_dash_cenc/TyCSport.mpd', keyId: '2b21c8fa9a329cce311a4c4a4aa996a1', key: 'cc23ea1fb32629f9e1f48c8deeae3e5b' },
  }),
  createChannel({
    id: 'espn',
    name: 'ESPN',
    shortName: 'ESPN',
    color: '#f97316',
    number: 200,
    keyId: '8b55a3ba068f882f49b36d216f29506f',
    key: '77f418bbcfc73739ebca9c52321472d3',
    path: '/live/eds/ESPN/sa_live_dash/ESPN.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/ESPNHD/SA_Live_dash_cenc/ESPNHD.mpd', keyId: 'cc8d44406ed6bf1898ad9f7a2d64f29e', key: 'fb85d059687ab0fc67805806204edbdf' },
  }),
  createChannel({
    id: 'espn-2',
    name: 'ESPN 2',
    shortName: 'ESPN 2',
    color: '#dc2626',
    number: 201,
    keyId: '02819f905f4e126d492693e44c688b82',
    key: 'a12adec960cd1e33ad3b8ddbf0dd22b9',
    path: '/live/eds/ESPN2/sa_live_dash/ESPN2.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/ESPN2HD/SA_Live_dash_cenc/ESPN2HD.mpd', keyId: 'e884b711ab111beb8a7ba1e7bcbdc9bf', key: 'cb89ee3961599e3e648a5aad60895f34' },
  }),
  createChannel({
    id: 'espn-3',
    name: 'ESPN 3',
    shortName: 'ESPN 3',
    color: '#ef4444',
    number: 202,
    keyId: 'ad0c72e30648501377425a62a2bf095c',
    key: '2cfbc73f423203a9fc8a1d983ec4e8bb',
    category: 'SPORTS',
    path: '/live/eds/ESPN3/sa_live_dash/ESPN3.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/ESPN3/SA_Live_dash_cenc/ESPN3.mpd', keyId: 'f4c9f97e2a36feab0e5077f2b44cbc4e', key: '1743cd03dfe3736b2c95da91a783af38' },
  }),
  createChannel({
    id: 'espn-4',
    name: 'ESPN 4',
    shortName: 'ESPN 4',
    color: '#f59e0b',
    number: 203,
    keyId: 'ecafef3b8979c737d05ea191a02b7617',
    key: 'f46cd12052b0da221a3a178e2bde0162',
    category: 'SPORTS',
    path: '/live/eds/ESPN4/sa_live_dash/ESPN4.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/ESPN4/SA_Live_dash_cenc/ESPN4.mpd', keyId: '24f2b3e741f0d9e9a8d516faff38bddc', key: 'bbd3fd02fb104e1463ac528a13f67e4a' },
  }),
  createChannel({
    id: 'fox-sports',
    name: 'Fox Sports',
    shortName: 'Fox',
    color: '#16a34a',
    number: 204,
    keyId: '6c0016fff15fcc3cc5d103f821189100',
    key: '94d789ac388ccbbfbd2cf91d5b7db028',
    category: 'SPORTS',
    path: '/live/eds/Fox_Sports/sa_live_dash/Fox_Sports.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/FoxSports/SA_Live_dash_cenc/FoxSports.mpd', keyId: 'cbc2a0c7a38df0aa3333cd71841d3b0d', key: 'aac61b730e2ac1df23f1e872e7541c1b' },
  }),
  createChannel({
    id: 'fox-sports-2',
    name: 'Fox Sports 2',
    shortName: 'Fox 2',
    color: '#22c55e',
    number: 205,
    keyId: 'a2e448d00073c0a66e02caa20a2fe135',
    key: '70e9e4adfb2f0b5ac127654c1a56d238',
    path: '/live/eds/Fox_Sports_2/sa_live_dash/Fox_Sports_2.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/FoxSports2HD/SA_Live_dash_cenc/FoxSports2HD.mpd', keyId: 'c98ddffc470fe449ae1a8d6492116976', key: '5086d370e840010232cf4532b16e197f' },
  }),
  createChannel({
    id: 'fox-sports-3',
    name: 'Fox Sports 3',
    shortName: 'Fox 3',
    color: '#34d399',
    number: 206,
    keyId: 'f2f0d2f5e823bf3bd1113ed83b244c57',
    key: 'addd4c11afb303beb21f95f79a935561',
    path: '/live/eds/Fox_Sports_3/sa_live_dash/Fox_Sports_3.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/FoxSports3HD/SA_Live_dash_cenc/FoxSports3HD.mpd', keyId: '55b47390cf9e4997dae6dac85e057875', key: 'fa39e855543c5d70f30600d59e5e4c1b' },
  }),
  createChannel({
    id: 'el-garage',
    name: 'El Garage',
    shortName: 'Garage',
    color: '#92400e',
    number: 208,
    keyId: 'c44389e1e90fb4d80e0a0d8090f8da1f',
    key: '7bdf6460869276e70bd3eae576be2286',
    path: '/live/eds/El_Garage/sa_live_dash/El_Garage.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/El_Garage/SA_Live_dash_cenc/El_Garage.mpd', keyId: '03d1dfb8df034d8b81e57753df00a36d', key: '08d83660db4a73bb1d61d60b09df5f4d' },
  }),
  createChannel({
    id: 'discovery-turbo',
    name: 'Discovery Turbo',
    shortName: 'Turbo',
    color: '#475569',
    number: 210,
    keyId: '55b1aff18cff06f311d2f53145c0a748',
    key: '7556d7b06fa5f94c7501c8956a764931',
    path: '/live/eds/Discovery_Turbo/sa_live_dash/Discovery_Turbo.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/DiscoveryTurbo/SA_Live_dash_cenc/DiscoveryTurbo.mpd', keyId: 'a611ddbf8c15fa617a0c391cb7b3e128', key: '0cd1300baf8890380fd41124962195c4' },
  }),
  createChannel({
    id: 'espn-premium',
    name: 'ESPN Premium',
    shortName: 'ESPN+',
    number: 251,
    color: '#cc0000',
    keyId: 'dca96877c202470bdad9839bea525c0a',
    key: 'd651871131d4b26f0095bcb9771b8f2f',
    category: 'SPORTS',
    path: '/live/eds/ESPN_Premium/sa_live_dash/ESPN_Premium.mpd',
  }),
  createChannel({
    id: 'tnt-sports',
    name: 'TNT Sports',
    shortName: 'TNT',
    color: '#0033cc',
    number: 250,
    keyId: 'f26eb059fb0854f4d4218c895d7ae803',
    key: 'ffcb3fd4bd5657889215be4cb6275d1b',
    path: '/live/eds/TNT_Sports_Premium/sa_live_dash/TNT_Sports_Premium.mpd',
    category: 'SPORTS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/TNT_Sports_HD/SA_Live_dash_cenc/TNT_Sports_HD.mpd', keyId: 'bc80fa3da696e503f940fde5f681a1c5', key: 'ea46e4e9f1132e8dd71fb77f7d55058a' },
  }),
  createChannel({
    id: 'paka-paka',
    name: 'PakaPaka',
    shortName: 'PakaPaka',
    color: '#fb7185',
    number: 510,
    keyId: '0aa7687e39e7e7e2e3d64d87a2fa1920',
    key: '523cc84985fadae95289dd88838133c9',
    category: 'KIDS',
    path: '/live/eds/PakaPaka/sa_live_dash/PakaPaka.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/PAKA_PAKA/SA_Live_dash_cenc/PAKA_PAKA.mpd', keyId: '334001b2f2644df9bdf35e92d2b89f8f', key: '475ec87d86ed0636dbb6d6d9d4a43bb7' },
  }),
  createChannel({
    id: 'disney-channel',
    name: 'Disney Channel',
    shortName: 'Disney',
    color: '#f59e0b',
    number: 500,
    keyId: '629f78368829802ade506b8f03e2d18b',
    key: '6824ea53d6fd70d146b9e31a57cf3a20',
    path: '/live/eds/Disney_Channel/sa_live_dash/Disney_Channel.mpd',
    category: 'KIDS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/DisneyChannelHD/SA_Live_dash_cenc/DisneyChannelHD.mpd', keyId: '4a742e478d14023e1993e011d9415f94', key: '0df77ede9bc744376836d21afa137dda' },
  }),
  createChannel({
    id: 'disney-junior',
    name: 'Disney Junior',
    shortName: 'Disney Jr',
    color: '#f472b6',
    number: 501,
    keyId: '0eabe9f5aee4020c50f52a2bf476ac57',
    key: '490fc8a1a900893d20631da45412879d',
    path: '/live/eds/Disney_Junior/sa_live_dash/Disney_Junior.mpd',
    category: 'KIDS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/DisneyJr/SA_Live_dash_cenc/DisneyJr.mpd', keyId: 'bd29c4a538f28845ce33581111749428', key: '46d9589f41a11c3637c07c604956deac' },
  }),
  createChannel({
    id: 'nickelodeon',
    name: 'Nickelodeon',
    shortName: 'Nick',
    color: '#facc15',
    number: 508,
    keyId: '611595b6387cdcfb67ce564768fd61aa',
    key: 'dd5fba9ab529822129c09c029b28651c',
    path: '/live/eds/Nickelodeon/sa_live_dash/Nickelodeon.mpd',
    category: 'KIDS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/Nickelodeon/SA_Live_dash_cenc/Nickelodeon.mpd', keyId: '61c18cefecc2d067beaa9ff181305345', key: '38d6f650cbf9a38fd9f35c01f98e647a' },
  }),
  createChannel({
    id: 'discovery-kids',
    name: 'Discovery Kids',
    shortName: 'DK',
    color: '#a855f7',
    number: 503,
    keyId: '1f92dc6055aefecb8a2abdba9ecf65cb',
    key: '23a68bb309729298ceb3b5fcd3ff174d',
    path: '/live/eds/Discovery_Kids/sa_live_dash/Discovery_Kids.mpd',
    category: 'KIDS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Discovery_Kids/SA_Live_dash_cenc/Discovery_Kids.mpd', keyId: 'ffb2f0f63c23a3592d4653e938b9ca19', key: 'd3661ae881fc55fc7a15815cd439747b' },
  }),
  createChannel({
    id: 'plim-plim',
    name: 'Plim Plim',
    shortName: 'Plim Plim',
    color: '#ec4899',
    number: 504,
    keyId: '44292917d1f5519af4598ccfc66b53dd',
    key: 'f90cee2e43e02176113cff8ccf09465e',
    path: '/live/eds/Plim_Plim/sa_live_dash/Plim_Plim.mpd',
    category: 'KIDS',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Plim_Plim/SA_Live_dash_cenc/Plim_Plim.mpd', keyId: '8e88e1572dcd2b31a10026668d628d61', key: 'ab95bdc2655aff4f4a8e512fb68c80df' },
  }),
  createChannel({
    id: 'zoo-moo',
    name: 'Zoo Moo',
    shortName: 'Zoo Moo',
    color: '#10b981',
    number: 2001,
    keyId: '8fe8869466801cac2f84dcc6c3584d76',
    key: 'd6c878a3c04face66707d817ec62d628',
    category: 'KIDS',
    path: '/live/eds/Zoo_Moo/sa_live_dash/Zoo_Moo.mpd',
  }),
  createChannel({
    id: 'cine-ar',
    name: 'Cine.ar',
    shortName: 'Cine.ar',
    color: '#64748b',
    number: 306,
    keyId: 'ff87d23b45efc58ff6a7ad0f5fdef566',
    key: '0e84fa871d67fede2c5385b54b60b5dc',
    category: 'MOVIES',
    path: '/live/eds/Cine_ar/sa_live_dash/Cine_ar.mpd',
  }),
  createChannel({
    id: 'cinecanal',
    name: 'Cinecanal',
    shortName: 'Cinecanal',
    color: '#fb7185',
    number: 301,
    keyId: 'ed9cb36b2c7ab639bb5b8627b2e980e8',
    key: 'a0d844faf1c31330165393e43e0d3bd8',
    category: 'MOVIES',
    path: '/live/eds/Cinecanal/sa_live_dash/Cinecanal.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/CinecanalHD/SA_Live_dash_cenc/CinecanalHD.mpd', keyId: '6003e92dd0d9f548329015c9e15dd578', key: '213cf85cb5f9fe569757004a77e05948' },
  }),
  createChannel({
    id: 'tnt',
    name: 'TNT',
    shortName: 'TNT',
    color: '#2563eb',
    number: 305,
    keyId: '9d9e8eb8d97c4ff0dbfb02c3c417ae48',
    key: 'a426cb9e3ff4cac8b2e153ef54e69072',
    category: 'MOVIES',
    path: '/live/eds/TNT/sa_live_dash/TNT.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/TNT_HD_Arg/SA_Live_dash_cenc/TNT_HD_Arg.mpd', keyId: 'faad1722a575f4d9ec7b774db63c879c', key: 'cf0184830344ba36ad2ffef9dd2dd9d0' },
  }),
  createChannel({
    id: 'fx',
    name: 'FX',
    shortName: 'FX',
    color: '#f97316',
    number: 354,
    keyId: 'b060d6864d9b870b3a5f43c10370977c',
    key: '7a9104e80a2bd14429ad4c877a9926b5',
    category: 'MOVIES',
    path: '/live/eds/FX/sa_live_dash/FX.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/FXHD/SA_Live_dash_cenc/FXHD.mpd', keyId: '9ab9c42c713e0fb5517dc77cc19d6755', key: 'd8c271b82387e609b6c19e5e79240aff' },
  }),
  createChannel({
    id: 'star-channel',
    name: 'Star Channel',
    shortName: 'Star',
    color: '#7c3aed',
    number: 302,
    keyId: 'ba8e3594a2280a1f0b749d66dccfab99',
    key: 'efa66c01f0e96775398994f1754be46b',
    category: 'MOVIES',
    path: '/live/eds/Star_Channel/sa_live_dash/Star_Channel.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/FOXHD/SA_Live_dash_cenc/FOXHD.mpd', keyId: '8023e85ef9d17561ee1b424179b1b15e', key: '477ad189f1fcd2baec026068107f862f' },
  }),
  createChannel({
    id: 'sony-channel',
    name: 'Sony Channel',
    shortName: 'Sony',
    color: '#ef4444',
    number: 352,
    keyId: 'a2e6c6842391fd4d9dfe3c047e286eb4',
    key: '7d563478e5669d44cec9a6215052fec3',
    category: 'MOVIES',
    path: '/live/eds/Sony_Channel/sa_live_dash/Sony_Channel.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/SonyHD/SA_Live_dash_cenc/SonyHD.mpd', keyId: 'fd9619f9d7c2d5115a339941279e0b4b', key: 'bf55635e6591f905659fa27ab3ca2812' },
  }),
  createChannel({
    id: 'universal',
    name: 'Universal',
    shortName: 'Universal',
    color: '#0f172a',
    number: 2003,
    keyId: '281ed03234dce7e50391f9c4c7c90b48',
    key: '148c12b5c4526f3f7ab70f385cb36fac',
    category: 'MOVIES',
    path: '/live/eds/Universal/sa_live_dash/Universal.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Universal_Channel_HD/SA_Live_dash_cenc/Universal_Channel_HD.mpd', keyId: '6cf9a13d6fd65a0f2e1cee3969aab9f5', key: 'ea61c3c1adee71b5c2e9744e41d4b75f' },
  }),
  createChannel({
    id: 'axn',
    name: 'AXN',
    shortName: 'AXN',
    color: '#dc2626',
    number: 357,
    keyId: 'bac0cdbf2e5a82fb27818e30bc8b75e5',
    key: '478bda16b7bbb4d01928270159771bd9',
    category: 'MOVIES',
    path: '/live/eds/AXN/sa_live_dash/AXN.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/AXNHD/SA_Live_dash_cenc/AXNHD.mpd', keyId: '03e77b5bbf5135a85d587c5af2f2f730', key: '1dd1ab1938a791d03f09eb88478b4880' },
  }),
  createChannel({
    id: 'studio-universal',
    name: 'Studio Universal',
    shortName: 'Studio U',
    color: '#475569',
    number: 2004,
    keyId: '68987b791521decfbe5dd633a3c15dc5',
    key: 'cff99d15661b3e8393d9ac9dd9a89869',
    category: 'MOVIES',
    path: '/live/eds/Studio_Universal/sa_live_dash/Studio_Universal.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Studio_Universal/SA_Live_dash_cenc/Studio_Universal.mpd', keyId: 'd9b541e3cd064d569843da42788d4263', key: 'bba5d26ad5051fb3f2cf7e3dd8a4a7d8' },
  }),
  createChannel({
    id: 'ae',
    name: 'A&E',
    shortName: 'A&E',
    color: '#334155',
    number: 366,
    keyId: '0e45fe47af35c23962a3cc0ada9119f0',
    key: '84f178941bbcedca8d43926b69cca9b1',
    path: '/live/eds/AyE/sa_live_dash/AyE.mpd',
    category: 'MOVIES',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/AEHD/SA_Live_dash_cenc/AEHD.mpd', keyId: 'db12035627a4b3d7198b761f36b4a290', key: '80ca761a875992ac0e50b0851d5563fe' },
  }),
  createChannel({
    id: 'usa-network',
    name: 'USA Network',
    shortName: 'USA',
    color: '#2563eb',
    number: 310,
    keyId: '072f31c5b5238da0d3b54b2a79e7a7d9',
    category: 'MOVIES',
    key: '984532822dc6ff3be1ffc56b0686d290',
    path: '/live/eds/USA_Network/sa_live_dash/USA_Network.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/USA_Network/SA_Live_dash_cenc/USA_Network.mpd', keyId: 'c754b522b3b87dc2ba2da3e35154ec14', key: '141a51e9e83861ae99b4b217431710b3' },
  }),
  createChannel({
    id: 'amc',
    name: 'AMC',
    shortName: 'AMC',
    color: '#7c2d12',
    number: 355,
    keyId: 'd60a3128c3cbe6c2728ccca61f55a87f',
    key: '1cc37b6959b6f9e7f70532604d1e8ed1',
    category: 'MOVIES',
    path: '/live/eds/AMC/sa_live_dash/AMC.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/AMC/SA_Live_dash_cenc/AMC.mpd', keyId: '1fa6a86fd80b6d1425dde74482b5dc9c', key: '744c3636d57a651ab444cf9fe5f95b33' },
  }),
  createChannel({
    id: 'golden',
    name: 'Golden',
    shortName: 'Golden',
    color: '#f59e0b',
    number: 169,
    keyId: '384a49756e9d5247537404c487edf312',
    key: '72e31a1d402eb30584c541736267f478',
    category: 'MOVIES',
    path: '/live/eds/Golden/sa_live_dash/Golden.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Golden/SA_Live_dash_cenc/Golden.mpd', keyId: 'b7d085dbd4539afcc6a55445efb2b04e', key: '0a55fbe044fed379d1632b589265b571' },
  }),
  createChannel({
    id: 'sony-movies',
    name: 'Sony Movies',
    shortName: 'Sony M',
    color: '#be123c',
    number: 352,
    keyId: '4201cacd22f7a4f3bb6db354c9ac9d75',
    key: 'f43bbaf105697ac3f8ff4c69ee30967f',
    category: 'MOVIES',
    path: '/live/eds/Sony_Movies/sa_live_dash/Sony_Movies.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/Sony_Movies/SA_Live_dash_cenc/Sony_Movies.mpd', keyId: '88b9c41e72acd5b589bbfb4776969781', key: '43b9403f7a9e28fc2d7cbf10373b85aa' },
  }),
  createChannel({
    id: 'eurochannel',
    name: 'Eurochannel',
    shortName: 'Euro',
    color: '#8b5cf6',
    number: 312,
    keyId: 'ee22649f9cf24a09c8e2d7f527b61ab6',
    key: '5f4f4cf346468adb895a5b5d5edd9a72',
    category: 'MOVIES',
    path: '/live/eds/Eurochannel/sa_live_dash/Eurochannel.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Eurochannel/SA_Live_dash_cenc/Eurochannel.mpd', keyId: '6f0fc214d9844a7590f0884d55b44c42', key: 'b2fe1bb5f9c79035301c328c1e93b0ee' },
  }),
  createChannel({
    id: 'golden-plus',
    name: 'Golden Plus',
    shortName: 'Golden+',
    color: '#ca8a04',
    number: 2006,
    keyId: '2127eb2cb9152cb1a21815cf423b7114',
    key: '3a1715592b6916bb3c2e7e477c5441bd',
    category: 'MOVIES',
    path: '/live/eds/Golden_Plus/sa_live_dash/Golden_Plus.mpd',
  }),
  createChannel({
    id: 'investigation-discovery',
    name: 'Investigation Discovery',
    shortName: 'ID',
    color: '#6366f1',
    number: 362,
    keyId: '54c693fe580f7a376d3a4ffcbaff2377',
    key: '64f7f672af645bd14c26f598e65ca686',
    category: 'MOVIES',
    path: '/live/eds/Investigation_discovery/sa_live_dash/Investigation_discovery.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/ID/SA_Live_dash_cenc/ID.mpd', keyId: '0956caf2e2bd41f49fdcead7cc94fe24', key: '640c49578073a911938617eb4e652d6c' },
  }),
  createChannel({
    id: 'comedy-central',
    name: 'Comedy Central',
    shortName: 'Comedy',
    color: '#f43f5e',
    number: 361,
    keyId: 'e2ef982ad8e10b04abb16ecfe4deab17',
    key: 'c9ec0f4087a3cd993de0a0dcb0a8a86b',
    category: 'MOVIES',
    path: '/live/eds/Comedy_Central/sa_live_dash/Comedy_Central.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/ComedyCentral/SA_Live_dash_cenc/ComedyCentral.mpd', keyId: '4013f784c5ef4318ad47024e61eb094e', key: 'bad433a547f97c7f65cda5e83b8dd416' },
  }),
  createChannel({
    id: 'cine-familiar',
    name: 'Cine Familiar',
    shortName: 'Cine Fam',
    color: '#14b8a6',
    number: 2007,
    keyId: '721b4557143c8a37ec427423785875e5',
    key: '3b76efe869910f4d86012915422a5b89',
    category: 'MOVIES',
    path: '/live/eds/Cine_Familiar/sa_live_dash/Cine_Familiar.mpd',
  }),
  createChannel({
    id: 'cine-premium',
    name: 'Cine Premium',
    shortName: 'Cine Prem',
    color: '#0f766e',
    number: 2008,
    keyId: '670ffd29bd6ada72170188ed785f7e2f',
    key: '7fa7edadd763531e133bf4a1aef51ce3',
    category: 'MOVIES',
    path: '/live/eds/Cine_Premium/sa_live_dash/Cine_Premium.mpd',
  }),
  createChannel({
    id: 'telenovelas',
    name: 'Telenovelas',
    shortName: 'Telenovelas',
    color: '#fb7185',
    number: 2010,
    keyId: '214c0efa71c1ac68be8143b18e4a5a52',
    key: 'dbd58022cf2f0f6c69e979a54346cc8b',
    category: 'MOVIES',
    path: '/live/eds/Telenovelas/sa_live_dash/Telenovelas.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Telenovelas/SA_Live_dash_cenc/Telenovelas.mpd', keyId: '60cb38a05880cd0eb429f71398609540', key: 'c251aac7943c0d1324aa9a4129f3afd4' },
  }),
  createChannel({
    id: 'el-gourmet',
    name: 'El Gourmet',
    shortName: 'Gourmet',
    color: '#22c55e',
    number: 653,
    keyId: 'a9034121a55c5254270a7fc87e6b933c',
    key: '630f14e9ca88c92a25af19834bbf01d6',
    category: 'VARIETY',
    path: '/live/eds/El_Gourmet/sa_live_dash/El_Gourmet.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/Gourmet/SA_Live_dash_cenc/Gourmet.mpd', keyId: '93d853ac4c8e24cf0295f6f97ee53bd3', key: 'fa5817fab4fb054ccea1abb9f3d767ed' },
  }),
  createChannel({
    id: 'e-entertainment',
    name: 'E! Entertainment',
    shortName: 'E!',
    color: '#d946ef',
    number: 701,
    keyId: 'a67b85023aec0c096831b2b0373715fd',
    key: 'be97d3955e711dfa12237416a1b9ad52',
    category: 'VARIETY',
    path: '/live/eds/E_Entertainment/sa_live_dash/E_Entertainment.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/E_Entertainment_Television/SA_Live_dash_cenc/E_Entertainment_Television.mpd', keyId: '5883553207f13e3dc8cecd1113d5ba68', key: '45434d40636dfa0e5312b93218e02185' },
  }),
  createChannel({
    id: 'discovery-hyh',
    name: 'Discovery H&H',
    shortName: 'H&H',
    color: '#14b8a6',
    number: 601,
    keyId: '270233c3621c173ad74f16aa6ba367ac',
    key: 'b39c8748f7f7530b1591c3a2ee0a3703',
    category: 'VARIETY',
    path: '/live/eds/Discovery_HyH/sa_live_dash/Discovery_HyH.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/DiscoveryHomeHealthHD/SA_Live_dash_cenc/DiscoveryHomeHealthHD.mpd', keyId: '9b0a76dd7a0df1e1b4320aeb1254d1a9', key: 'd011267775c38d6d2ab09b428c03d63f' },
  }),
  createChannel({
    id: 'mas-chic',
    name: 'Mas Chic',
    shortName: 'Mas Chic',
    color: '#ec4899',
    number: 409,
    keyId: 'f4eafc89afd50886c0fc2cc733dc62d8',
    key: 'dd9be06d69c495b23952652b0f765892',
    category: 'VARIETY',
    path: '/live/eds/Mas_Chic/sa_live_dash/Mas_Chic.mpd',
  }),
  createChannel({
    id: 'tlc',
    name: 'TLC',
    shortName: 'TLC',
    color: '#ef4444',
    number: 651,
    keyId: '28f91c97b02842d14c2196467d9f22ec',
    key: '07167c215250ae056a8f5dfb9b80d3a4',
    category: 'VARIETY',
    path: '/live/eds/TLC/sa_live_dash/TLC.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/TLC/SA_Live_dash_cenc/TLC.mpd', keyId: '58761c7b2819491eb3a0d765842c341a', key: '9dabc48f88bd7f266734e57501bd6f47' },
  }),
  createChannel({
    id: 'love-nature',
    name: 'Love Nature',
    shortName: 'Love Nat',
    color: '#22c55e',
    number: 2009,
    keyId: '30c35033226fea72c04b3fbdd3fe67d5',
    key: 'fbf7d2dffa946cbf38ef329a5f31f795',
    category: 'VARIETY',
    path: '/live/eds/Love_Nature/sa_live_dash/Love_Nature.mpd',
  }),
  createChannel({
    id: 'unife',
    name: 'Unife',
    shortName: 'Unife',
    color: '#2563eb',
    number: 416,
    keyId: '7213abb07b0ce71bedc6ba337e168fa4',
    key: '317bc08ed843883a9397c61b22e1b60e',
    category: 'VARIETY',
    path: '/live/eds/Unife/sa_live_dash/Unife.mpd',
  }),
  createChannel({
    id: 'discovery-science',
    name: 'Discovery Science',
    shortName: 'DSC',
    color: '#38bdf8',
    number: 602,
    keyId: '26c0b72d115923133a5a9e4d4011819f',
    key: 'cf04154c74f09b1fd98115a9e04fcec6',
    category: 'VARIETY',
    path: '/live/eds/Discovery_Science/sa_live_dash/Discovery_Science.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Discovery_Science/SA_Live_dash_cenc/Discovery_Science.mpd', keyId: '46ba409fb04e40fb86b466d97e3a9588', key: 'f129fb9b5d213e20e2abe529b8cf2597' },
  }),
  createChannel({
    id: 'nat-geo',
    name: 'Nat Geo',
    shortName: 'Nat Geo',
    color: '#eab308',
    number: 605,
    keyId: 'aa5e6dae90f144937f1cf638460efe13',
    key: '284534e78bb04505bae9b484b2dc1537',
    path: '/live/eds/Nat_Geo/sa_live_dash/Nat_Geo.mpd',
    category: 'VARIETY',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/NatGeoHD/SA_Live_dash_cenc/NatGeoHD.mpd', keyId: '4be0c61ceddc62294cc9e23b627af53d', key: '852c1935d11c3c53d0a1ceff3bb3bf16' },
  }),
  createChannel({
    id: 'discovery-channel',
    name: 'Discovery Channel',
    shortName: 'Discovery',
    color: '#0ea5e9',
    number: 600,
    keyId: '142c0c050c551486e07bc210a1357da6',
    category: 'VARIETY',
    key: '0dbbc07185e4650e1a05dbbcb888909f',
    path: '/live/eds/Discovery_Channel/sa_live_dash/Discovery_Channel.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c3eds/DiscoveryHD/SA_Live_dash_cenc/DiscoveryHD.mpd', keyId: 'c283c84a7af0d7c8b9b612a8fb22a001', key: 'f45510c721eebd6eaa86a2e16ccbd77d' },
  }),
  createChannel({
    id: 'animal-planet',
    name: 'Animal Planet',
    shortName: 'Animal',
    color: '#84cc16',
    number: 607,
    keyId: '5eded9e86a760b6e23d1ce1d80b85484',
    key: '74e74a9ea3933219454c81f28ade93a8',
    category: 'VARIETY',
    path: '/live/eds/Animal_Planet/sa_live_dash/Animal_Planet.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/AnimalPlanet/SA_Live_dash_cenc/AnimalPlanet.mpd', keyId: '4146a8ecbb0540dc807c6389ee87e0bc', key: '0c3cdc1b3e4617c57361265e9fa4c5bd' },
  }),
  createChannel({
    id: 'hgtv',
    name: 'HGTV',
    shortName: 'HGTV',
    color: '#f472b6',
    number: 651,
    keyId: '75dab5c02f8c98acc2a461a99da99b7e',
    key: '01fbb96e5283f6706b102c8d8ad54c5c',
    category: 'VARIETY',
    path: '/live/eds/HGTV/sa_live_dash/HGTV.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/Home_and_Garden/SA_Live_dash_cenc/Home_and_Garden.mpd', keyId: '43bc6a87ee4f21aa320ba00b980a6fd8', key: 'bd55130539a30faa1d90b3142eebe0b2' },
  }),
  createChannel({
    id: 'history-channel',
    name: 'History Channel',
    shortName: 'History',
    color: '#92400e',
    number: 609,
    keyId: '0c14f56c92a97db5abb4b83da823f81f',
    key: '143a64606506c57b452bd9c8327bd6ff',
    category: 'VARIETY',
    path: '/live/eds/History_Channel/sa_live_dash/History_Channel.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c7eds/HistoryHD/SA_Live_dash_cenc/HistoryHD.mpd', keyId: 'e82318e518ba70cea3d7b37bef99e692', key: 'a05fcb634c071a514e3039e1c274b4db' },
  }),
  createChannel({
    id: 'canal-a',
    name: 'Canal A',
    shortName: 'Canal A',
    color: '#8b5cf6',
    number: 700,
    keyId: '097578fb861438a8deecc5643082997b',
    key: '3ac02ae9a503e76a58f1e94eebd5f43d',
    category: 'VARIETY',
    path: '/live/eds/CanalA/sa_live_dash/CanalA.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Canal_a/SA_Live_dash_cenc/Canal_a.mpd', keyId: '324ec73787744554ae1aef231a4f8f97', key: '677a040674d1d0eccef327269b222bae' },
  }),
  createChannel({
    id: 'film-and-arts',
    name: 'Film and Arts',
    shortName: 'F&A',
    color: '#f43f5e',
    number: 611,
    keyId: '940d79fb1961288803c64e60da991c5a',
    key: 'f55e18690327be6db3a1cf24b5be438b',
    category: 'MOVIES',
    path: '/live/eds/Film_and_Arts/sa_live_dash/Film_and_Arts.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Film_Arts/SA_Live_dash_cenc/Film_Arts.mpd', keyId: '91c540d350f34f5386f3f1c77f74001f', key: '54ee72810551da0cba0c45a8df651962' },
  }),
  createChannel({
    id: 'discovery-world',
    name: 'Discovery World',
    shortName: 'World',
    color: '#22c55e',
    number: 604,
    keyId: 'cea94fefef1ff96d4ab0e27fb846b0c3',
    key: '634b2496b64bffc426bd4093c5945ec3',
    category: 'OTHER',
    path: '/live/eds/Discovery_World/sa_live_dash/Discovery_World.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Discovery_World_HD/SA_Live_dash_cenc/Discovery_World_HD.mpd', keyId: '34ee94c2263345f7a3a590661264e490', key: '56757d656a697ab7a2e5e083b5d21bb5' },
  }),
  createChannel({
    id: 'rai',
    name: 'RAI',
    shortName: 'RAI',
    color: '#dc2626',
    number: 805,
    keyId: 'a2e6c6842391fd4d9dfe3c047e286eb4',
    key: '7d563478e5669d44cec9a6215052fec3',
    category: 'OTHER',
    path: '/live/eds/RAI/sa_live_dash/RAI.mpd',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/RAI/SA_Live_dash_cenc/RAI.mpd', keyId: 'd214547d7d9a4011a39a899ce6e70071', key: '16c2ed0617cf1e123f3af6ea8875a82d' },
  }),
  createChannel({
    id: 'tve',
    name: 'TVE',
    shortName: 'TVE',
    color: '#2563eb',
    number: 804,
    keyId: '40d5b3d7302d0d707e88ea1cb4b194b5',
    key: 'b0f99846a1680e9425e8c76aae57fb53',
    category: 'OTHER',
    path: '/live/eds/TVE/sa_live_dash/TVE.mpd',
  }),
  createChannel({
    id: '24h',
    name: '24H',
    shortName: '24H',
    color: '#0f172a',
    number: 2011,
    keyId: '91978d09e4feadcdcb15c1d670e149d3',
      key: '83f5a6f07b63a02157fffb9fc83e1c68',
      category: 'OTHER',
    path: '/live/eds/24H/sa_live_dash/24H.mpd',
  }),
  createChannel({
    id: 'mtv',
    name: 'MTV',
    shortName: 'MTV',
    color: '#ec4899',
    number: 750,
    keyId: '92a2837411c8be67f7ec1f79a7996750',
    key: '1ec313bd01d3f6d306fff11e4b032a1b',
    path: '/live/eds/MTV/sa_live_dash/MTV.mpd',
    category: 'MUSIC',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/MTV_HD/SA_Live_dash_cenc/MTV_HD.mpd', keyId: '0c9eb3ead38a122ac460ad96a8ebfd2e', key: '66bfbfa4449eb8bc1bcf7577d5bffaad' },
  }),
  createChannel({
    id: 'cm',
    name: 'CM',
    shortName: 'CM',
    color: '#22c55e',
    number: 752,
    keyId: '1713f5c8e140bc32fab3893341bd6bf6',
    key: '85dbe90fab4bca195924b7cb17bfc211',
    path: '/live/eds/CM/sa_live_dash/CM.mpd',
    category: 'MUSIC',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/CM/SA_Live_dash_cenc/CM.mpd', keyId: '682f36b5736f4560951ca14b80d29524', key: '3accb729067a39b3b8143f1b447b9d25' },
  }),
  createChannel({
    id: 'quiero-musica',
    name: 'Quiero Musica',
    shortName: 'Quiero',
    color: '#8b5cf6',
    number: 753,
    keyId: '8be45f648b2f5a27f6c16a8dce2c92e1',
    key: 'defd91f23137624fec9fe157d6adc1dd',
    path: '/live/eds/Quiero_Musica/sa_live_dash/Quiero_Musica.mpd',
    category: 'MUSIC',
    fallback: { url: 'https://cdn.cvattv.com.ar/live/c6eds/Quiero_HD/SA_Live_dash_cenc/Quiero_HD.mpd', keyId: 'a354b0c82a3a720c4a6f52ed5a1190f4', key: '45a76dcc84f058cfabc8b958d7303b28' },
  }),
  createChannel({
    id: 'telehit-musica',
    name: 'Telehit Musica',
    shortName: 'Telehit',
    color: '#06b6d4',
    number: 2012,
    keyId: 'f8837e4d7fdfaba5940310e719e12b99',
    key: '057a34cc85e38471e2a023b78ec79175',
    path: '/live/eds/Telehit_Musica/sa_live_dash/Telehit_Musica.mpd',
    category: 'MUSIC',
  }),
  createChannel({
    id: 'telehit-plus',
    name: 'Telehit Plus',
    shortName: 'Telehit+',
    color: '#0ea5e9',
    number: 2013,
    keyId: '6dcafee5775552f97891dfdada84df85',
    key: '089ae50f8036135e7e458292e44676b5',
    path: '/live/eds/Telehit_Plus/sa_live_dash/Telehit_Plus.mpd',
    category: 'MUSIC',
  }),

  // --- New channels from cvattv (cvattv-only source) ---

  // SPORTS
  createCvattvChannel({ id: 'nba-tv', name: 'NBA TV', shortName: 'NBA', color: '#1d4ed8', number: 2014, url: 'https://cdn.cvattv.com.ar/live/c6eds/NBA_TV/SA_Live_dash_cenc/NBA_TV.mpd', keyId: 'd0c38de3c9844e4e9f975dffb3eff8ad', key: '141ca0fdf6ebadfa7107576b8e09e117', category: 'SPORTS' }),
  createCvattvChannel({ id: 'golf-channel', name: 'Golf Channel', shortName: 'Golf', color: '#16a34a', number: 2015, url: 'https://cdn.cvattv.com.ar/live/c6eds/Golf_Channel/SA_Live_dash_cenc/Golf_Channel.mpd', keyId: '38d6226b7cd2cfa86b4b9cdaa455e7d7', key: '24f0ef2bf787647cc02df870417eed2b', category: 'SPORTS' }),
  createCvattvChannel({ id: 'tyc-internacional', name: 'TyC Internacional', shortName: 'TyC Intl', color: '#7c3aed', number: 2016, url: 'https://cdn.cvattv.com.ar/live/c3eds/TyC_Internacional/SA_Live_dash_cenc/TyC_Internacional.mpd', keyId: '58e1ebe75d944f6a98ea67b1c7c0a572', key: '1c311b069dbce31ce8e62a6e7e2433eb', category: 'SPORTS' }),
  createCvattvChannel({ id: 'america-sports', name: 'America Sports', shortName: 'Am Sports', color: '#4f86f7', number: 2017, url: 'https://cdn.cvattv.com.ar/live/c6eds/America_Sports/SA_Live_dash_cenc/America_Sports.mpd', keyId: 'a0aa01337a2148bda1e21862295ae037', key: 'fee0f87a0527497351fc54ce36ad1de2', category: 'SPORTS' }),
  // `KIDS`
  createCvattvChannel({ id: 'cartoon-network', name: 'Cartoon Network', shortName: 'Cartoon', color: '#f59e0b', number: 507, url: 'https://cdn.cvattv.com.ar/live/c3eds/CartoonNetwork/SA_Live_dash_cenc/CartoonNetwork.mpd', keyId: 'd7df56efaa36a71141d238854cc46d1d', key: '8abb2ee9150d8b2af8ebec0de0f833c8', category: 'KIDS' }),
  createCvattvChannel({ id: 'dreamworks', name: 'Dreamworks', shortName: 'DW Kids', color: '#0ea5e9', number: 2020, url: 'https://cdn.cvattv.com.ar/live/c7eds/Dreamworks/SA_Live_dash_cenc/Dreamworks.mpd', keyId: '7f30c43e47544412221fd64201d92f4b', key: 'f83d09d75a0946b1d71aa48c201b4d8b', category: 'KIDS' }),
  createCvattvChannel({ id: 'boomerang', name: 'Cartoonito', shortName: 'Boomerang', color: '#f97316', number: 506, url: 'https://cdn.cvattv.com.ar/live/c7eds/Boomerang/SA_Live_dash_cenc/Boomerang.mpd', keyId: '5792e613fceb699c79cbc0e75fe4cd37', key: 'a672793730476ed23e5c1bce2ff570c6', category: 'KIDS' }),
  createCvattvChannel({ id: 'baby-tv', name: 'Baby TV', shortName: 'Baby TV', color: '#ec4899', number: 505, url: 'https://cdn.cvattv.com.ar/live/c7eds/BabyTV/SA_Live_dash_cenc/BabyTV.mpd', keyId: '9e09f0a3ecb932582e0f3bc6a6194c8d', key: '6d2363b7ba7680ea3bf6dcbad1efa5bf', category: 'KIDS' }),
  createCvattvChannel({ id: 'tooncast', name: 'Tooncast', shortName: 'Tooncast', color: '#8b5cf6', number: 511, url: 'https://cdn.cvattv.com.ar/live/c6eds/Tooncast/SA_Live_dash_cenc/Tooncast.mpd', keyId: '10638a722eb54c64bfb0e7a77483686a', key: '41a7d3d522e19215b7e8f611b6902d61', category: 'KIDS' }),
  createCvattvChannel({ id: 'nick-jr', name: 'Nick Jr', shortName: 'Nick Jr', color: '#facc15', number: 509, url: 'https://cdn.cvattv.com.ar/live/c6eds/Nick_Jr/SA_Live_dash_cenc/Nick_Jr.mpd', keyId: 'e824b2277a86fd6adfc40aa948e5064a', key: '28da2dbbe8e1a1463bbb23895b922083', category: 'KIDS' }),
  createCvattvChannel({ id: 'kidoo', name: 'Kidoo', shortName: 'Kidoo', color: '#a855f7', number: 2025, url: 'https://cdn.cvattv.com.ar/live/c6eds/Kidoo/SA_Live_dash_cenc/Kidoo.mpd', keyId: 'dcd89337a501ab929c01a039774089dc', key: 'e96cc7be9139a8d581b3f5eebebfc10d', category: 'KIDS' }),

  // MOVIES & SERIES
  createCvattvChannel({ id: 'cinemax', name: 'Cinemax', shortName: 'Cinemax', color: '#0f172a', number: 300, url: 'https://cdn.cvattv.com.ar/live/c6eds/Cinemax/SA_Live_dash_cenc/Cinemax.mpd', keyId: '977928a92b82ba3781741a6470f8f45b', key: '51f4e62827c128f7210b79a11587661a', category: 'MOVIES' }),
  createCvattvChannel({ id: 'volver', name: 'Volver', shortName: 'Volver', color: '#7c3aed', number: 315, url: 'https://cdn.cvattv.com.ar/live/c6eds/Volver/SA_Live_dash_cenc/Volver.mpd', keyId: '194e53184a424ce6989ad82c5f28fbc5', key: '65d60c5cc4de031172be0a6a51edbdfe', category: 'MOVIES' }),
  createCvattvChannel({ id: 'space', name: 'Space', shortName: 'Space', color: '#1e293b', number: 308, url: 'https://cdn.cvattv.com.ar/live/c3eds/Space/SA_Live_dash_cenc/Space.mpd', keyId: '0942e4ecd1bd3567e8f9447f45c20a12', key: 'efca6264f04cf7373de0c30ec79fe909', category: 'MOVIES' }),
  createCvattvChannel({ id: 'tnt-series', name: 'TNT Series', shortName: 'TNT Ser', color: '#2563eb', number: 356, url: 'https://cdn.cvattv.com.ar/live/c3eds/TNTSeries/SA_Live_dash_cenc/TNTSeries.mpd', keyId: '5c14d6aeb19bf113edf91a7b544253cb', key: '8d776d6f9c5c840ebe88d767dd731692', category: 'MOVIES' }),
  createCvattvChannel({ id: 'warner-hd', name: 'Warner HD', shortName: 'Warner', color: '#1d4ed8', number: 350, url: 'https://cdn.cvattv.com.ar/live/c7eds/WarnerHD/SA_Live_dash_cenc/WarnerHD.mpd', keyId: '069bd3f0b6c279467e08549f17bf5bd0', key: '5afa7e369a6de1093818a85af912a775', category: 'MOVIES' }),
  createCvattvChannel({ id: 'amc-series', name: 'AMC Series', shortName: 'AMC Ser', color: '#7c2d12', number: 363, url: 'https://cdn.cvattv.com.ar/live/c6eds/AMC_Series/SA_Live_dash_cenc/AMC_Series.mpd', keyId: '10d3d4f33a6bad277accc2688c46b406', key: '588fd56bcab1fcdb4f33b5c2f7018d29', category: 'MOVIES' }),
  createCvattvChannel({ id: 'a3-series', name: 'A3 Series', shortName: 'A3 Ser', color: '#dc2626', number: 2033, url: 'https://cdn.cvattv.com.ar/live/c7eds/A3_Series/SA_Live_dash_cenc/A3_Series.mpd', keyId: '5e34e08ae5ae440f01a03e505dd24a57', key: 'ed30cc7f5040a75d73f619320249272b', category: 'MOVIES' }),
  createCvattvChannel({ id: 'a3-cine', name: 'A3 Cine', shortName: 'A3 Cine', color: '#be123c', number: 2034, url: 'https://cdn.cvattv.com.ar/live/c7eds/A3_Cine/SA_Live_dash_cenc/A3_Cine.mpd', keyId: 'd6ff881a6f07986a80d6ad6f041b57d4', key: 'b401c87c2ab11a1a488ee1c474b109ae' }),
  createCvattvChannel({ id: 'dhe', name: 'DHE', shortName: 'DHE', color: '#475569', number: 314, url: 'https://cdn.cvattv.com.ar/live/c7eds/DHE/SA_Live_dash_cenc/DHE.mpd', keyId: 'ff800156f81f70c687eccaadedc2ca15', key: '937ba1301e27008b34d02b9d8a31a0db' }),
  createCvattvChannel({ id: 'pasiones', name: 'Pasiones', shortName: 'Pasiones', color: '#f43f5e', number: 360, url: 'https://cdn.cvattv.com.ar/live/c7eds/Pasiones/SA_Live_dash_cenc/Pasiones.mpd', keyId: 'd41cf825e878f0d8e276218af7f5b7e1', key: '13d1b73ab578ab8623be9347bcf8972a', category: 'MOVIES' }),
  createCvattvChannel({ id: 'telemundo-hd', name: 'Telemundo HD', shortName: 'Telemundo', color: '#c026d3', number: 365, url: 'https://cdn.cvattv.com.ar/live/c7eds/Telemundo_HD/SA_Live_dash_cenc/Telemundo_HD.mpd', keyId: '53d752e4649dadd808d913985f86ee77', key: 'd1fd24db1b61d634cabfc44538ce9b0e', category: 'MOVIES' }),
  createCvattvChannel({ id: 'tbs', name: 'TBS', shortName: 'TBS', color: '#0ea5e9', number: 2038, url: 'https://cdn.cvattv.com.ar/live/c6eds/TBS/SA_Live_dash_cenc/TBS.mpd', keyId: '49a0179b034ae899cb67d8a5834181aa', key: '486e2c6d69adea7e17f2960e8e366612', category: 'MOVIES' }),
  createCvattvChannel({ id: 'adult-swim', name: 'Adult Swim', shortName: 'Adult Swim', color: '#0f172a', number: 351, url: 'https://cdn.cvattv.com.ar/live/c3eds/Adult_Swim/SA_Live_dash_cenc/Adult_Swim.mpd', keyId: '9be1432e1e594c8d0648a44d3d9f0c46', key: '8e6c785b14d973c504074b1920f11b15', category: 'MOVIES' }),
  createCvattvChannel({ id: 'europa-europa', name: 'Europa Europa', shortName: 'Europa', color: '#2563eb', number: 312, url: 'https://cdn.cvattv.com.ar/live/c6eds/Europa_Europa/SA_Live_dash_cenc/Europa_Europa.mpd', keyId: 'b47f257df0314d09a7f8355c3abe1dc6', key: 'bdc9f1696a82ee7398dd3a7fa82300e2', category: 'MOVIES' }),
  createCvattvChannel({ id: 'tcm', name: 'TCM', shortName: 'TCM', color: '#92400e', number: 309, url: 'https://cdn.cvattv.com.ar/live/c6eds/TCM/SA_Live_dash_cenc/TCM.mpd', keyId: 'a5f44a5e30714cf3bcee7c7f15a08b4e', key: 'c3c141ae941ab9750339c3af45a65ce2', category: 'MOVIES' }),
  createCvattvChannel({ id: 'paramount', name: 'Paramount', shortName: 'Paramount', color: '#1e3a8a', number: 2042, url: 'https://cdn.cvattv.com.ar/live/c7eds/Paramount/SA_Live_dash_cenc/Paramount.mpd', keyId: 'b85b710ecff3e38f31fc8e249b1c1cef', key: 'a1544c193dde6f8858c9358ee69a60a7', category: 'MOVIES' }),

  // HBO
  createCvattvChannel({ id: 'hbo-hd', name: 'HBO HD', shortName: 'HBO', color: '#1d4ed8', number: 407, url: 'https://cdn.cvattv.com.ar/live/c3eds/HBOHD/SA_Live_dash_cenc/HBOHD.mpd', keyId: '5317283f4110fac3fb3a0becd9f648bc', key: '0754a03c926b1247216e01d9dbcfac28',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-2', name: 'HBO 2', shortName: 'HBO 2', color: '#2563eb', number: 408, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_2/SA_Live_dash_cenc/HBO_2.mpd', keyId: 'c90cc57ad2c436e5a77db2f8d9db2d85', key: '04f6c73984bdcffd013050608497935d',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-plus', name: 'HBO Plus', shortName: 'HBO+', color: '#3b82f6', number: 410, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_Plus/SA_Live_dash_cenc/HBO_Plus.mpd', keyId: 'f0e7f7d458990edfab7b98b412564615', key: '79205754b7f84a62661c2dbe9de5dd5d',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-mundi', name: 'HBO Mundi', shortName: 'HBO Mundi', color: '#60a5fa', number: 412, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_Mundi/SA_Live_dash_cenc/HBO_Mundi.mpd', keyId: '7821b2662148fe333d5191acbb8a5c1f', key: 'ae43f3e2545237ebda58b13813b5d328',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-pop', name: 'HBO Pop', shortName: 'HBO Pop', color: '#93c5fd', number: 414, url: 'https://cdn.cvattv.com.ar/live/c7eds/HBO_POP/SA_Live_dash_cenc/HBO_POP.mpd', keyId: 'f4e1ce5cef7e9a110fe968f8881b21fa', key: '6bbe2062b150b11496cdd5fbdd9c89d6',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-extreme', name: 'HBO Extreme', shortName: 'HBO Xtreme', color: '#1e40af', number: 413, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_Extreme/SA_Live_dash_cenc/HBO_Extreme.mpd', keyId: 'd504011bbef467c0de3a7534e302a6d4', key: '334103e2abe16faa7f9ab2e3097c5a58',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-family', name: 'HBO Family', shortName: 'HBO Fam', color: '#6d28d9', number: 409, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_Family/SA_Live_dash_cenc/HBO_Family.mpd', keyId: '535473132f68082160b489482ca35f8e', key: 'e90fd91fcd3fc809bed2b1c0d37f7297',category: 'MOVIES' }),
  createCvattvChannel({ id: 'hbo-signature', name: 'HBO Signature', shortName: 'HBO Sig', color: '#4c1d95', number: 411, url: 'https://cdn.cvattv.com.ar/live/c6eds/HBO_Signature/SA_Live_dash_cenc/HBO_Signature.mpd', keyId: 'e866499fbc1149f49989672075aa3a68', key: 'd2dd5c95623c6343240981c2202fc311',category: 'MOVIES' }),

  // UNIVERSAL PACK
  createCvattvChannel({ id: 'universal-premiere', name: 'Universal Premiere', shortName: 'U Premiere', color: '#0f172a', number: 2051, url: 'https://cdn.cvattv.com.ar/live/c6eds/Universal_Premiere/SA_Live_dash_cenc/Universal_Premiere.mpd', keyId: '0eb20b51ad13b58ad417f11318e588b3', key: 'ad5d29a33d73d21187157802de8e6097',category: 'MOVIES' }),
  createCvattvChannel({ id: 'universal-cinema', name: 'Universal Cinema', shortName: 'U Cinema', color: '#1e293b', number: 2052, url: 'https://cdn.cvattv.com.ar/live/c6eds/Universal_Cinema/SA_Live_dash_cenc/Universal_Cinema.mpd', keyId: 'f6ae2e17173055e4ca69dc18963406ae', key: '5a955c29eb88a0b4c9a2538cc4b3aea2',category: 'MOVIES' }),
  createCvattvChannel({ id: 'universal-comedy', name: 'Universal Comedy', shortName: 'U Comedy', color: '#334155', number: 2053, url: 'https://cdn.cvattv.com.ar/live/c6eds/Universal_Comedy/SA_Live_dash_cenc/Universal_Comedy.mpd', keyId: '062c5d25105a3a935b67e36923c73f28', key: '88c2d4cec420f18d2477152c66c7870d',category: 'MOVIES' }),
  createCvattvChannel({ id: 'universal-crime', name: 'Universal Crime', shortName: 'U Crime', color: '#475569', number: 2054, url: 'https://cdn.cvattv.com.ar/live/c6eds/universal_Crime/SA_Live_dash_cenc/universal_Crime.mpd', keyId: '1efd7edf60e1514f775dd13d046ae708', key: 'c2ef1abbd945c62c11b1375eaaa50f0d',category: 'MOVIES' }),
  createCvattvChannel({ id: 'universal-reality', name: 'Universal Reality', shortName: 'U Reality', color: '#64748b', number: 2055, url: 'https://cdn.cvattv.com.ar/live/c6eds/Universal_Reality/SA_Live_dash_cenc/Universal_Reality.mpd', keyId: 'cedd9c1a5c2ae43f80ee3197212016d6', key: 'bf47a3c39e164a97ea6adc4c8dd57435',category: 'MOVIES' }),

  // VARIETY
  createCvattvChannel({ id: 'lifetime', name: 'Lifetime', shortName: 'Lifetime', color: '#c026d3', number: 654, url: 'https://cdn.cvattv.com.ar/live/c6eds/Lifetime/SA_Live_dash_cenc/Lifetime.mpd', keyId: 'eae51b1d67ff47adac7b6bd3a4b1120a', key: 'b4d6bb47193f33ffc12379cdc447455d', category: 'VARIETY' }),
  createCvattvChannel({ id: 'food-network', name: 'Food Network', shortName: 'Food', color: '#ea580c', number: 655, url: 'https://cdn.cvattv.com.ar/live/c6eds/Food_Network/SA_Live_dash_cenc/Food_Network.mpd', keyId: '6ca0fbad21a0e908c0280dcc27e6ee0e', key: '62670eedbafdf9360b4ecaed738e26cd', category: 'VARIETY' }),
  createCvattvChannel({ id: 'hola-tv', name: 'Hola TV', shortName: 'Hola TV', color: '#f43f5e', number: 658, url: 'https://cdn.cvattv.com.ar/live/c7eds/Hola_TV/SA_Live_dash_cenc/Hola_TV.mpd', keyId: '5d759477f0ad1bdef2c6de09e7c275fd', key: '82cc6eea185eecc934df95adfbbf9dbc', category: 'VARIETY' }),
  createCvattvChannel({ id: 'canal-rural', name: 'Canal Rural', shortName: 'Rural', color: '#65a30d', number: 704, url: 'https://cdn.cvattv.com.ar/live/c6eds/Canal_Rural/SA_Live_dash_cenc/Canal_Rural.mpd', keyId: 'b02c568163c14cfda4ddb958a0aab742', key: 'ef64a70ac85a663a3308be6476610aad', category: 'VARIETY' }),
  createCvattvChannel({ id: 'senal-maria', name: 'Señal Maria', shortName: 'S. Maria', color: '#2563eb', number: 23, url: 'https://cdn.cvattv.com.ar/live/c3eds/Senal_Maria/SA_Live_dash_cenc/Senal_Maria.mpd', keyId: 'd456fba3fccb4c06a0f4776fe412400b', key: 'ca5530ffe42a38759d3887c82d6a909a', category: 'VARIETY' }),
  createCvattvChannel({ id: 'ewtn', name: 'EWTN', shortName: 'EWTN', color: '#1d4ed8', number: 410, url: 'https://cdn.cvattv.com.ar/live/c6eds/EWTN/SA_Live_dash_cenc/EWTN.mpd', keyId: '07df3c48652a431ab779d133f085b799', key: 'ee2fbeec1ecdffa5617383f684dfda0e', category: 'VARIETY' }),
  createCvattvChannel({ id: 'canal-luz', name: 'Canal Luz', shortName: 'Canal Luz', color: '#eab308', number: 2062, url: 'https://cdn.cvattv.com.ar/live/c7eds/CANAL_LUZ/SA_Live_dash_cenc/CANAL_LUZ.mpd', keyId: 'f7523ea5a2da78c465d928be1d81e2a5', key: '870ad69e98abd52b443bd8f0204b3bc4', category: 'VARIETY' }),

  // DOCUMENTARY
  createCvattvChannel({ id: 'theater-hd', name: 'Theater HD', shortName: 'Theater', color: '#7c3aed', number: 183, url: 'https://cdn.cvattv.com.ar/live/c6eds/Theater_HD/SA_Live_dash_cenc/Theater_HD.mpd', keyId: '5279c05ea51c4dae8e7fa6be88448089', key: 'b28dfafba4b848dfd5d7c177ebf19108', category: 'DOCUMENTARY' }),
  createCvattvChannel({ id: 'history-2', name: 'History 2', shortName: 'History 2', color: '#a16207', number: 461, url: 'https://cdn.cvattv.com.ar/live/c6eds/History_2/SA_Live_dash_cenc/History_2.mpd', keyId: 'ecbe97ec34784304b390a12ba3854ccf', key: '5a0ee36ed9b8920cb19546fd92f2d415', category: 'DOCUMENTARY' }),

  // MUSIC
  createCvattvChannel({ id: 'vorterix', name: 'Vorterix', shortName: 'Vorterix', color: '#ef4444', number: 2065, url: 'https://cdn.cvattv.com.ar/live/c6eds/Vorterix/SA_Live_dash_cenc/Vorterix.mpd', keyId: 'eabe2c22350c26c7f0ad84b34932f08d', key: '39fa06836ec0f81d8dd9b6e01a3070e3', category: 'MUSIC' }),
  createCvattvChannel({ id: 'allegro-hd', name: 'Allegro HD', shortName: 'Allegro', color: '#f59e0b', number: 2066, url: 'https://cdn.cvattv.com.ar/live/c7eds/AllegroHD/SA_Live_dash_cenc/AllegroHD.mpd', keyId: 'e55e61b81b992d6c21466891d72157e9', key: '566d341bf7209a88976e75c20ad7aca2', category: 'MUSIC' }),
  createCvattvChannel({ id: 'mtv-00', name: 'MTV 00', shortName: 'MTV 00', color: '#d946ef', number: 2067, url: 'https://cdn.cvattv.com.ar/live/c7eds/MTV00/SA_Live_dash_cenc/MTV00.mpd', keyId: '1f0c09ed9e5841cf867ba6eb3cdfd61d', key: '802c89c6bae6a245aaafcf40c1986fc1', category: 'MUSIC' }),
  createCvattvChannel({ id: 'htv', name: 'HTV', shortName: 'HTV', color: '#a855f7', number: 751, url: 'https://cdn.cvattv.com.ar/live/c6eds/HTV/SA_Live_dash_cenc/HTV.mpd', keyId: 'daecef5fe32f4ce083c6a0c692755d6a', key: 'd4227f24389a9ba77293214b93eb0d7d', category: 'MUSIC' }),
  createCvattvChannel({ id: 'mtv-hits', name: 'MTV Hits', shortName: 'MTV Hits', color: '#c026d3', number: 2069, url: 'https://cdn.cvattv.com.ar/live/c6eds/MTV_Hits/SA_Live_dash_cenc/MTV_Hits.mpd', keyId: '61008dfc867544cd872de99b1f2b82cf', key: '716449756316b91c54803aaa22a2fbf0', category: 'MUSIC' }),
  createCvattvChannel({ id: 'nickmusic', name: 'Nickmusic', shortName: 'Nickmusic', color: '#facc15', number: 2070, url: 'https://cdn.cvattv.com.ar/live/c6eds/Nickmusic/SA_Live_dash_cenc/Nickmusic.mpd', keyId: 'eae6c12ccab349e6ae675ab6ed8a476c', key: '4a4fd86ea9db4417ec86c237d3111b18', category: 'MUSIC' }),
  createCvattvChannel({ id: 'flow-music-xp', name: 'Flow Music XP', shortName: 'Flow XP', color: '#0ea5e9', number: 2071, url: 'https://cdn.cvattv.com.ar/live/c7eds/Flow_Music_XP/SA_Live_dash_cenc/Flow_Music_XP.mpd', keyId: 'b2aae44a74144be8b2118e20d1412bab', key: '8a7ae996d12d8d5d5637d1044f8e08b7', category: 'MUSIC' }),
  createCvattvChannel({ id: 'flow-music-1', name: 'Flow Music 1', shortName: 'Flow 1', color: '#38bdf8', number: 2072, url: 'https://cdn.cvattv.com.ar/live/c7eds/Flow_Music_1/SA_Live_dash_cenc/Flow_Music_1.mpd', keyId: 'f34cd7709f093d23d4db009107d96862', key: 'd8a829138d970b45e867c9733a31b2f0', category: 'MUSIC' }),
  createCvattvChannel({ id: 'flow-music-2', name: 'Flow Music 2', shortName: 'Flow 2', color: '#7dd3fc', number: 2073, url: 'https://cdn.cvattv.com.ar/live/c7eds/Flow_Music_2/SA_Live_dash_cenc/Flow_Music_2.mpd', keyId: '596b599580b39ae2f3c413f7eae36902', key: '2d7e3d5d31f68690fd877a111f84e8e3', category: 'MUSIC' }),
  createCvattvChannel({ id: 'flow-music-3', name: 'Flow Music 3', shortName: 'Flow 3', color: '#bae6fd', number: 2074, url: 'https://cdn.cvattv.com.ar/live/c7eds/Flow_Music_3/SA_Live_dash_cenc/Flow_Music_3.mpd', keyId: 'e078b15ed770ec71f803c0ecc43de033', key: '7010bccda544f74d1b425c4cebd082d4', category: 'MUSIC' }),

  // INTERNATIONAL
  createCvattvChannel({ id: 'bloomberg', name: 'Bloomberg', shortName: 'Bloomberg', color: '#0f172a', number: 2075, url: 'https://cdn.cvattv.com.ar/live/c3eds/Bloomberg/SA_Live_dash_cenc/Bloomberg.mpd', keyId: '1e50891cdc64452aae20d049727f2f3f', key: '551871ba1dc6a95597ec0cb82eb3b2a4', category: 'OTHER' }),
  createCvattvChannel({ id: 'cnn-espanol', name: 'CNN en Español', shortName: 'CNN Esp', color: '#dc2626', number: 800, url: 'https://cdn.cvattv.com.ar/live/c6eds/CNN_en_Espanol/SA_Live_dash_cenc/CNN_en_Espanol.mpd', keyId: '0b20ed9da0e5457c9dfd3ae0b6092491', key: '98997a7020c18cb28174a2490147830a', category: 'OTHER' }),
  createCvattvChannel({ id: 'cnn-internacional', name: 'CNN Internacional', shortName: 'CNN Intl', color: '#ef4444', number: 801, url: 'https://cdn.cvattv.com.ar/live/c6eds/CNN_Internacional/SA_Live_dash_cenc/CNN_Internacional.mpd', keyId: '9f24708ad1184ee3a04b650941f9894b', key: 'e5bc7c5ff392119423dbf1c023a7b21c', category: 'OTHER' }),
  createCvattvChannel({ id: 'bbc-world', name: 'BBC World News', shortName: 'BBC World', color: '#dc2626', number: 803, url: 'https://cdn.cvattv.com.ar/live/c6eds/BBC_World_News/SA_Live_dash_cenc/BBC_World_News.mpd', keyId: '019f72f2091d4cbea59ff8c85b117f86', key: 'a4eac51195506752f9f63ad24def9c37', category: 'OTHER' }),
  createCvattvChannel({ id: 'fox-news', name: 'Fox News', shortName: 'Fox News', color: '#1d4ed8', number: 6110, url: 'https://cdn.cvattv.com.ar/live/c6eds/Fox_News/SA_Live_dash_cenc/Fox_News.mpd', keyId: '3fe3f31a5e7b48a1b548e9364757ce66', key: '32993fc281207fe915f6f1e990957868', category: 'OTHER' }),
  createCvattvChannel({ id: 'al-jazeera', name: 'Al Jazeera', shortName: 'Al Jazeera', color: '#f59e0b', number: 2080, url: 'https://cdn.cvattv.com.ar/live/c7eds/Alljazzera/SA_Live_dash_cenc/Alljazzera.mpd', keyId: '137a1a70fa118b695118a3aad9485b13', key: '7c35ca36d4452dfa03d88725a0d16105', category: 'OTHER' }),
  createCvattvChannel({ id: 'euronews', name: 'Euronews', shortName: 'Euronews', color: '#2563eb', number: 2081, url: 'https://cdn.cvattv.com.ar/live/c7eds/Euronews/SA_Live_dash_cenc/Euronews.mpd', keyId: 'd1c8e5bd9c8a4e7b1c5f0e5a9b2c3f1', key: '4a6c8e5b2d9f4a7c8e5b1a2c3d4e5f6', category: 'OTHER' }),
  createCvattvChannel({ id: 'dw', name: 'DW', shortName: 'DW', color: '#0f172a', number: 610, url: 'https://cdn.cvattv.com.ar/live/c6eds/DW/SA_Live_dash_cenc/DW.mpd', keyId: 'e21fc12c6ee185fbc90a052b05026be9', key: '0f96fd52903707aac0b42853a043ffd0', category: 'OTHER' }),
  createCvattvChannel({ id: 'france-24', name: 'France 24', shortName: 'France 24', color: '#dc2626', number: 806, url: 'https://cdn.cvattv.com.ar/live/c6eds/France_24/SA_Live_dash_cenc/France_24.mpd', keyId: '72187f2651724db18505cdcad435841d', key: '6f41e05476e34edf7bb9dc51f08f95df', category: 'OTHER' }),
  createCvattvChannel({ id: 'tv5-monde', name: 'TV5 Monde', shortName: 'TV5', color: '#7c3aed', number: 602, url: 'https://cdn.cvattv.com.ar/live/c6eds/TV5_Monde/SA_Live_dash_cenc/TV5_Monde.mpd', keyId: '62034ff5988b4787b17cdf6f751a3142', key: 'b3938f0af28b4c0c082b0d4210e389a0', category: 'OTHER' }),
  createCvattvChannel({ id: 'antena-3', name: 'Antena 3', shortName: 'Antena 3', color: '#ea580c', number: 2085, url: 'https://cdn.cvattv.com.ar/live/c6eds/Antena_3/SA_Live_dash_cenc/Antena_3.mpd', keyId: '1e1ad422a6714482b66fa702c16e50c6', key: '4fdf28a0ab91356ca55a75f4e9bf8c92', category: 'OTHER' }),
  createCvattvChannel({ id: 'telesur', name: 'Telesur', shortName: 'Telesur', color: '#15803d', number: 600, url: 'https://cdn.cvattv.com.ar/live/c6eds/Telesur/SA_Live_dash_cenc/Telesur.mpd', keyId: '5235d8ee29f14ce6b26ea5d828aee77a', key: '6bf6bd339e3098babc2ab0b984cd2376', category: 'OTHER' }),
  createCvattvChannel({ id: 'bandeirantes', name: 'Bandeirantes', shortName: 'Band', color: '#1d4ed8', number: 2087, url: 'https://cdn.cvattv.com.ar/live/c7eds/Bandeirantes/SA_Live_dash_cenc/Bandeirantes.mpd', keyId: '0b4f56d5c19b45fb3e75a73b6ec06e6c', key: 'c464e2b6ded2b52e1e7753b3a859abce', category: 'OTHER' }),
  createCvattvChannel({ id: 'rede-record', name: 'Rede Record', shortName: 'Record', color: '#be123c', number: 2088, url: 'https://cdn.cvattv.com.ar/live/c3eds/Rede_Record/SA_Live_dash_cenc/Rede_Record.mpd', keyId: 'b0bd8ea11b3f4c219903085ef1d44b0d', key: '9a25709a72c2ca93cb738665736cfa5a', category: 'OTHER' }),
  createCvattvChannel({ id: 'argentinisima', name: 'Argentinísima', shortName: 'Argent.', color: '#64748b', number: 2089, url: 'https://cdn.cvattv.com.ar/live/c6eds/Argentinisima/SA_Live_dash_cenc/Argentinisima.mpd', keyId: 'a6243f46366445ebbf3117ec27365481', key: '81667cdc3bcf19a6a66c0919fa00a20b', category: 'OTHER' }),
  createCvattvChannel({ id: 'arirang', name: 'Arirang', shortName: 'Arirang', color: '#0f766e', number: 612, url: 'https://cdn.cvattv.com.ar/live/c7eds/Arirang/SA_Live_dash_cenc/Arirang.mpd', keyId: '436d78a75fad9bdcc6d409640c116a62', key: 'c77471ac3b694513a9c5ff68b8d4fac5', category: 'OTHER' }),
]

const categoryOrder = [
  "GENERAL",
  "SPORTS",
  "KIDS",
  "MOVIES",
  "DOCUMENTARY",
  "VARIETY",
  "MUSIC",
  "NEWS",
  "OTHER"
];

export const channels = channelsRaw
  .slice() // avoid mutating original array
  .sort((a, b) => {
    // First sort by category order
    const categoryDiff =
      categoryOrder.indexOf(a.category ?? 'OTHER') -
      categoryOrder.indexOf(b.category ?? 'OTHER');

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    // Then sort by number ascending inside each category
    return a.number - b.number;
  });