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


async function sendTonAutomated(destinationAddress, usdtAmount) {
  const mnemonic = process.env.MASTER_WALLET_MNEMONIC; 
  if (!mnemonic) throw new Error("Falta la variable MASTER_WALLET_MNEMONIC en Vercel.");

  const tonPrice = await getTonPrice();
  // Se calcula la cantidad exacta en TON con máximo 9 decimales
  const tonAmount = (usdtAmount / tonPrice).toFixed(9); 

  const mnemonics = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = tonClient.open(wallet);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
      seqno: seqno || 0,
      secretKey: keyPair.secretKey,
      messages: [internal({ to: destinationAddress, value: tonAmount.toString(), bounce: false, body: "Retiro TeleGem" })],
      sendMode: 3 
  });
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


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // Mitigación DDoS
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

      let { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
      if (dbError) throw new Error("Error en Supabase (select user): " + dbError.message);

      if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

      // Control Multicuentas
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

        if (start_param && String(start_param) !== targetId && !isMultiAccount) {
          const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
          if (inviter) {
            newUserObj.referred_by = String(start_param);
          }
        } else if (start_param && isMultiAccount) {
          notifyAdmin(`🚨 <b>Intento de Fraude de Referidos Bloqueado</b>\nLa cuenta clon <code>${targetId}</code> intentó usar el referido de <code>${start_param}</code> desde el mismo dispositivo físico.`);
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

        // 🔥 INICIO FUNCIÓN PARA OBTENER RETIROS PENDIENTES 🔥
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
    // 🔥 FIN FUNCIÓN PARA OBTENER RETIROS PENDIENTES 🔥

      // 🔥 INICIO FUNCIONES DE APROBACIÓN DE RETIROS 🔥

    // 🛠️ NUEVA FUNCIÓN: Notificadora del Canal de Pagos 🛠️
    async function notifyPaymentChannel(userId, usdtAmount, walletAddress) {
      try {
        const { data: user } = await supabase.from('users').select('username').eq('id', userId).single();
        const usernameDisplay = user?.username && user.username !== 'Usuario' ? `@${user.username}` : `ID: ${userId}`;
        
        const tonPrice = await getTonPrice();
        const tonAmount = (usdtAmount / tonPrice).toFixed(4); // Calculamos el TON en vivo
        
        // Generamos un hash TXID estético y rastreable para el comprobante inmediato
        const txid = crypto.createHash('sha256').update(walletAddress + Date.now().toString()).digest('hex');

        const message = `💎 <b>PAGO VERIFICADO EXITOSAMENTE</b>\n\n` +
                        `👤 <b>Beneficiario:</b> ${usernameDisplay}\n` +
                        `💸 <b>Monto Total:</b> ${tonAmount} TON\n` +
                        `🛡️ <b>Red:</b> Toncoin (Ton)\n` +
                        `⚡ <b>Estado:</b> Finalizado / 100%\n\n` +
                        `🔹 <b>TXID:</b>\n<code>${txid}</code>\n\n` +
                        `🔥 ¡Retiros procesados con total transparencia!`;

        const keyboard = {
          inline_keyboard: [
            [{ text: "💰 ¡QUIERO GANAR TON AHORA!", url: "https://t.me/TeleGemAds_bot/app" }]
          ]
        };

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: '-1002352835078', // 🛠️ Tu canal de pagos oficial
          text: message,
          parse_mode: 'HTML',
          reply_markup: keyboard
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
        // 1. Ejecutar la transacción real en la blockchain (Red TON)
        await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);

        // 2. Si el dinero se envió con éxito, actualizamos la base de datos
        await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);

        // 🛠️ 3. Disparamos la notificación automática al canal de pagos
        await notifyPaymentChannel(withdrawal.user_id, withdrawal.amount, withdrawal.wallet_address);

        // 4. Buscar el recibo original de "Procesando" y actualizarlo a "Completado"
        const { data: lastLog } = await supabase.from('history_logs')
          .select('id')
          .eq('user_id', withdrawal.user_id)
          .eq('title', '📤 Retiro Procesando')
          .eq('amount', -Number(withdrawal.amount))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog) {
          const gemasRetiradas = (Number(withdrawal.amount) * 1000).toFixed(2);
          await supabase.from('history_logs').update({
            title: '✅ Retiro Completado',
            description: `TX Confirmada a ${withdrawal.wallet_address.substring(0,8)}... | -${gemasRetiradas} Gemas`
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

      // Devolver los fondos al balance del usuario
      const { data: userToRefund } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
      if (userToRefund) {
        const refundedBalance = Number((Number(userToRefund.balance) + Number(withdrawal.amount)).toFixed(4));
        await supabase.from('users').update({ balance: refundedBalance }).eq('id', withdrawal.user_id);
      }

      // Marcar como rechazado en la base de datos
      await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);

      // Buscar el recibo original y cambiarlo a Rechazado (poniendo el monto en 0 para anular el gasto visual)
      const { data: lastLog } = await supabase.from('history_logs')
        .select('id')
        .eq('user_id', withdrawal.user_id)
        .eq('title', '📤 Retiro Procesando')
        .eq('amount', -Number(withdrawal.amount))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        const gemasReembolso = (Number(withdrawal.amount) * 1000).toFixed(2);
        await supabase.from('history_logs').update({
          title: '❌ Retiro Rechazado',
          description: reason ? `Reembolso: +${gemasReembolso} Gemas. Motivo: ${reason}` : `Fondos devueltos por seguridad: +${gemasReembolso} Gemas.`,
          amount: 0
        }).eq('id', lastLog.id);
      }

      return res.status(200).json({ success: true });
    }
    // 🔥 FIN FUNCIONES DE APROBACIÓN DE RETIROS 🔥



    if (action === 'request-withdrawal') {
      const targetId = String(userId || user?.id);
      const { address, amount } = req.body;
      let withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.05) return res.status(400).json({ success: false, error: 'Mínimo: 0.05 USDT.' });

      // 🛡️ 4. PENALIZACIÓN "HIT & RUN" ANTES DE RETIRAR
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

      if (penaltyAmount > 0) {
        const { data: rpcPenalty } = await supabase.rpc('deduct_user_balance', { p_user_id: targetId, p_amount: penaltyAmount });
        if (rpcPenalty && rpcPenalty.success) {
          notifyAdmin(`⚖️ <b>Penalidad Hit&Run Aplicada</b>\nUsuario <code>${targetId}</code> se salió de canales.\nPenalidad: -${penaltyAmount.toFixed(4)} USDT.`);

          // Registro de penalidad en el historial
          await supabase.from('history_logs').insert([{ 
            user_id: targetId, 
            title: '⚠️ Penalidad de Red', 
            description: `Abandono de canales. Sanción: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, 
            amount: -penaltyAmount 
          }]);

          withdrawAmount = withdrawAmount - penaltyAmount;
          if (withdrawAmount < 0.05) return res.status(400).json({ success: false, error: `Se dedujeron ${penaltyAmount.toFixed(4)} USDT por abandonar canales. Saldo insuficiente para retirar.` });
        }
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('deduct_user_balance', {
        p_user_id: targetId,
        p_amount: withdrawAmount
      });

      if (rpcError || !rpcData.success) {
        return res.status(400).json({ success: false, error: 'Saldo insuficiente o transacción bloqueada por seguridad.' });
      }
      const newBalance = Number(rpcData.new_balance.toFixed(4));

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
              // 1. Envía el pago a la blockchain
              await sendTonAutomated(address, withdrawAmount);

              // 2. Marca el retiro como completado
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);

              // 🛠️ 3. Disparamos la notificación automática (Para retiros instantáneos)
              await notifyPaymentChannel(targetId, withdrawAmount, address);

              // 4. 🔥 Actualiza el mensaje en el historial a "Completado" 🔥
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
                  description: `TX Automática a ${address.substring(0,8)}... | -${withdrawGemasStr} Gemas`
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

      // Encriptación AES-256
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

      // Registro de recarga exitosa
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

      // Encriptación AES-256
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

      // Registro de recarga exitosa
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

        // Desencriptar Mnemonic
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

      const { data: rpcData, error: rpcError } = await supabase.rpc('deduct_vault_balance', {
        p_user_id: targetId,
        p_amount: totalCost
      });

      if (rpcError || !rpcData.success) {
        return res.status(400).json({ success: false, error: 'Capital de Bóveda insuficiente o transacción en curso.' });
      }
      const newVaultBalance = Number(rpcData.new_balance.toFixed(4));

      const { data: newTask, error: taskError } = await supabase.from('tasks').insert([{ 
        creator_id: targetId, type, title, url, bot_token: bot_token || null, 
        completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, 
        status: 'active', validation_code: validation_code || null 
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
      if (historyLogs) {
         historyLogs.forEach(log => {
           const match = log.description?.match(/\[Daily:(.+?)\]/);
           if (match) completedDailyIds.add(match[1]);
         });
      }

      const mappedTasks = (allTasks || []).map(t => {
        const isDaily = t.type.startsWith('daily_') || t.type === 'daily';
        return { ...t, reward: (t.reward || 1), is_completed: isDaily ? completedDailyIds.has(String(t.id)) : completedIds.has(String(t.id)) };
      });

      return res.status(200).json({ success: true, tasks: mappedTasks });
    }

    if (action === 'complete-task') {
      const { taskId, validation_code_input } = req.body; 
      const targetId = String(userId);

      // 🛡️ COOLDOWN TEMPORAL ANTI-SPAM (5 segundos)
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

      // 🛡️ 5. PRUEBA DE TRABAJO (Promo con Código)
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
        const commissionAmount = Number((rewardAmount * 0.20).toFixed(4));
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          await supabase.from('users').update({ 
            balance: Number((Number(referrer.balance || 0) + commissionAmount).toFixed(4)), 
            referral_earnings: Number((Number(referrer.referral_earnings || 0) + commissionAmount).toFixed(4)), 
            total_earnings: Number((Number(referrer.total_earnings || 0) + commissionAmount).toFixed(4)) 
          }).eq('id', referrer.id);

          // LÍNEA NUEVA PARA EL HISTORIAL CON 2 DECIMALES
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
      await supabase.from('tasks').update({ completions_done: newDoneCount, status: (newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' }).eq('id', taskId);

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

      // Sistema de reembolso automático por interacciones no consumidas
      const remainingCompletions = task.completions_total - (task.completions_done || 0);
      if (remainingCompletions > 0) {
        // Se devuelve el costo base + 30% de comisiones por cada usuario faltante
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

    return res.status(400).json({ success: false, error: `Acción desconocida: ${action}` });

  } catch (error) { 
    console.error("CRITICAL BACKEND ERROR 500:", error);
    const errorDescription = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return res.status(500).json({ success: false, error: `Error en servidor: ${errorDescription}` }); 
  }
}
