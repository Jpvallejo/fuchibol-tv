const GITHUB_REPO = 'Jpvallejo/fuchibol-tv'
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
const STORAGE_KEY = 'update-check-cache'

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
}

interface CacheData {
  timestamp: number
  result: UpdateCheckResult
}

/**
 * Parses version string (e.g. "1.0.8") to comparable number array
 */
function parseVersion(version: string): number[] {
  return version.split('.').map(v => parseInt(v, 10))
}

/**
 * Compares two version strings
 * Returns: 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1)
  const v2 = parseVersion(version2)

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const part1 = v1[i] || 0
    const part2 = v2[i] || 0
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  return 0
}

declare const __APP_VERSION__: string

function getCurrentVersion(): string {
  return __APP_VERSION__ || '0.0.0'
}

/**
 * Fetches latest release information from GitHub API
 */
async function fetchLatestRelease(): Promise<{ version: string; downloadUrl: string } | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      console.warn('GitHub API response not ok:', response.status)
      return null
    }

    const data = await response.json()
    const tagName = data.tag_name || data.name || ''
    // Remove 'v' prefix if present
    const version = tagName.replace(/^v/, '')

    // Find APK download URL
    const apkAsset = data.assets?.find((asset: any) =>
      asset.name.endsWith('.apk')
    )
    const downloadUrl = apkAsset?.browser_download_url

    if (!version || !downloadUrl) {
      console.warn('Could not find version or APK in release:', { version, hasUrl: !!downloadUrl })
      return null
    }

    return { version, downloadUrl }
  } catch (e) {
    console.warn('Failed to fetch latest release from GitHub:', e)
    return null
  }
}

/**
 * Gets cached check result if valid (less than 6 hours old)
 */
function getCachedResult(): UpdateCheckResult | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)
    const age = Date.now() - data.timestamp

    if (age < CHECK_INTERVAL_MS) {
      return data.result
    }

    localStorage.removeItem(STORAGE_KEY)
    return null
  } catch (e) {
    console.warn('Failed to read update cache:', e)
    return null
  }
}

/**
 * Saves check result to cache
 */
function cacheResult(result: UpdateCheckResult): void {
  try {
    const data: CacheData = {
      timestamp: Date.now(),
      result,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to cache update check:', e)
  }
}

/**
 * Checks for app updates on GitHub
 * Returns null if check fails or cannot determine update status
 */
export async function checkForUpdates(): Promise<UpdateCheckResult | null> {
  // Check cache first
  const cached = getCachedResult()
  if (cached) {
    return cached
  }

  try {
    const currentVersion = getCurrentVersion()
    const latestRelease = await fetchLatestRelease()

    if (!latestRelease) {
      return null
    }

    const hasUpdate = compareVersions(latestRelease.version, currentVersion) > 0

    const result: UpdateCheckResult = {
      hasUpdate,
      currentVersion,
      latestVersion: latestRelease.version,
      downloadUrl: latestRelease.downloadUrl,
    }

    cacheResult(result)
    return result
  } catch (e) {
    console.warn('Update check failed:', e)
    return null
  }
}
