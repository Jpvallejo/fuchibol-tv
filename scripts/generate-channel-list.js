const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'channels.ts');
const src = fs.readFileSync(srcPath, 'utf8');

function isBase64Standard(str) {
  if (!str || typeof str !== 'string') return false;
  // standard base64 characters plus optional padding
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

function extractCreateCvattv() {
  const regex = /createCvattvChannel\(\s*{([\s\S]*?)\}\s*\)/g;
  const results = [];
  let m;
  while ((m = regex.exec(src)) !== null) {
    const block = m[1];
    // Try to extract explicit URL string or second arg of buildCvattvFallbackUrl
    let url = null;
    const buildMatch = block.match(/url:\s*buildCvattvFallbackUrl\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
    if (buildMatch) url = buildMatch[2];
    else {
      const u = block.match(/url:\s*"([^"]+)"/);
      if (u) url = u[1];
    }

    const keyIdMatch = block.match(/keyId:\s*"([^"]+)"/);
    const keyMatch = block.match(/key:\s*"([^"]+)"/);
    const keyId = keyIdMatch ? keyIdMatch[1] : null;
    const key = keyMatch ? keyMatch[1] : null;

    let channelId = null;
    if (url) {
      const parts = url.split('/');
      let last = parts.pop() || '';
      if (last.toLowerCase().endsWith('.mpd')) last = last.slice(0, -4);
      channelId = last;
    } else {
      const idMatch = block.match(/id:\s*"([^"]+)"/);
      channelId = idMatch ? idMatch[1] : null;
    }

    if (channelId) {
      results.push({ channelId, keyId, key });
    }
  }
  return results;
}

function extractCreateChannelWithFallback() {
  const regex = /createChannel\(\s*{([\s\S]*?)\}\s*\)/g;
  const results = [];
  let m;
  while ((m = regex.exec(src)) !== null) {
    const block = m[1];
    if (!/fallback\s*:/m.test(block)) continue;
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const fallbackMatch = block.match(/fallback\s*:\s*{([\s\S]*?)}/m);
    if (!idMatch || !fallbackMatch) continue;
    const id = idMatch[1];
    const fb = fallbackMatch[1];
    const keyIdMatch = fb.match(/keyId:\s*"([^"]+)"/);
    const keyMatch = fb.match(/key:\s*"([^"]+)"/);
    const keyId = keyIdMatch ? keyIdMatch[1] : null;
    const key = keyMatch ? keyMatch[1] : null;
    if (keyId || key) results.push({ channelId: id, keyId, key });
  }
  return results;
}

const cv = extractCreateCvattv();
const chfb = extractCreateChannelWithFallback();

const combined = {};
// Include all createCvattvChannel entries (cv) and createChannel entries with fallback (chfb)
[...cv, ...chfb].forEach(item => {
  const cid = item.channelId;
  let encodedStream = null;
  if (isBase64Standard(cid)) {
    try {
      encodedStream = Buffer.from(cid, 'base64').toString('utf8');
    } catch (e) {
      encodedStream = null;
    }
  }
  combined[cid] = {
    encodedStream,
    keyId: item.keyId || null,
    key: item.key || null,
  };
});

console.log(JSON.stringify(combined, null, 2));
