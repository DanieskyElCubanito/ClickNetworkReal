import crypto from 'crypto';

// 🛡️ 1. CIFRADO AES-256-GCM (Vulnerabilidad Criptográfica)
const RAW_KEY = process.env.ENCRYPTION_KEY || 'TeleGemFallbackKey2026NeedsToChangeNow';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); 

export function encryptText(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptText(text) {
  try {
    const [ivHex, authTagHex, encryptedHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    throw new Error('Fallo en desencriptado. Llave incorrecta o datos corruptos.');
  }
}

// 🛡️ 2. MEMORIA DE RATE LIMITING (Ataques DDoS)
const rateLimitMap = new Map();
export function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return true;
  }
  const data = rateLimitMap.get(ip);
  if (now - data.firstRequest > 60000) { 
    data.count = 1;
    data.firstRequest = now;
    return true;
  }
  data.count++;
  return data.count <= 30; 
}

// 🛡️ 3. FIRMA ANTI-SPOOFING (auth_date)
export function verifyTelegramWebAppData(telegramInitData) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!telegramInitData || !BOT_TOKEN) return false;
  
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');

  const authDate = urlParams.get('auth_date');
  if (authDate) {
    const timeDiff = (Date.now() / 1000) - Number(authDate);
    if (timeDiff > 86400) return false; // Bloquea firmas caducadas (24h)
  }

  urlParams.delete('hash');
  urlParams.sort();
  let dataCheckString = '';
  for (const [key, value] of urlParams.entries()) { dataCheckString += `${key}=${value}\n`; }
  dataCheckString = dataCheckString.slice(0, -1);
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return calculatedHash === hash;
}

// 🛡️ 4. HERRAMIENTAS DE PARSEO
export function extractTelegramUsername(url) {
  let val = url.trim();
  if (val.startsWith('@')) return val;
  const match = val.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return '@' + match[1];
  return null;
}
