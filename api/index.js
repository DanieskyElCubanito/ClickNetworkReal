export const maxDuration = 60;

import { verifyTelegramWebAppData, checkRateLimit } from '../utils/security.js';
import { supabase } from '../utils/supabase.js';
import { handleAuthAndUserActions } from './auth.js';
import { handleTaskActions } from './tasks.js';
import { handleBankingActions } from './banking.js';
import { handlePublicDataActions } from './public.js';
import { handleAdminActions } from './admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 🔥 BLINDAJE 1: Extracción segura de la IP real (evita inyecciones de cabeceras falsas en proxy múltiple)
    const rawForwarded = req.headers['x-forwarded-for'];
    const clientIp = rawForwarded 
      ? String(rawForwarded).split(',')[0].trim() 
      : (req.socket?.remoteAddress || 'unknown');

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ success: false, error: 'Demasiadas solicitudes. Calma tus comandos.' });
    }

    const telegramInitData = req.headers['x-telegram-init-data'];
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
      return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente.' });
    }

    const urlParams = new URLSearchParams(telegramInitData);
    const authDate = Number(urlParams.get('auth_date') || 0);
    const currentTime = Math.floor(Date.now() / 1000);

    // Caducidad de sesión (3 horas)
    if (currentTime - authDate > 10800) {
      return res.status(403).json({ success: false, error: 'Sesión expirada por seguridad. Cierra la app y vuelve a abrirla.' });
    }

    // Identidad: SOLO el usuario de initData firmada por Telegram.
    let verifiedUser = null;
    try { verifiedUser = JSON.parse(urlParams.get('user') || 'null'); } catch { verifiedUser = null; }

    const verifiedUserId = String(verifiedUser?.id || '').trim();
    if (!verifiedUserId) {
      return res.status(403).json({ success: false, error: 'No se pudo identificar tu cuenta de Telegram.' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Cuerpo de petición vacío o inválido.' });
    }

    const { user, action, start_param, turnstileToken } = req.body;
    const targetId = verifiedUserId;

    const authUser = {
      ...(user && typeof user === 'object' ? user : {}),
      id: verifiedUserId,
      username: verifiedUser?.username ? String(verifiedUser.username).trim() : '',
      deviceId: user?.deviceId ? String(user.deviceId).trim() : 'unknown_device'
    };

    if (action === 'verify' && !authUser.username) {
      return res.status(403).json({ success: false, error: 'Debes configurar un @NombreDeUsuario en Telegram para usar la plataforma.' });
    }

    let result = null;

    result = await handleAuthAndUserActions(action, targetId, authUser, authUser.deviceId, clientIp, start_param, turnstileToken);
    if (result) return res.status(result.status).json(result.body);

    result = await handlePublicDataActions(action, targetId, req.body);
    if (result) return res.status(result.status).json(result.body);

    result = await handleTaskActions(action, targetId, req.body, verifiedUserId);
    if (result) return res.status(result.status).json(result.body);

    result = await handleBankingActions(action, targetId, req.body, verifiedUserId);
    if (result) return res.status(result.status).json(result.body);

    result = await handleAdminActions(action, targetId, req.body, verifiedUserId);
    if (result) return res.status(result.status).json(result.body);

    return res.status(400).json({ success: false, error: `Acción no reconocida: ${action}` });

  } catch (error) {
    console.error("ERROR CRÍTICO 500 en index.js:", error?.message || error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
