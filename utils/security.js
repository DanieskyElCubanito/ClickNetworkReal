import crypto from 'crypto';

// 🛡️ 1. CIFRADO AES-256-GCM
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

// 🛡️ 2. RATE LIMITING (en memoria, por instancia)
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

// 🛡️ 3. VERIFICACIÓN DE TELEGRAM WEBAPP (firma HMAC-SHA256)
// Devuelve { id, user } si la firma es válida, o null. Falla cerrado.
export function verifyTelegramUser(telegramInitData) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!telegramInitData || !BOT_TOKEN) return null;

  const params = new URLSearchParams(telegramInitData);
  const hash = params.get('hash');
  const authDate = params.get('auth_date');

  // Sin hash válido o sin auth_date: se rechaza (antes se aceptaba sin auth_date)
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  if (!authDate || !/^\d+$/.test(authDate)) return null;

  const age = Math.floor(Date.now() / 1000) - Number(authDate);
  if (age < -300 || age > 86400) return null; // caducada (24h) o fecha futura

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
  const given = Buffer.from(hash, 'hex');

  // Comparación en tiempo constante (antes era ===)
  if (given.length !== calc.length || !crypto.timingSafeEqual(calc, given)) return null;

  // El id sale de los datos YA firmados, no del cuerpo de la petición
  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  if (!user || user.id === undefined || user.id === null) return null;

  return { id: String(user.id), user };
}

// Compatibilidad: true/false como antes (ahora también exige auth_date y compara en tiempo constante)
export function verifyTelegramWebAppData(telegramInitData) {
  return verifyTelegramUser(telegramInitData) !== null;
}

// 🛡️ 4. HERRAMIENTAS DE PARSEO
export function extractTelegramUsername(url) {
  let val = url.trim();
  if (val.startsWith('@')) return val;
  const match = val.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return '@' + match[1];
  return null;
}