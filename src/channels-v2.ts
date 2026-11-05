// Channel list v2: curated channel set with its own categories.
//
// Channel definitions (name, number, logo, colors) still come from ./channels
// for now; this file decides WHICH channels are shown and in WHICH category.
// Every channel plays through Shaka via
// https://fuchibol-local.vallejo.ar/api/get-shaka-setup?channel=<id>.
//
// The ids in CHANNEL_CATEGORIES are used verbatim as each channel's id, which
// is what the player sends to get-shaka-setup. The card info (name, number,
// logo, color, guide data) comes from the ./channels definition with the same
// id, or from the one named in DISPLAY_ALIASES when ./channels spells it
// differently. Ids with neither get a generated card (name derived from the
// id, no logo) so every channel in the list is visible.
import { channels as legacyChannels, type Channel } from './channels'

export type ChannelCategoryV2 =
  | 'GENERAL'
  | 'FUTBOL'
  | 'DEPORTES'
  | 'PELICULAS'
  | 'INFANTIL'
  | 'DOCUMENTALES'
  | 'VARIEDAD'
  | 'MUSICA'
  | 'INTERIOR'
  | 'INTERNACIONAL'
  | 'EEUU'
  | 'URUGUAY'
  | 'PARAGUAY'
  | 'OTROS'
  | 'MAS'

export interface ChannelV2 extends Omit<Channel, 'category'> {
  category: ChannelCategoryV2
}

// Adult (+18) category: hidden from the full guide / channel surfing and
// gated behind an age disclaimer when entered.
export const ADULT_CATEGORY: ChannelCategoryV2 = 'MAS'

export const CATEGORY_ORDER: ChannelCategoryV2[] = [
  'GENERAL',
  'FUTBOL',
  'DEPORTES',
  'PELICULAS',
  'INFANTIL',
  'DOCUMENTALES',
  'VARIEDAD',
  'MUSICA',
  'INTERIOR',
  'INTERNACIONAL',
  'EEUU',
  'URUGUAY',
  'PARAGUAY',
  'OTROS',
  'MAS',
]

