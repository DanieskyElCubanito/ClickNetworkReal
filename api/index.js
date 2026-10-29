export const maxDuration = 60;

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto'; 
import { TonClient, WalletContractV4, internal } from '@ton/ton'; 
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { ethers } from 'ethers';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  { auth: { persistSession: false }, realtime: { transport: WebSocket }, global: { WebSocket: WebSocket } }
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BOT_ID = BOT_TOKEN.split(':')[0];
const ADMIN_IDS = ['8968109534', '8892196101'];
const MAIN_ADMIN_ID = '8968109534'; 

const FALLBACK_MASTER_WALLET_GRAM = "UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk";
const FALLBACK_MASTER_WALLET_USDT = "0x3062f1AbE78Cef11190c8A654Ef7F9e101E4eAce";

const tonClient = new TonClient({ 
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TONCENTER_API_KEY || ''
});

const BSC_RPC = "https://bsc-dataseed.binance.org/";
const USDT_BEP20_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// 🛡️ 1. CIFRADO AES-256-GCM (Vulnerabilidad Criptográfica)
const RAW_KEY = process.env.ENCRYPTION_KEY || 'TeleGemFallbackKey2026NeedsToChangeNow';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); 

function encryptText(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptText(text) {
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
function checkRateLimit(ip) {
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
function verifyTelegramWebAppData(telegramInitData) {
  if (!telegramInitData || !BOT_TOKEN) return false;
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');

  const authDate = urlParams.get('auth_date');
  if (authDate) {
    const timeDiff = (Date.now() / 1000) - Number(authDate);
    if (timeDiff > 86400) return false; 
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

async function getTonPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const data = await res.json();
    return data['the-open-network'].usd || 5.0;
  } catch (e) { return 5.0; }
}

function getDerivedUsdtWallet(userId) {
  const masterKey = process.env.BSC_PRIVATE_KEY; 
  if (!masterKey) throw new Error("Falta la variable BSC_PRIVATE_KEY en Vercel.");
  const userPrivKey = ethers.keccak256(ethers.toUtf8Bytes(masterKey + "_clicknetwork_" + userId));
  return new ethers.Wallet(userPrivKey);
}

async function sweepUsdtAutomated(derivedWallet, usdtAmountWei) {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const connectedDerived = derivedWallet.connect(provider);
    const masterWallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, provider);

    let sweepDestination = FALLBACK_MASTER_WALLET_USDT;
    const { data: cfg } = await supabase.from('system_settings').select('master_wallet_usdt_bep20').eq('id', 1).maybeSingle();
    if (cfg && cfg.master_wallet_usdt_bep20) sweepDestination = cfg.master_wallet_usdt_bep20;

    const usdtAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
    const usdtContract = new ethers.Contract(USDT_BEP20_ADDRESS, usdtAbi, connectedDerived);

    const bnbBalance = await provider.getBalance(derivedWallet.address);
    const minBnbGas = ethers.parseEther("0.0004");

    if (bnbBalance < minBnbGas) {
      const fundTx = await masterWallet.sendTransaction({
        to: derivedWallet.address,
        value: minBnbGas - bnbBalance
      });
      await fundTx.wait(); 
    }

    const tx = await usdtContract.transfer(sweepDestination, usdtAmountWei);
    await tx.wait();
  } catch (error) {
    console.error("Error en barrido automático USDT:", error);
  }
}

// 🔥 NUEVO: Función para hacer que el sistema espere
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendTonAutomated(destinationAddress, usdtAmount) {
  const mnemonic = process.env.MASTER_WALLET_MNEMONIC; 
  if (!mnemonic) throw new Error("Falta la variable MASTER_WALLET_MNEMONIC en Vercel.");

  const tonPrice = await getTonPrice();
  // Nos aseguramos de que sean números reales
  const tonAmount = Number(usdtAmount) / Number(tonPrice); 

  // Mantenemos la conversión perfecta a NanoTONs
  const amountInNano = BigInt(Math.floor(tonAmount * 1000000000));

  const mnemonics = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = tonClient.open(wallet);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
      seqno: seqno || 0,
      secretKey: keyPair.secretKey,
      messages: [internal({ to: destinationAddress, value: amountInNano, bounce: false, body: "Retiro TeleGem" })],
      sendMode: 3 
  });

  // 🔥 NUEVO: Esperamos 8 segundos a que la blockchain confirme el bloque
  console.log("Pago enviado. Esperando 8 segundos a la blockchain...");
  await sleep(8000); 

  try {
    // Consultamos la API pública para atrapar el TXID de esta transacción específica
    const res = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${destinationAddress}&limit=1`);
    const data = await res.json();
    
    if (data.ok && data.result.length > 0) {
      const base64Hash = data.result[0].transaction_id.hash;
      // Convertimos el Hash a Hexadecimal para que el enlace a Tonscan funcione perfecto
      return Buffer.from(base64Hash, 'base64').toString('hex'); 
    }
  } catch (error) {
    console.error("Fallo al buscar el TXID:", error);
  }
  
  // Respaldo por si la red de GRAM tarda más de 15 segundos en procesar
  return "Transaccion_En_Proceso"; 
}


function extractTelegramUsername(url) {
  let val = url.trim();
  if (val.startsWith('@')) return val;
  const match = val.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return '@' + match[1];
  return null;
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

async function notifyAdmin(message) {
  try { await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: MAIN_ADMIN_ID, text: message, parse_mode: 'HTML' }); } catch (e) {}
}

async function notifyUser(userId, message) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: userId, text: message, parse_mode: 'HTML' });
  } catch (e) {
    console.log(`No se pudo enviar DM a ${userId}. (Posiblemente bloqueó el bot)`);
  }
}

async function checkMembership(userId, chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    if (!resData.ok) return false;
    return ['member', 'administrator', 'creator'].includes(resData.result.status);
  } catch (error) { return false; }
}

async function checkAdminStatus(chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${BOT_ID}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    if (!resData.ok) return false;
    return ['administrator', 'creator'].includes(resData.result.status);
  } catch (error) { return false; }
}

async function checkAdminStatusDetailed(chatId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${BOT_ID}`;
    const response = await fetchWithTimeout(url);
    const resData = await response.json();
    if (!resData.ok) return { isAdmin: false, error: resData.description };
    const status = resData.result.status;
    if (['administrator', 'creator'].includes(status)) return { isAdmin: true };
    return { isAdmin: false, error: `El bot es ${status}, no es administrador.` };
  } catch (error) { return { isAdmin: false, error: error.message }; }
}

