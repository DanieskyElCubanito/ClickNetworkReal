// 🔥 BLINDAJE: Eliminamos la dependencia de 'axios' y usamos 'fetch' nativo 
// para evitar caídas del servidor por librerías faltantes.

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const BOT_ID = BOT_TOKEN.split(':')[0];

// 🔥 FAIL-FAST: Previene caídas silenciosas si falta el token en Vercel
if (!BOT_TOKEN) {
    console.error("🚨 CRÍTICO: Falta la variable TELEGRAM_BOT_TOKEN en el entorno.");
}

// 🔥 CENTRALIZACIÓN DE COMANDO
export const ADMIN_IDS = ['8968109534', '8892196101'];
export const MAIN_ADMIN_ID = '8968109534'; 

export async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
  } catch (error) {
      clearTimeout(id);
      throw error;
  }
}

export function extractTelegramUsername(url) {
  if (!url || typeof url !== 'string') return null; // Null-Safety táctico
  let val = url.trim();
  if (val.startsWith('@')) return val;
  const match = val.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return '@' + match[1];
  return null;
}

export async function notifyAdmin(message) {
  try { 
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, text: message, parse_mode: 'HTML' })
      });
  } catch (e) {
      console.error("Fallo al notificar al admin:", e.message);
  }
}

export async function notifyUser(userId, message) {
  try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'HTML' })
      });
      if (!res.ok) throw new Error("Bot bloqueado por el usuario");
  } catch (e) {
      console.log(`No se pudo enviar DM a ${userId}. (Posiblemente bloqueó el bot)`);
  }
}

export async function checkMembership(userId, chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    if (!resData.ok) return true; // Si falla Telegram, no penalizamos al usuario
    if (['left', 'kicked'].includes(resData.result.status)) return false; 
    return true; 
  } catch (error) { return true; }
}

export async function checkAdminStatus(chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${BOT_ID}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    if (!resData.ok) return false;
    return ['administrator', 'creator'].includes(resData.result.status);
  } catch (error) { return false; }
}

export async function checkAdminStatusDetailed(chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${BOT_ID}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();

    if (!resData.ok) {
      const apiError = resData.description.toLowerCase();
      if (apiError.includes('member list is inaccessible') || apiError.includes('chat not found')) {
        return { isAdmin: false, error: '⚠️ Radar bloqueado: El canal es privado o el bot no tiene permisos.' };
      }
      return { isAdmin: false, error: '⚠️ Falla táctica: Verifica que el bot sea administrador.' };
    }

    const status = resData.result.status;
    if (['administrator', 'creator'].includes(status)) return { isAdmin: true };
    return { isAdmin: false, error: `⚠️ Comando denegado: El bot requiere permisos de Administrador.` };
  } catch (error) { 
      return { isAdmin: false, error: '📡 Interferencia en el nodo de red de Telegram.' }; 
  }
}