// Source channel ids (as the get-shaka-setup backend names them) → category.
const CHANNEL_CATEGORIES: Record<string, ChannelCategoryV2> = {
  // GENERAL
  Canal_de_la_ciudad: 'GENERAL',
  Canal_Rural: 'GENERAL',
  KZO: 'GENERAL',
  BravoTV: 'GENERAL',
  Teve_Ciudad: 'GENERAL',
  Canal_12_CBA: 'GENERAL',
  Telemax: 'GENERAL',
  Net_TV: 'GENERAL',
  Canal_8_Tucuman: 'GENERAL',
  Magazine: 'GENERAL',
  Encuentro: 'GENERAL',
  Telefe_Neuquen: 'GENERAL',
  Telefe_Salta: 'GENERAL',
  La_Nacion: 'GENERAL',
  CronicaTV: 'GENERAL',
  Canal9: 'GENERAL',
  C5N: 'GENERAL',
  AmericaTV: 'GENERAL',
  ArtearHD: 'GENERAL',
  TelefeHD: 'GENERAL',
  America24: 'GENERAL',
  Metro: 'GENERAL',
  TodoNoticias: 'GENERAL',
  Diputados_TV: 'GENERAL',
  '26_TV_HD': 'GENERAL',
  Canal7: 'GENERAL',
  // FUTBOL
  TNT_Sports_HD: 'FUTBOL',
  Fox_Sports_Premiun_HD: 'FUTBOL',
  // DEPORTES
  ESPN2HD: 'DEPORTES',
  Eventos_HD_Uy: 'DEPORTES',
  FoxSports2_UY: 'DEPORTES',
  FoxSports3_UY: 'DEPORTES',
  ESPN4: 'DEPORTES',
  NBA_TV: 'DEPORTES',
  ESPN_UY: 'DEPORTES',
  ESPN2_UY: 'DEPORTES',
  'ESPN3_Uy-Py': 'DEPORTES',
  TyC_Internacional: 'DEPORTES',
  Dsports_UY: 'DEPORTES',
  Dsports2_UY: 'DEPORTES',
  Dsports_Plus_UY: 'DEPORTES',
  DSports_1: 'DEPORTES',
  DSports_2: 'DEPORTES',
  ESPN2_Arg: 'DEPORTES',
  ESPN3: 'DEPORTES',
  FoxSports: 'DEPORTES',
  FoxSports2HD: 'DEPORTES',
  FoxSports3HD: 'DEPORTES',
  TyCSport: 'DEPORTES',
  DeporTVHD: 'DEPORTES',
  ESPNHD: 'DEPORTES',
  // PELICULAS
  SyFy: 'PELICULAS',
  Universal_Cinema: 'PELICULAS',
  Universal_Comedy: 'PELICULAS',
  universal_Crime: 'PELICULAS',
  Universal_Premiere: 'PELICULAS',
  Universal_Reality: 'PELICULAS',
  ISAT: 'PELICULAS',
  Cinemax: 'PELICULAS',
  TNT_HD_Arg: 'PELICULAS',
  TNTSeries: 'PELICULAS',
  TBS: 'PELICULAS',
  SonyHD: 'PELICULAS',
  TruTV: 'PELICULAS',
  Adult_Swim: 'PELICULAS',
  TCM: 'PELICULAS',
  HBOHD: 'PELICULAS',
  HBO_2: 'PELICULAS',
  HBO_Plus: 'PELICULAS',
  HBO_Family: 'PELICULAS',
  HBO_Extreme: 'PELICULAS',
  HBO_Mundi: 'PELICULAS',
  HBO_POP: 'PELICULAS',
  HBO_Signature: 'PELICULAS',
  DiscoveryTurbo: 'PELICULAS',
  ID: 'PELICULAS',
  Golden: 'PELICULAS',
  A3_Series: 'PELICULAS',
  Dreamworks: 'PELICULAS',
  FOXHD: 'PELICULAS',
  Europa_Europa: 'PELICULAS',
  Universal_Channel_HD: 'PELICULAS',
  Paramount: 'PELICULAS',
  Film_Arts: 'PELICULAS',
  A3_Cine: 'PELICULAS',
  Theater_HD: 'PELICULAS',
  INCAA_Tv: 'PELICULAS',
  AEHD: 'PELICULAS',
  AXNHD: 'PELICULAS',
  Space: 'PELICULAS',
  Antena_3: 'PELICULAS',
  DiscoveryHD: 'PELICULAS',
  FXHD: 'PELICULAS',
  AMC_Series: 'PELICULAS',
  Studio_Universal: 'PELICULAS',
  WarnerHD: 'PELICULAS',
  CinecanalHD: 'PELICULAS',
  AMC: 'PELICULAS',
  // INFANTIL
  CartoonNetwork: 'INFANTIL',
  Nickelodeon: 'INFANTIL',
  DisneyJr: 'INFANTIL',
  Discovery_Kids: 'INFANTIL',
  Boomerang: 'INFANTIL',
  PAKA_PAKA: 'INFANTIL',
  DisneyChannelHD: 'INFANTIL',
  Nick_Jr: 'INFANTIL',
  // DOCUMENTALES
  HistoryHD: 'DOCUMENTALES',
  History_2: 'DOCUMENTALES',
  NatGeoHD: 'DOCUMENTALES',
  Discovery_World_HD: 'DOCUMENTALES',
  Discovery_Science: 'DOCUMENTALES',
  // VARIEDAD
  Investigacion_Periodistica: 'VARIEDAD',
  RPC_C4: 'VARIEDAD',
  Canal_de_las_estrellas: 'VARIEDAD',
  AnimalPlanet: 'VARIEDAD',
  DiscoveryHomeHealthHD: 'VARIEDAD',
  TLC: 'VARIEDAD',
  Telemundo_HD: 'VARIEDAD',
  VTV_Plus_HD: 'VARIEDAD',
  ComedyCentral: 'VARIEDAD',
  E_Entertainment_Television: 'VARIEDAD',
  Gourmet: 'VARIEDAD',
  Food_Network: 'VARIEDAD',
  GEN_TV: 'VARIEDAD',
  BBC_World_News: 'VARIEDAD',
  Hola_TV: 'VARIEDAD',
  WOBI: 'VARIEDAD',
  Volver: 'VARIEDAD',
  Lifetime: 'VARIEDAD',
  // MUSICA
  HTV: 'MUSICA',
  CM: 'MUSICA',
  Quiero_HD: 'MUSICA',
  MTV_Hits: 'MUSICA',
  MTV_HD: 'MUSICA',
  MTV00: 'MUSICA',
  // INTERIOR
  Canal_5_Rosario: 'INTERIOR',
  Canal_8_CBA: 'INTERIOR',
  // INTERNACIONAL
  TV5_Monde: 'INTERNACIONAL',
  TV_Espana: 'INTERNACIONAL',
  Telesur: 'INTERNACIONAL',
  Fox_News: 'INTERNACIONAL',
  Tv_Chile: 'INTERNACIONAL',
  RAI: 'INTERNACIONAL',
  // EEUU
  USA_Network: 'EEUU',
  // URUGUAY
  Canal10_URU: 'URUGUAY',
  Canal4_URU: 'URUGUAY',
  Canal12URU: 'URUGUAY',
  // PARAGUAY
  SNT_C4: 'PARAGUAY',
  NOTICIAS_PY_C4: 'PARAGUAY',
  PARAVISION_C4: 'PARAGUAY',
  LA_TELE_C4: 'PARAGUAY',
  C9N_C4: 'PARAGUAY',
  Paraguay_TV: 'PARAGUAY',
  // OTROS
  Flow_Music_3: 'OTROS',
  SUR_TV_C4: 'OTROS',
  Euronews: 'OTROS',
  El_Garage: 'OTROS',
  Argentinisima: 'OTROS',
  VTV_HD: 'OTROS',
  Glitz: 'OTROS',
  Eurochannel: 'OTROS',
  TELEFUTURO_C4: 'OTROS',
  Flow_Music_XP: 'OTROS',
  Flow_Music_1: 'OTROS',
  Flow_Music_2: 'OTROS',
  Sun_Channel: 'OTROS',
  Eventos1HD: 'OTROS',
  Eventos_2_HD: 'OTROS',
  // MAS
  Playboy: 'MAS',
  Venus: 'MAS',
  Sextreme: 'MAS',
}

