import axios from 'axios';

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const BOT_ID = BOT_TOKEN.split(':')[0];
export const ADMIN_IDS = ['8968109534', '8892196101'];
export const MAIN_ADMIN_ID = '8968109534'; 

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

export async function notifyAdmin(message) {
  try { 
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { 
      chat_id: MAIN_ADMIN_ID, 
      text: message, 
      parse_mode: 'HTML' 
    }); 
  } catch (e) {
    console.error("Fallo al notificar al admin");
  }
}

export async function notifyUser(userId, message) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { 
      chat_id: userId, 
      text: message, 
      parse_mode: 'HTML' 
    });
  } catch (e) {
    console.log(`No se pudo enviar DM a ${userId}. (Posiblemente bloqueó el bot)`);
  }
}

export async function checkMembership(userId, chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    
    // 🛡️ REGLA 1: Si la API falla (Rate limit, bot sin permisos, etc), NO penalizamos.
    if (!resData.ok) {
      console.log(`Error API Telegram en canal ${chatId}:`, resData.description);
      return true; 
    }

    // 🛡️ REGLA 2: Solo retornamos FALSE si abandonó o fue expulsado
    const status = resData.result.status;
    if (['left', 'kicked'].includes(status)) {
      return false; 
    }

    return true; 
  } catch (error) { 
    return true; // Timeout o error de red
  }
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
        return { isAdmin: false, error: '⚠️ Radar bloqueado: El canal es privado o el bot no tiene permisos. Añade a nuestro bot como Administrador de tu base antes de conectarla.' };
      }
      return { isAdmin: false, error: '⚠️ Falla táctica: Verifica que el bot sea administrador del grupo/canal.' };
    }
    
    const status = resData.result.status;
    if (['administrator', 'creator'].includes(status)) return { isAdmin: true };
    
    return { isAdmin: false, error: `⚠️ Comando denegado: El bot está como "${status}". Se requieren permisos de Administrador para validar las misiones de tu escuadrón.` };
  } catch (error) { 
    return { isAdmin: false, error: '📡 Interferencia en el nodo de red. Reintenta establecer conexión.' }; 
  }
}
