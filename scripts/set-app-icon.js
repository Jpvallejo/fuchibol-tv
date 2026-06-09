#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const srcSmall = path.join(projectRoot, 'public', 'tv-argentina-logo-small.png')
const srcLarge = path.join(projectRoot, 'public', 'tv-argentina-logo.png')

const mipmapFolders = [
  'android/app/src/main/res/mipmap-mdpi',
  'android/app/src/main/res/mipmap-hdpi',
  'android/app/src/main/res/mipmap-xhdpi',
  'android/app/src/main/res/mipmap-xxhdpi',
  'android/app/src/main/res/mipmap-xxxhdpi'
]

if (!fs.existsSync(srcSmall)) {
  console.error('Source small icon not found:', srcSmall)
  process.exit(1)
}

if (!fs.existsSync(srcLarge)) {
  console.error('Source large banner not found:', srcLarge)
  process.exit(1)
}

// Copy small icon to mipmap launcher icons (official app icon)
for (const folder of mipmapFolders) {
  const destFolder = path.join(projectRoot, folder)
  if (!fs.existsSync(destFolder)) continue

  const targets = ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png', 'ic_launcher_round_foreground.png']
  for (const name of targets) {
    const dest = path.join(destFolder, name)
    try {
      fs.copyFileSync(srcSmall, dest)
      console.log('Copied', srcSmall, '->', dest)
    } catch (err) {
      console.error('Failed to copy to', dest, err.message)
    }
  }
}

// Copy large banner to all drawable* folders as tv_banner (big horizontal launcher)
const resFolder = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res')
const entries = fs.readdirSync(resFolder)
const drawableFolders = entries.filter((e) => e.startsWith('drawable'))

for (const folder of drawableFolders) {
  const destFolder = path.join(resFolder, folder)
  if (!fs.existsSync(destFolder)) continue
  const dest = path.join(destFolder, 'tv_banner.png')
  try {
    fs.copyFileSync(srcLarge, dest)
    console.log('Copied banner', srcLarge, '->', dest)
  } catch (err) {
    console.error('Failed to copy banner to', dest, err.message)
  }
}

console.log('Icon update complete. You may need to rebuild the Android app (cd android && ./gradlew assembleDebug).')
