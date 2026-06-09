/**
 * Fetches a LA14 page and extracts the playbackURL from the script tag
 */
export async function getLa14Url(pageUrl: string): Promise<string | null> {
  const toProxyUrl = (rawUrl: string): string => {
    const normalizedUrl = rawUrl
      .replace(/\\\//g, '/')
      .replace(/\\u0026/g, '&')
      .trim()
    const encodedUrl = encodeURIComponent(normalizedUrl)
    return `https://fuchibol.vallejo.ar/api/proxy-hls?url=${encodedUrl}`
  }

  try {
    console.log(`Fetching LA14 URL from: ${pageUrl}`)
    
    let html: string | null = null
    
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    // Try direct fetch first (works on native Android via Capacitor)
    try {
      const response = await fetch(pageUrl, {
        method: 'GET',
        headers: fetchHeaders,
      })
      
      if (response.ok) {
        html = await response.text()
        console.log(`Direct fetch successful, received ${html.length} bytes`)
      }
    } catch (directError) {
      console.log('Direct fetch failed, trying proxy services...')
    }

    // Try different proxy services if direct fetch failed
    if (!html) {
      const proxyServices = [
        // corsproxy.io - returns raw HTML
        `https://corsproxy.io/?${encodeURIComponent(pageUrl)}`,
        // allorigins - may work better than before
        `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`,
      ]

      for (const proxyUrl of proxyServices) {
        try {
          console.log(`Trying proxy: ${proxyUrl.substring(0, 50)}...`)
          const response = await fetch(proxyUrl, {
            headers: fetchHeaders,
          })
          if (response.ok) {
            html = await response.text()
            console.log(`Proxy fetch successful, received ${html.length} bytes`)
            break
          }
        } catch (proxyError) {
          console.log(`Proxy failed: ${proxyError}`)
        }
      }
    }

    if (!html) {
      console.error('Could not fetch page content from any source')
      return null
    }

    // Find playbackURL in script tags
    // Matches: playbackURL: "url" or playbackURL: 'url'
    let match = html.match(/playbackURL\s*:\s*["']([^"']+)["']/i)
    if (match && match[1]) {
      const proxiedUrl = toProxyUrl(match[1])
      console.log(`Found playbackURL, using proxy: ${proxiedUrl}`)
      return proxiedUrl
    }

    // Try: playbackURL="url" or playbackURL='url'
    const altMatch = html.match(/playbackURL\s*=\s*["']([^"']+)["']/i)
    if (altMatch && altMatch[1]) {
      const proxiedUrl = toProxyUrl(altMatch[1])
      console.log(`Found playbackURL, using proxy: ${proxiedUrl}`)
      return proxiedUrl
    }

    // Try JSON format: "playbackURL": "url"
    const jsonMatch = html.match(/"playbackURL"\s*:\s*"([^"]+)"/)
    if (jsonMatch && jsonMatch[1]) {
      const proxiedUrl = toProxyUrl(jsonMatch[1])
      console.log(`Found playbackURL in JSON, using proxy: ${proxiedUrl}`)
      return proxiedUrl
    }

    // Try extracting from video source src attribute
    const srcMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i)
    if (srcMatch && srcMatch[1]) {
      const proxiedUrl = toProxyUrl(srcMatch[1])
      console.log(`Found video source, using proxy: ${proxiedUrl}`)
      return proxiedUrl
    }

    // Try extracting m3u8 or mp4 URLs
    const videoMatch = html.match(/https?:\/\/[^\s"'<>]+(\.m3u8|\.mp4)/i)
    if (videoMatch && videoMatch[0]) {
      const proxiedUrl = toProxyUrl(videoMatch[0])
      console.log(`Found video URL, using proxy: ${proxiedUrl}`)
      return proxiedUrl
    }

    console.warn(`No playback URL found in page: ${pageUrl}`)
    console.debug(`HTML snippet: ${html.substring(0, 1000)}...`)
    return null
  } catch (error) {
    console.error(`Error fetching LA14 URL from ${pageUrl}:`, error)
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`)
    }
    return null
  }
}

// CLI usage: npx ts-node src/la14-url-extractor.ts <URL>
// if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
//   const url = process.argv[2]
//   if (!url) {
//     console.error('Usage: npx ts-node src/la14-url-extractor.ts <URL>')
//     process.exit(1)
//   }

//   getLa14Url(url).then((playbackUrl) => {
//     if (playbackUrl) {
//       console.log(playbackUrl)
//     } else {
//       console.error('Could not extract playbackURL')
//       process.exit(1)
//     }
//   })
// }
