import { channels } from './src/channels.ts'

const CHANNEL_IMAGE_BY_NUMBER = Object.fromEntries(
  channels.map((channel) => [channel.number, channel.image ?? null])
)

console.log(JSON.stringify(CHANNEL_IMAGE_BY_NUMBER, null, 2))
