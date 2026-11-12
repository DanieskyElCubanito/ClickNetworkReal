import crypto from 'crypto';

// 🛡️ 1. CIFRADO AES-256-GCM
// Sin ENCRYPTION_KEY no se cifra con una clave pública: el cifrado falla y se avisa.
function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || !String(raw).trim()) {
    throw new Error('ENCRYPTION_KEY no configurada en el servidor.');
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
}

export function encryptText(text) {
  if (!text) return null;
  const key = getEncryptionKey(); // si falta la clave, lanza error (no se guarda nada en claro ni con clave pública)
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Seguridad] Error al encriptar:', error.message);
    return null;
  }
}

export function decryptText(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const key = getEncryptionKey();
    const parts = text.split(':');
    if (parts.length !== 3) return null; // Previene fallos de desestructuración

    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[Seguridad] Fallo en desencriptado. Datos corruptos, llave incorrecta o ENCRYPTION_KEY ausente.');
    return null; // Falla de manera silenciosa para no tumbar la función serverless
  }
}

// 🛡️ 2. RATE LIMITING (en memoria, por instancia)
const rateLimitMap = new Map();
export function checkRateLimit(ip) {
  if (!ip) return true;
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

  // Sin hash válido o sin auth_date: se rechaza
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

  // Comparación en tiempo constante
  if (given.length !== calc.length || !crypto.timingSafeEqual(calc, given)) return null;

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  if (!user || user.id === undefined || user.id === null) return null;

  return { id: String(user.id), user };
}

export function verifyTelegramWebAppData(telegramInitData) {
  return verifyTelegramUser(telegramInitData) !== null;
}

// 🛡️ 4. HERRAMIENTAS DE PARSEO
export function extractTelegramUsername(url) {
  if (!url || typeof url !== 'string') return null; // Null-Safety
  let val = url.trim();
  if (val.startsWith('@')) return val;
  const match = val.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return '@' + match[1];
  return null;
}