// Display-only: which ./channels definition to take the card info from when
// it isn't stored under the same id. Playback still uses the source id.
const DISPLAY_ALIASES: Record<string, string> = {
  // Same channel, different casing
  Nickelodeon: 'nickelodeon',
  TLC: 'tlc',
  Golden: 'golden',
  CM: 'cm',
  Eurochannel: 'eurochannel',
  AMC: 'amc',
  RAI: 'rai',
  // Sports
  ESPNHD: 'espn',
  ESPN2_Arg: 'espn-2',
  ESPN3: 'espn-3',
  ESPN4: 'espn-4',
  FoxSports: 'fox-sports',
  FoxSports2HD: 'fox-sports-2',
  FoxSports3HD: 'fox-sports-3',
  TyCSport: 'tyc-sports',
  TNT_Sports_HD: 'tnt-sports',
  Fox_Sports_Premiun_HD: 'espn-premium', // Fox Sports Premium was rebranded ESPN Premium
  // Kids
  DisneyChannelHD: 'disney-channel',
  DisneyJr: 'disney-junior',
  Discovery_Kids: 'discovery-kids',
  // Movies & series
  TNT_HD_Arg: 'tnt',
  SonyHD: 'sony-channel',
  ID: 'investigation-discovery',
  FOXHD: 'star-channel', // FOX was rebranded Star Channel
  Universal_Channel_HD: 'universal',
  Studio_Universal: 'studio-universal',
  Film_Arts: 'film-and-arts',
  AEHD: 'ae',
  AXNHD: 'axn',
  FXHD: 'fx',
  CinecanalHD: 'cinecanal',
  DiscoveryHD: 'discovery-channel',
  // Documentary & variety
  HistoryHD: 'history-channel',
  NatGeoHD: 'nat-geo',
  Discovery_World_HD: 'discovery-world',
  Discovery_Science: 'discovery-science',
  AnimalPlanet: 'animal-planet',
  DiscoveryHomeHealthHD: 'discovery-hyh',
  ComedyCentral: 'comedy-central',
  E_Entertainment_Television: 'e-entertainment',
  Gourmet: 'el-gourmet',
  // Music & US
  MTV_HD: 'mtv',
  Quiero_HD: 'quiero-musica',
  USA_Network: 'usa-network',
}

const definitionsById = new Map(legacyChannels.map((channel) => [channel.id, channel]))

// 'Canal_5_Rosario' -> 'Canal 5 Rosario', 'TNT_HD_Arg' -> 'TNT HD Arg'
function nameFromId(id: string): string {
  return id.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

// Card for an id with no ./channels definition. number 0 = "no channel number"
// (hidden in the UI, sorted after numbered channels).
function generatedChannel(id: string, category: ChannelCategoryV2): ChannelV2 {
  const name = nameFromId(id)
  return {
    id,
    name,
    shortName: name,
    color: '#64748b',
    movistarNumber: 0,
    number: 0,
    image: null,
    keyId: '',
    key: '',
    getManifestUrl: () => '',
    category,
  }
}

const resolved: ChannelV2[] = Object.entries(CHANNEL_CATEGORIES).map(([id, category]) => {
  const definition = definitionsById.get(id) ?? definitionsById.get(DISPLAY_ALIASES[id] ?? '')
  return definition ? { ...definition, id, category } : generatedChannel(id, category)
})

const sortNumber = (channel: ChannelV2) => channel.number || Number.MAX_SAFE_INTEGER

export const channels: ChannelV2[] = resolved.sort((a, b) =>
  CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    || sortNumber(a) - sortNumber(b)
    || a.name.localeCompare(b.name),
)
