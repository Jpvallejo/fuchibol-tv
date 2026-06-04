import { channels, CHANNEL_ID_BY_NUMBER as MOV_CHANNEL_ID_BY_NUMBER } from './src/channels.ts'

const CHANNEL_ID_BY_NUMBER_NEW = Object.fromEntries(
  channels
    .map((channel) => [channel.number, MOV_CHANNEL_ID_BY_NUMBER[channel.movistarNumber]])
    .filter(([_, id]) => id !== undefined && id !== null)
)

console.log(JSON.stringify(CHANNEL_ID_BY_NUMBER_NEW, null, 2))