async function runRetentionAudit(userId) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTasks } = await supabase
      .from('user_completed_tasks')
      .select('task_id, created_at, tasks!inner(type, url, reward, title)')
      .eq('user_id', userId)
      .gte('created_at', yesterday);

    if (!recentTasks || recentTasks.length === 0) return;

    for (const item of recentTasks) {
      const t = item.tasks;
      if (t && (t.type === 'group' || t.type === 'channel')) {
        const chatId = extractTelegramUsername(t.url);
        if (chatId) {
          const isStillMember = await checkMembership(userId, chatId);
          if (!isStillMember) {
            const penaltyAmount = Number(t.reward || 0);

            // 🛠️ DEDUCCIÓN DIRECTA SIN RPC (Fix Penalidad e Inflación)
            const { data: pUser } = await supabase.from('users').select('balance, total_earnings').eq('id', userId).single();
            if (pUser) {
              const newBal = Math.max(0, Number(pUser.balance) - penaltyAmount);
              const newTot = Math.max(0, Number(pUser.total_earnings) - penaltyAmount);
              await supabase.from('users').update({ balance: newBal, total_earnings: newTot }).eq('id', userId);

              await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', userId);
              const { data: currentTask } = await supabase.from('tasks').select('completions_done').eq('id', item.task_id).single();
              if (currentTask) await supabase.from('tasks').update({ completions_done: Math.max(0, currentTask.completions_done - 1) }).eq('id', item.task_id);

              const gemasPenalidad = (penaltyAmount * 1000).toFixed(2);
              await supabase.from('history_logs').insert([{ 
                user_id: userId, 
                title: '⚠️ Penalidad de Permanencia', 
                description: `Saliste de la comunidad antes de 24h. Sanción: -${gemasPenalidad} Gemas.`, 
                amount: -penaltyAmount 
              }]);

              const penaltyMsg = `⚠️ <b>PENALIZACIÓN DE RED</b>\n\nHemos detectado que has abandonado la comunidad <b>${t.title}</b> antes de completar el ciclo mínimo de 24 horas.\n\n🔻 Se han deducido <b>${gemasPenalidad} Gemas</b> de tu balance.\n\n<i>El sistema audita continuamente la permanencia para garantizar tráfico de calidad.</i>`;
              await notifyUser(userId, penaltyMsg);
            }
          }
        }
      }
    }
  } catch (error) { console.error("Error en auditoría silenciosa:", error); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ success: false, error: 'Demasiadas solicitudes. Intente más tarde.' });
    }

    const telegramInitData = req.headers['x-telegram-init-data'];
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente. Abre la app desde el bot oficial.' });
    }

    if (!req.body) {
      return res.status(400).json({ success: false, error: 'Cuerpo de solicitud vacío.' });
    }

    const { user, action, userId, start_param } = req.body; 

    if (action === 'verify') {
      const targetUser = user || { id: userId, is_premium: false };
      const targetId = String(targetUser?.id);
      const deviceId = targetUser?.deviceId || 'unknown_device';

      if (!targetId || targetId === 'undefined') return res.status(400).json({ success: false, error: 'No user id' });

      runRetentionAudit(targetId).catch(err => console.error("Fallo asíncrono auditoría:", err));

      let { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
      if (dbError) throw new Error("Error en Supabase (select user): " + dbError.message);

      if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

      let isMultiAccount = false;
      let existingOwner = null;

      if (deviceId !== 'unknown_device') {
        const { data: existingDeviceUser } = await supabase
          .from('users')
          .select('id')
          .eq('device_id', deviceId)
          .neq('id', targetId)
          .maybeSingle();

        if (existingDeviceUser) {
          isMultiAccount = true;
          existingOwner = existingDeviceUser.id;
        }
      }

      if (!dbUser) {
        if (isMultiAccount) {
          notifyAdmin(`⚠️ <b>Alerta Multicuenta Detectada</b>\nEl dispositivo <code>${deviceId}</code> intentó registrar la cuenta <code>${targetId}</code> pero ya pertenecía a <code>${existingOwner}</code>.`);
        }

        const newUserObj = { 
          id: targetId, 
          username: targetUser.username || 'Usuario', 
          balance: 0, 
          deposit_balance: 0, 
          total_earnings: 0, 
          referral_earnings: 0, 
          is_human: !isMultiAccount, 
          device_id: deviceId,
          last_ip: clientIp,
          referral_reward_granted: !isMultiAccount 
        };

       // 🔥 CÓDIGO NUEVO (Registra Clones en el Muro de la Vergüenza)
        if (start_param && String(start_param) !== targetId) {
          const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
          if (inviter) {
            // 🔥 Siempre vinculamos la cuenta (Incluso si es clon) para que salga en su pestaña "Mi Red"
            newUserObj.referred_by = String(start_param);
            
            if (!isMultiAccount) {
              // 🏆 Solo si NO ES MULTICUENTA, suma puntos en torneos y le da beneficios reales
              const { data: activeEv } = await supabase.from('events').select('id, event_type').eq('status', 'active').maybeSingle();
              if (activeEv && activeEv.event_type === 'referral') {
                const { data: part } = await supabase.from('event_participants').select('score').eq('event_id', activeEv.id).eq('user_id', String(start_param)).maybeSingle();
                if (part) {
                  await supabase.from('event_participants').update({ score: part.score + 1 }).eq('event_id', activeEv.id).eq('user_id', String(start_param));
                } else {
                  await supabase.from('event_participants').insert([{ event_id: activeEv.id, user_id: String(start_param), score: 1 }]);
                }
              }
            } else {
              // 🚫 Si es Multicuenta (Trampa), avisa al admin y lo registra sin darle ningún premio
              notifyAdmin(`🚨 <b>Intento de Fraude de Referidos Bloqueado</b>\nLa cuenta clon <code>${targetId}</code> intentó usar el referido de <code>${start_param}</code> desde el mismo dispositivo físico. \n\n<i>Se agregó a su Muro de la Vergüenza como BLOQUEADO.</i>`);
            }
          }
        }


        const { data: newUser, error: insertError } = await supabase.from('users').insert([newUserObj]).select().single();
        if (insertError) throw new Error("Error en Supabase (insert user): " + insertError.message);
        dbUser = newUser;
      } else {
        await supabase.from('users').update({ device_id: deviceId, last_ip: clientIp }).eq('id', targetId);
      }

      const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);

      return res.status(200).json({ 
        success: true, 
        user: dbUser, 
        stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) } 
      });
    }

    if (action === 'get-global-stats') {
      try {
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });

        const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('status', 'completed');
        const totalWithdrawnUsdt = withdrawals ? withdrawals.reduce((sum, w) => sum + Number(w.amount), 0) : 0;
        const totalGemsWithdrawn = totalWithdrawnUsdt * 1000;

        const { data: deposits } = await supabase.from('users').select('deposit_balance');
        const totalDeposited = deposits ? deposits.reduce((sum, u) => sum + Number(u.deposit_balance), 0) : 0;

        const { data: statsRow } = await supabase.from('platform_stats').select('total_global_clicks').eq('id', 1).maybeSingle();
        const totalGlobalClicks = statsRow ? statsRow.total_global_clicks : 0;

        const launchDate = new Date("2026-10-01T00:00:00Z");
        const daysOnline = Math.floor((Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24));

        return res.status(200).json({
          success: true,
          stats: {
            users: totalUsers || 0,
            withdrawn: totalGemsWithdrawn,
            deposited: totalDeposited,
            globalClicks: totalGlobalClicks,
            daysOnline: Math.max(1, daysOnline)
          }
        });
      } catch (error) {
        return res.status(400).json({ success: false, error: 'Error calculando stats' });
      }
    }

    if (action === 'get-active-event') {
      try {
        const { data: activeEvent } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .maybeSingle();

        if (!activeEvent) {
          return res.status(200).json({ success: true, activeEvent: null, leaderboard: [] });
        }

        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id, score')
          .eq('event_id', activeEvent.id)
          .order('score', { ascending: false })
          .limit(10);

        const leaderboard = [];
        if (participants) {
          for (const p of participants) {
            const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).single();
            leaderboard.push({
              userId: p.user_id,
              username: u?.username || 'Usuario',
              score: p.score
            });
          }
        }

        return res.status(200).json({ success: true, activeEvent, leaderboard });
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Error obteniendo evento' });
      }
    }

    if (action === 'admin-create-event') {
      const { adminId, title, event_type, start_date, end_date, prizes } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      const { data, error } = await supabase.from('events').insert([{
        title,
        event_type,
        status: 'active',
        start_date,
        end_date,
        prizes: prizes || []
      }]).select().single();

      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, event: data });
    }

        if (action === 'admin-manage-event') {
      const { adminId, eventId, newStatus } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      if (newStatus === 'deleted') {
        await supabase.from('events').delete().eq('id', eventId);
      } else {
        // 🔥 Forzamos la actualización por ID y también cerramos cualquier otro que estuviera activo
        await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
        await supabase.from('events').update({ status: 'completed' }).eq('status', 'active');
      }
      return res.status(200).json({ success: true });
    }


        // 🔥 NUEVO: Obtener el historial de torneos finalizados y sus ganadores
    if (action === 'admin-get-past-events') {
      const { adminId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      const { data: pastEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('end_date', { ascending: false })
        .limit(10);

      if (error) return res.status(400).json({ success: false, error: error.message });

      const eventsWithWinners = [];
      for (const ev of pastEvents) {
        // Buscar a los 3 mejores de ese torneo específico
        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id, score')
          .eq('event_id', ev.id)
          .order('score', { ascending: false })
          .limit(3);

        const winners = [];
        if (participants) {
          for (const p of participants) {
            const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).maybeSingle();
            winners.push({ userId: p.user_id, username: u?.username || 'Usuario', score: p.score });
          }
        }
        eventsWithWinners.push({ ...ev, winners });
      }

      return res.status(200).json({ success: true, pastEvents: eventsWithWinners });
    }

    if (action === 'get-leaderboard') {
      const { data: topTasks } = await supabase
        .from('user_completed_tasks')
        .select('user_id, count(*)')
        .group('user_id')
        .order('count', { ascending: false })
        .limit(10);

      const completedRanking = [];
      if (topTasks) {
        for (const item of topTasks) {
          const { data: usr } = await supabase.from('users').select('username').eq('id', item.user_id).single();
          completedRanking.push({
            id: item.user_id,
            username: usr?.username || 'Usuario',
            score: item.count
          });
        }
      }

      const { data: topReferrers } = await supabase
        .from('users')
        .select('id, username, referral_earnings')
        .order('referral_earnings', { ascending: false })
        .limit(10);

      return res.status(200).json({ 
        success: true, 
        topTasks: completedRanking, 
        topReferrals: topReferrers || [] 
      });
    }

    if (action === 'admin-get-config') {
      const { adminId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      return res.status(200).json({ success: true, config: data || { master_wallet_gram: '', master_wallet_usdt_bep20: '' } });
    }

    if (action === 'admin-update-config') {
      const { adminId, config } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      const { error } = await supabase.from('system_settings').upsert({ id: 1, master_wallet_gram: config.master_wallet_gram, master_wallet_usdt_bep20: config.master_wallet_usdt_bep20 });
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === 'admin-stats') {
      const { adminId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      const { data: usersData } = await supabase.from('users').select('id');
      const { data: tasksData } = await supabase.from('tasks').select('id');
      return res.status(200).json({ success: true, stats: { users: usersData ? usersData.length : 0, tasks: tasksData ? tasksData.length : 0 } });
    }

    if (action === 'admin-search-user') {
      const { adminId, targetId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      const { data: foundUser } = await supabase.from('users').select('*').eq('id', String(targetId)).maybeSingle();
      if (!foundUser) return res.status(400).json({ success: false });
      return res.status(200).json({ success: true, user: foundUser });
    }

    if (action === 'admin-update-user') {
      const { adminId, targetId, update } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      await supabase.from('users').update(update).eq('id', String(targetId));
      return res.status(200).json({ success: true });
    }

    if (action === 'admin-get-withdrawals') {
      const { adminId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return res.status(200).json({ success: true, withdrawals: withdrawals || [] });
    }

    async function notifyPaymentChannel(userId, usdtAmount, walletAddress, realTxid) {
      try {
        const { data: user } = await supabase.from('users').select('username').eq('id', userId).single();
        const usernameDisplay = user?.username && user.username !== 'Usuario' ? `@${user.username}` : `ID: ${userId}`;

        const tonPrice = await getTonPrice();
        const tonAmount = (usdtAmount / tonPrice).toFixed(4);

        const usdtDisplay = Number(usdtAmount).toFixed(2);
        const gemasDisplay = (Number(usdtAmount) * 1000).toFixed(0); 

        // 🔥 NUEVO: Manejo de errores si Vercel corta antes de conseguir el TXID real
        const esHashValido = realTxid && realTxid.length > 20 && realTxid !== "Transaccion_En_Proceso";
        
        const enlaceBlockchain = esHashValido 
          ? `🔹 <b>Ver Transacción en Blockchain:</b>\n<a href="https://tonscan.org/tx/${realTxid}">${realTxid.substring(0, 12)}...</a>\n\n`
          : `🔹 <b>Comprobante Blockchain:</b>\n<i>Procesado (Validando en red...)</i>\n<a href="https://tonviewer.com/${walletAddress}#transfers">Ver Historial de Cuenta ➔</a>\n\n`;

        const message = `💎 <b>PAGO VERIFICADO EXITOSAMENTE</b>\n\n` +
                        `👤 <b>Beneficiario:</b> ${usernameDisplay}\n` +
                        `💎 <b>Canje:</b> ${gemasDisplay} Gemas\n` +
                        `💵 <b>Valor:</b> ${usdtDisplay} USDT\n` +
                        `💸 <b>Enviado:</b> ${tonAmount} GRAM\n` +
                        `🛡️ <b>Red:</b> TON Blockchain\n` +
                        `⚡ <b>Estado:</b> Finalizado / 100%\n\n` +
                        enlaceBlockchain +
                        `🔥 ¡Retiros procesados con total transparencia!`;

        const keyboard = {
          inline_keyboard: [
            [
              { 
                text: "💰 ¡QUIERO GANAR GRAM AHORA!", 
                url: "https://t.me/TeleGemAds_bot/app",
                style: "success" 
              }
            ]
          ]
        };

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: '-1002352835078',
          text: message,
          parse_mode: 'HTML',
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      } catch (error) {
        console.error("Error enviando notificación al canal de pagos:", error);
      }
    }

    if (action === 'admin-approve-withdrawal') {
      const { adminId, withdrawalId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
      if (!withdrawal) return res.status(400).json({ success: false, error: 'Retiro no encontrado.' });
      if (withdrawal.status === 'completed') return res.status(400).json({ success: false, error: 'Este retiro ya fue pagado.' });

      try {
        // 1. Capturamos el TXID real que devuelve la función después de los 15 segundos
        const realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
        
        await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
        
        // 2. Le enviamos el realTxid al canal para que arme el enlace
        await notifyPaymentChannel(withdrawal.user_id, withdrawal.amount, withdrawal.wallet_address, realTxid);

        const gemasRetiradas = (Number(withdrawal.amount) * 1000).toFixed(2);
        const userMsg = `✅ <b>¡TU RETIRO HA SIDO ENVIADO!</b>\n\nHemos procesado tu retiro de <b>${gemasRetiradas} Gemas</b> exitosamente.\n\nRevisa tu billetera TON para confirmar la recepción de los fondos.`;
        await notifyUser(withdrawal.user_id, userMsg);

        const { data: lastLog } = await supabase.from('history_logs')
          .select('id')
          .eq('user_id', withdrawal.user_id)
          .eq('title', '📤 Retiro Procesando')
          .eq('amount', -Number(withdrawal.amount))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog) {
          await supabase.from('history_logs').update({
            title: '✅ Retiro Completado',
            // 3. Actualizamos el historial para que el usuario tenga un enlace clickeable a Tonscan
            description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank" style="color:#00f0ff; text-decoration:underline;">Ver Transacción ➔</a>`
          }).eq('id', lastLog.id);
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("Fallo al enviar cripto:", error);
        return res.status(400).json({ success: false, error: 'Fallo en blockchain. Revisa el saldo de tu Master Wallet.' });
      }
    }

    if (action === 'admin-reject-withdrawal') {
      const { adminId, withdrawalId, reason } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
      if (!withdrawal) return res.status(400).json({ success: false, error: 'Retiro no encontrado.' });
      if (withdrawal.status === 'completed') return res.status(400).json({ success: false, error: 'Este retiro ya fue procesado y no puede rechazarse.' });

      const { data: userToRefund } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
      if (userToRefund) {
        const refundedBalance = Number((Number(userToRefund.balance) + Number(withdrawal.amount)).toFixed(4));
        await supabase.from('users').update({ balance: refundedBalance }).eq('id', withdrawal.user_id);
      }

      await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);

      const gemasReembolso = (Number(withdrawal.amount) * 1000).toFixed(2);
      const userMsg = `❌ <b>RETIRO RECHAZADO</b>\n\nTu solicitud de retiro por <b>${gemasReembolso} Gemas</b> fue rechazada.\nMotivo: <i>${reason || 'Revisión de seguridad'}</i>\n\nLos fondos han sido devueltos a tu cuenta.`;
      await notifyUser(withdrawal.user_id, userMsg);

      const { data: lastLog } = await supabase.from('history_logs')
        .select('id')
        .eq('user_id', withdrawal.user_id)
        .eq('title', '📤 Retiro Procesando')
        .eq('amount', -Number(withdrawal.amount))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

            if (lastLog) {
        await supabase.from('history_logs').update({
          title: '❌ Retiro Rechazado',
          description: reason ? `Reembolso: +${gemasReembolso} Gemas. Motivo: ${reason}` : `Fondos devueltos por seguridad: +${gemasReembolso} Gemas.`,
          
          // 🔥 CAMBIO EXACTO: Antes decía 0, ahora devuelve la cantidad en positivo
          amount: Number(withdrawal.amount) 
          
        }).eq('id', lastLog.id);
      }


      return res.status(200).json({ success: true });
    }

    if (action === 'request-withdrawal') {
      const targetId = String(userId || user?.id);
      const { address, amount } = req.body;
      let withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.05) return res.status(400).json({ success: false, error: 'Mínimo: 0.05 USDT.' });

      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);
      const todayStr = todayDate.toISOString();

      const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);
      const { count: adsCount } = await supabase.from('history_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetId)
        .like('description', '%[AdView]%')
        .gte('created_at', todayStr);

      if ((refCount || 0) < 3 && (adsCount || 0) < 15) {
        return res.status(400).json({ 
          success: false, 
          error: `Requisito incompleto: Necesitas 3 referidos activos (tienes ${refCount || 0}) O ver 15 anuncios hoy (llevas ${adsCount || 0}/15).` 
        });
      }

      await runRetentionAudit(targetId).catch(e => console.error("Error audit pre-retiro", e));

      const { data: recentTasks } = await supabase.from('user_completed_tasks')
        .select('task_id, tasks(type, url, reward)')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(5); 

      let penaltyAmount = 0;
      if (recentTasks) {
        for (const item of recentTasks) {
          const t = item.tasks;
          if (t && (t.type === 'group' || t.type === 'channel')) {
            const chatId = extractTelegramUsername(t.url);
            if (chatId) {
              const isStillMember = await checkMembership(targetId, chatId);
              if (!isStillMember) {
                penaltyAmount += Number(t.reward || 0);
                await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', targetId);
                const { data: currentTask } = await supabase.from('tasks').select('completions_done').eq('id', item.task_id).single();
                if (currentTask) await supabase.from('tasks').update({ completions_done: Math.max(0, currentTask.completions_done - 1) }).eq('id', item.task_id);
              }
            }
          }
        }
      }

      // 🛠️ DEDUCCIÓN DIRECTA HIT & RUN Y RETIRO (Sin RPC)
      let newBalance = 0;
      const { data: wUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).single();
      
      if (!wUser) return res.status(400).json({ success: false, error: 'Usuario no encontrado.' });

      if (penaltyAmount > 0) {
        const balAfterPenalty = Math.max(0, Number(wUser.balance) - penaltyAmount);
        const totAfterPenalty = Math.max(0, Number(wUser.total_earnings) - penaltyAmount);
        await supabase.from('users').update({ balance: balAfterPenalty, total_earnings: totAfterPenalty }).eq('id', targetId);
        
        notifyAdmin(`⚖️ <b>Penalidad Hit&Run Aplicada</b>\nUsuario <code>${targetId}</code> se salió de canales.\nPenalidad: -${penaltyAmount.toFixed(4)} USDT.`);

        await supabase.from('history_logs').insert([{ 
          user_id: targetId, 
          title: '⚠️ Penalidad de Red', 
          description: `Abandono de canales. Sanción: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, 
          amount: -penaltyAmount 
        }]);

        withdrawAmount = withdrawAmount - penaltyAmount;
        if (withdrawAmount < 0.05) return res.status(400).json({ success: false, error: `Se dedujeron ${penaltyAmount.toFixed(4)} USDT por abandonar canales. Saldo insuficiente para retirar.` });
        
        wUser.balance = balAfterPenalty;
      }

      if (Number(wUser.balance) < withdrawAmount) {
         return res.status(400).json({ success: false, error: 'Saldo insuficiente o transacción bloqueada por seguridad.' });
      }

      newBalance = Number((Number(wUser.balance) - withdrawAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);

      const { data: withdrawal, error: withdrawError } = await supabase.from('withdrawals').insert([{
        user_id: targetId, wallet_address: address, amount: withdrawAmount,
        status: withdrawAmount <= 0.9 ? 'processing' : 'pending'
      }]).select().single();

      if (withdrawError || !withdrawal) {
        await supabase.from('users').update({ balance: newBalance + withdrawAmount }).eq('id', targetId);
        return res.status(400).json({ success: false, error: `Error en BD.` });
      }

      const withdrawGemasStr = (withdrawAmount * 1000).toFixed(2);
      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '📤 Retiro Procesando', 
        description: `Destino: ${address.substring(0,8)}... | -${withdrawGemasStr} Gemas`, 
        amount: -withdrawAmount 
      }]);

      if (withdrawAmount <= 0.9) {
          try {
              // 🔥 1. Capturamos el TXID real del retiro automático
              const realTxid = await sendTonAutomated(address, withdrawAmount);
              
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
              
              // 🔥 2. Se lo pasamos al canal para que el enlace no se rompa
              await notifyPaymentChannel(targetId, withdrawAmount, address, realTxid);

              const userMsg = `✅ <b>¡TU RETIRO HA SIDO ENVIADO!</b>\n\nHemos procesado tu retiro automático de <b>${withdrawGemasStr} Gemas</b> exitosamente a la blockchain TON.`;
              await notifyUser(targetId, userMsg);

              const { data: lastLog } = await supabase.from('history_logs')
                .select('id')
                .eq('user_id', targetId)
                .eq('title', '📤 Retiro Procesando')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastLog) {
                await supabase.from('history_logs').update({
                  title: '✅ Retiro Completado',
                  // 🔥 3. Historial con enlace clickeable hacia Tonscan
                  description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank" style="color:#00f0ff; text-decoration:underline;">Ver Transacción ➔</a>`
                }).eq('id', lastLog.id);
              }

              return res.status(200).json({ success: true, balance: newBalance, message: 'Pago enviado a la blockchain.' });
          } catch (err) {
              await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal.id);
              return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en cola manual por alta red.' });
          }
      } else {
          return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en revisión administrativa.' });
      }
     }


    if (action === 'generate-usdt-wallet') {
      const { price } = req.body;
      const targetId = String(userId);

      let masterUsdtWallet = "0x3062f1AbE78Cef11190c8A654Ef7F9e101E4eAce"; 
      try {
        const { data: cfg } = await supabase.from('system_settings').select('master_wallet_usdt_bep20').eq('id', 1).maybeSingle();
        if (cfg && cfg.master_wallet_usdt_bep20) {
          masterUsdtWallet = cfg.master_wallet_usdt_bep20;
        }
      } catch (e) {}

      const { ethers } = await import('ethers');
      const randomWallet = ethers.Wallet.createRandom();
      const publicAddress = randomWallet.address;
      const privateKey = randomWallet.privateKey;

      const encryptedKey = encryptText(privateKey);

      const { data: newIntent, error: intentErr } = await supabase.from('payment_intents').insert([{ 
        user_id: targetId, 
        expected_amount: Number(price), 
        public_wallet: publicAddress, 
        encrypted_private_key: encryptedKey, 
        status: 'pending' 
      }]).select().single();

      if (intentErr) return res.status(400).json({ success: false, error: intentErr.message });

      return res.status(200).json({ success: true, wallet: publicAddress, intentId: newIntent.id });
    }

    if (action === 'verify-usdt-payment') {
      const { intentId, clicks } = req.body; 
      const targetId = String(userId);
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'Intento no procesado o completado.' });

      const provider = new ethers.JsonRpcProvider(BSC_RPC);
      const usdtAbi = ["function balanceOf(address owner) view returns (uint256)"];
      const usdtContract = new ethers.Contract(USDT_BEP20_ADDRESS, usdtAbi, provider);

      const balanceWei = await usdtContract.balanceOf(intent.public_wallet);
      const balanceUsdt = Number(ethers.formatUnits(balanceWei, 18));

      if (balanceUsdt < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo en blockchain: ${balanceUsdt.toFixed(2)} USDT.` });

      const { data: dbUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);

      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '📥 Recarga de Bóveda', 
        description: `Depósito BSC (BEP20): $${Number(clicks).toFixed(2)} USDT acreditados.`, 
        amount: 0 
      }]);

      const derivedWallet = getDerivedUsdtWallet(targetId);
      sweepUsdtAutomated(derivedWallet, balanceWei).catch(e => console.error("Fallo barrido:", e));

      return res.status(200).json({ success: true, deposit_balance: newDepositBalance });
    }

    if (action === 'generate-payment-wallet') {
      const { price } = req.body;
      const targetId = String(userId);
      const mnemonics = await mnemonicNew(); 
      const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

      const secretWords = mnemonics.join(" ");
      const encryptedKey = encryptText(secretWords);

      const { data: newIntent } = await supabase.from('payment_intents').insert([{ 
        user_id: targetId, expected_amount: price, 
        public_wallet: wallet.address.toString({ urlSafe: true, bounceable: false }), 
        encrypted_private_key: encryptedKey, status: 'pending' 
      }]).select().single();

      return res.status(200).json({ success: true, wallet: newIntent.public_wallet, intentId: newIntent.id });
    }

    if (action === 'verify-crypto-payment') {
      const { intentId, clicks } = req.body; 
      const targetId = String(userId);
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'No procesado.' });

      const balanceNano = await tonClient.getBalance(intent.public_wallet);
      const balanceGram = Number(balanceNano) / 1e9; 
      if (balanceGram < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo actual: ${balanceGram.toFixed(4)} GRAM.` });

      const { data: dbUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);

      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '📥 Recarga de Bóveda', 
        description: `Depósito TON (GRAM): $${Number(clicks).toFixed(2)} USDT acreditados.`, 
        amount: 0 
      }]);

      try {
        let sweepWallet = FALLBACK_MASTER_WALLET_GRAM;
        const { data: cfg } = await supabase.from('system_settings').select('master_wallet_gram').eq('id', 1).maybeSingle();
        if (cfg && cfg.master_wallet_gram) sweepWallet = cfg.master_wallet_gram;

        const secretWords = decryptText(intent.encrypted_private_key);
        const mnemonics = secretWords.split(" "); 
        const keyPair = await mnemonicToPrivateKey(mnemonics);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const contract = tonClient.open(wallet); 
        const seqno = await contract.getSeqno();

        await contract.sendTransfer({ seqno: seqno || 0, secretKey: keyPair.secretKey, messages: [ internal({ to: sweepWallet, value: 0n, bounce: false, body: "Barrido" }) ], sendMode: 128 });
      } catch (sweepError) {}
      return res.status(200).json({ success: true, deposit_balance: newDepositBalance });
    }

    if (action === 'verify-admin') {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'Enlace no proporcionado.' });

      const chatId = extractTelegramUsername(url);
      if (!chatId) return res.status(400).json({ success: false, error: 'Formato de enlace inválido. Usa @usuario o t.me/usuario.' });

      const adminCheck = await checkAdminStatusDetailed(chatId);

      if (adminCheck.isAdmin) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: adminCheck.error || 'El bot no tiene permisos de administrador en esa comunidad.' });
      }
    }

    if (action === 'create-task') {
      const { creator_id, type, title, url, bot_token, completions_total, reward, validation_code } = req.body;
      const targetId = String(creator_id || userId);

      const count = Number(completions_total || 100); 
      const rew = Number(reward || 0.001); 
      const totalCost = Number((count * rew * 1.30).toFixed(4));

      // 🛠️ DEDUCCIÓN DE BÓVEDA SIN RPC
      const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      if (!cUser || Number(cUser.deposit_balance) < totalCost) {
         return res.status(400).json({ success: false, error: 'Capital de Bóveda insuficiente.' });
      }
      const newVaultBalance = Number((Number(cUser.deposit_balance) - totalCost).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newVaultBalance }).eq('id', targetId);

      const { data: newTask, error: taskError } = await supabase.from('tasks').insert([{ 
        creator_id: targetId, type, title, url, bot_token: bot_token || null, 
        completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, 
        status: 'active', validation_code: validation_code || null,
        current_clicks: 0, target_clicks: count
      }]).select().single();

      if (taskError || !newTask) {
        await supabase.from('users').update({ deposit_balance: newVaultBalance + totalCost }).eq('id', targetId);
        return res.status(400).json({ success: false, error: `Fallo BD. Saldo devuelto.` });
      }

      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '🚀 Campaña Activada', 
        description: `Despliegue de "${title}" (${count} cupos) | -$${totalCost.toFixed(2)} USDT de Bóveda.`, 
        amount: -totalCost 
      }]);
      return res.status(200).json({ success: true, task: newTask, deposit_balance: newVaultBalance });
    }

    if (action === 'get-tasks') {
      const targetId = String(userId);
      const { data: allTasks } = await supabase.from('tasks').select('*').or(`status.in.(active,paused),creator_id.eq.${targetId}`).order('created_at', { ascending: false });

      const { data: completedRows } = await supabase.from('user_completed_tasks').select('task_id').eq('user_id', targetId);
      const completedIds = new Set((completedRows || []).map(r => String(r.task_id)));

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: historyLogs } = await supabase.from('history_logs').select('description').eq('user_id', targetId).gte('created_at', yesterday);
      const completedDailyIds = new Set();
      
      let gigaPubClaimed = false; // 🔥 NUEVO: Variable para el botón visual
      
      if (historyLogs) {
         historyLogs.forEach(log => {
           const match = log.description?.match(/\[Daily:(.+?)\]/);
           if (match) completedDailyIds.add(match[1]);
           // 🔥 NUEVO: Buscamos si ya reclamó GigaPub hoy
           if (log.description?.includes('[GigaPubDaily]')) gigaPubClaimed = true; 
         });
      }

      const mappedTasks = (allTasks || []).map(t => {
        const isDaily = t.type.startsWith('daily_') || t.type === 'daily';
        return { ...t, reward: (t.reward || 1), is_completed: isDaily ? completedDailyIds.has(String(t.id)) : completedIds.has(String(t.id)) };
      });

      // 🔥 NUEVO: Agregamos gigaPubClaimed a la respuesta
      return res.status(200).json({ success: true, tasks: mappedTasks, gigaPubClaimed });
    }


        // 🔥 NUEVO: Recompensa diaria ahora usando Giga Pub
    if (action === 'claim-gigapub-daily') {
      const targetId = String(userId);
      const earnedGemas = 5.00; 
      const rewardForDb = earnedGemas / 1000;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentLog } = await supabase.from('history_logs').select('id').eq('user_id', targetId).like('description', '%[GigaPubDaily]%').gte('created_at', yesterday).maybeSingle();
      if (recentLog) return res.status(400).json({ success: false, error: 'Ya reclamaste tu bono hoy. Vuelve mañana.' });

      const { data: dbUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + rewardForDb).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardForDb).toFixed(4));
      
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
      
      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '🎁 Bono Diario (Check-in)', 
        description: `Anuncio completado [GigaPubDaily] | +${earnedGemas.toFixed(2)} Gemas`, 
        amount: rewardForDb 
      }]);
      
      return res.status(200).json({ success: true, earned_gemas: earnedGemas.toFixed(2), balance: newBalance });
    }


    if (action === 'complete-task') {
      const { taskId, validation_code_input } = req.body; 
      const targetId = String(userId);

      const { data: lastLog } = await supabase
        .from('history_logs')
        .select('created_at')
        .eq('user_id', targetId)
        .eq('title', '✅ Tarea Completada')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        const lastTime = new Date(lastLog.created_at).getTime();
        const now = Date.now();
        if (now - lastTime < 5000) { 
          notifyAdmin(`🤖 <b>Alerta Anti-Spam / Bot</b>\nEl usuario <code>${targetId}</code> intentó completar tareas demasiado rápido.`);
          return res.status(400).json({ success: false, error: 'Por favor, espera unos segundos entre cada tarea.' });
        }
      }

      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Tarea no disponible.' });

      if (task.validation_code && String(task.validation_code).trim() !== String(validation_code_input || '').trim()) {
        return res.status(400).json({ success: false, error: 'Código de validación incorrecto.' });
      }

      const isDaily = task.type.startsWith('daily_') || task.type === 'daily';
      const baseType = isDaily ? task.type.replace('daily_', '') : task.type;

      const { data: alreadyDone } = await supabase.from('user_completed_tasks').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();

      if (isDaily) {
         const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
         const { data: recentLog } = await supabase.from('history_logs').select('id').eq('user_id', targetId).like('description', `%[Daily:${taskId}]%`).gte('created_at', yesterday).maybeSingle();
         if (recentLog) return res.status(400).json({ success: false, error: 'Vuelve mañana.' });
      } else if (alreadyDone) {
         return res.status(400).json({ success: false, error: 'Ya completaste esta tarea.' });
      }

      if (baseType === 'group' || baseType === 'channel') {
        const chatId = extractTelegramUsername(task.url);
        if (chatId) {
          const isJoined = await checkMembership(targetId, chatId);
          if (!isJoined) {
            const isBotStillAdmin = await checkAdminStatus(chatId);
            if (!isBotStillAdmin) {
              await supabase.from('tasks').update({ status: 'paused' }).eq('id', taskId);
              return res.status(400).json({ success: false, error: 'El bot ya no es administrador.' });
            }
            return res.status(400).json({ success: false, error: 'No te has unido.' });
          }
        }
      } else if (baseType === 'bot' && task.bot_token) {
        try { await axios.post(`https://api.telegram.org/bot${task.bot_token}/sendChatAction`, { chat_id: targetId, action: 'typing' }); } catch (e) { return res.status(400).json({ success: false, error: 'Inicia el bot (/start).' }); }
      }

      if (!isDaily) await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);

      const rewardAmount = Number(task.reward || 1);

      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + rewardAmount).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);

      const gemasGanadas = (rewardAmount * 1000).toFixed(2);
      const logDesc = isDaily ? `Check-in: "${task.title}" [Daily:${taskId}] | +${gemasGanadas} Gemas` : `Campaña: "${task.title}" | Ganancia: +${gemasGanadas} Gemas`;
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `✅ Tarea Completada`, description: logDesc, amount: rewardAmount }]);

      if (dbUser.referred_by) {
                // 🔥 NUEVO: 10% de la recompensa base + 5 Gemas fijas (0.005 USDT)
        const commissionAmount = Number(((rewardAmount * 0.10) + 0.005).toFixed(4));

        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          await supabase.from('users').update({ 
            balance: Number((Number(referrer.balance || 0) + commissionAmount).toFixed(4)), 
            referral_earnings: Number((Number(referrer.referral_earnings || 0) + commissionAmount).toFixed(4)), 
            total_earnings: Number((Number(referrer.total_earnings || 0) + commissionAmount).toFixed(4)) 
          }).eq('id', referrer.id);

          const comisionGemas = (commissionAmount * 1000).toFixed(2);
          await supabase.from('history_logs').insert([{ 
            user_id: referrer.id, 
            title: '👥 Comisión de Afiliado', 
            description: `Afiliado ID: ${targetId} | +${comisionGemas} Gemas`, 
            amount: commissionAmount 
          }]);
        }
      }

      const newDoneCount = Number(task.completions_done || 0) + 1;
      const newCurrentClicks = Number(task.current_clicks || 0) + 1;
      await supabase.from('tasks').update({ 
        completions_done: newDoneCount, 
        current_clicks: newCurrentClicks,
        status: (newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' 
      }).eq('id', taskId);

      // 🛠️ ACTUALIZACIÓN DE CLICKS GLOBALES SEGURA (Fix crash RPC)
      const { error: rpcGlobalErr } = await supabase.rpc('increment_global_clicks');
      if (rpcGlobalErr) {
        // Fallback seguro si no existe el RPC en base de datos
        const { data: s } = await supabase.from('platform_stats').select('total_global_clicks').eq('id', 1).maybeSingle();
        if (s) {
          await supabase.from('platform_stats').update({ total_global_clicks: (s.total_global_clicks || 0) + 1 }).eq('id', 1);
        }
      }

      const { data: activeEv } = await supabase.from('events').select('id, event_type').eq('status', 'active').maybeSingle();
      if (activeEv && activeEv.event_type === 'task_completion') {
        const { data: part } = await supabase.from('event_participants').select('score').eq('event_id', activeEv.id).eq('user_id', targetId).maybeSingle();
        if (part) {
          await supabase.from('event_participants').update({ score: part.score + 1 }).eq('event_id', activeEv.id).eq('user_id', targetId);
        } else {
          await supabase.from('event_participants').insert([{ event_id: activeEv.id, user_id: targetId, score: 1 }]);
        }
      }

      return res.status(200).json({ success: true, reward: rewardAmount, balance: newBalance });
    }

    if (action === 'toggle-task-status') {
      const { taskId, requestingUserId } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('creator_id', String(requestingUserId)).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada o sin permisos.' });

      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      return res.status(200).json({ success: true, status: newStatus });
    }

    if (action === 'delete-task') {
      const { taskId, requestingUserId, isAdminAction } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada.' });

      if (task.creator_id !== String(requestingUserId) && !isAdminAction) {
         return res.status(403).json({ success: false, error: 'Sin permisos para eliminar.' });
      }

      const remainingCompletions = task.completions_total - (task.completions_done || 0);
      if (remainingCompletions > 0) {
        const refundAmount = Number((remainingCompletions * task.reward * 1.30).toFixed(4));
        const { data: user } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).single();
        if (user) {
          await supabase.from('users').update({ deposit_balance: Number((Number(user.deposit_balance) + refundAmount).toFixed(4)) }).eq('id', task.creator_id);

          await supabase.from('history_logs').insert([{ 
            user_id: task.creator_id, 
            title: '💰 Reembolso de Campaña', 
            description: `Cancelación de campaña. Reembolso: +$${refundAmount.toFixed(2)} USDT a Bóveda.`, 
            amount: 0 
          }]);
        }
      }
      await supabase.from('tasks').delete().eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'edit-task') {
      const { taskId, requestingUserId, newTitle, newUrl, isAdminAction } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada.' });

      if (task.creator_id !== String(requestingUserId) && !isAdminAction) {
         return res.status(403).json({ success: false, error: 'Sin permisos para editar.' });
      }

      await supabase.from('tasks').update({ title: newTitle, url: newUrl }).eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'get-history') {
      const targetId = String(userId);
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', targetId).order('created_at', { ascending: false }); 
      return res.status(200).json({ success: true, history: history || [] });
    }

        if (action === 'get-referrals') {
      const targetId = String(userId);
      let { data: lv1 } = await supabase.from('users').select('*').eq('referred_by', targetId);
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', targetId).maybeSingle();

      return res.status(200).json({ success: true, referrals: lv1 || [], earnings: dbUser?.referral_earnings || 0 });
    }

    if (action === 'get-withdrawal-reqs') {
      const targetId = String(userId);
      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);

      const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);
      const { count: adsCount } = await supabase.from('history_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetId)
        .like('description', '%[AdView]%')
        .gte('created_at', todayDate.toISOString());

      return res.status(200).json({ success: true, referrals: refCount || 0, ads: adsCount || 0 });
    }

    if (action === 'watch-ad-progress') {
      const targetId = String(userId);
      const earnedGemas = 0.50; 
      const rewardForDb = earnedGemas / 1000;

      const { data: dbUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + rewardForDb).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardForDb).toFixed(4));

      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
      await supabase.from('history_logs').insert([{ 
        user_id: targetId, 
        title: '📺 Anuncio Visto', 
        description: `Visualización para retiro [AdView] | +${earnedGemas.toFixed(2)} Gemas`, 
        amount: rewardForDb 
      }]);

      return res.status(200).json({ success: true, balance: newBalance });
    }

    return res.status(400).json({ success: false, error: `Acción desconocida: ${action}` });

  } catch (error) { 
    console.error("CRITICAL BACKEND ERROR 500:", error);
    const errorDescription = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return res.status(500).json({ success: false, error: `Error en servidor: ${errorDescription}` }); 
  }
}
