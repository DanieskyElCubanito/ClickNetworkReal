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

const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const USDT_BEP20_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

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
  const tonAmount = usdtAmount / tonPrice; 
  const nanoTonAmount = Math.floor(tonAmount * 1e9).toString();

  const mnemonics = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = tonClient.open(wallet);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
      seqno: seqno || 0,
      secretKey: keyPair.secretKey,
      messages: [internal({ to: destinationAddress, value: nanoTonAmount, bounce: false, body: "Retiro TeleGem" })],
      sendMode: 3 
  });
}

function verifyTelegramWebAppData(telegramInitData) {
  if (!telegramInitData || !BOT_TOKEN) return false;
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  urlParams.sort();
  let dataCheckString = '';
  for (const [key, value] of urlParams.entries()) { dataCheckString += `${key}=${value}\n`; }
  dataCheckString = dataCheckString.slice(0, -1);
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return calculatedHash === hash;
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
    const telegramInitData = req.headers['x-telegram-init-data'];
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente. Abre la app desde el bot oficial.' });
    }

    if (!req.body) {
      return res.status(400).json({ success: false, error: 'Cuerpo de solicitud vacío.' });
    }

    const { user, action, userId, start_param } = req.body; 

    // Captura de IP para control de seguridad
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    if (action === 'verify') {
      const targetUser = user || { id: userId, is_premium: false };
      const targetId = String(targetUser?.id);
      const deviceId = targetUser?.deviceId || 'unknown_device';
      
      if (!targetId || targetId === 'undefined') return res.status(400).json({ success: false, error: 'No user id' });

      let { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
      if (dbError) throw new Error("Error en Supabase (select user): " + dbError.message);

      if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

      // 🛡️ CONTROL DE MULTICUENTAS POR HARDWARE (FINGERPRINT)
      // Verificamos si este deviceId ya fue registrado por OTRO usuario en la base de datos
      let isMultiAccount = false;
      if (deviceId !== 'unknown_device') {
        const { data: existingDeviceUser } = await supabase
          .from('users')
          .select('id')
          .eq('device_id', deviceId)
          .neq('id', targetId)
          .maybeSingle();

        if (existingDeviceUser) {
          isMultiAccount = true;
          notifyAdmin(`⚠️ <b>Alerta Multicuenta Detectada</b>\nEl dispositivo <code>${deviceId}</code> intentó registrar la cuenta <code>${targetId}</code> pero ya pertenecía a <code>${existingDeviceUser.id}</code>.`);
        }
      }

      if (!dbUser) {
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
          referral_reward_granted: false 
        };
        
        // 🛡️ BLOQUEO DE REFERIDO SI ES EL MISMO TELÉFONO O AUTO-REFERIDO
        if (start_param && String(start_param) !== targetId && !isMultiAccount) {
          // Validamos además que el invitador exista
          const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
          if (inviter) {
            newUserObj.referred_by = String(start_param);
          }
        } else if (start_param && isMultiAccount) {
          notifyAdmin(`🚨 <b>Intento de Fraude de Referidos Bloqueado</b>\nLa cuenta <code>${targetId}</code> intentó usar el referido de <code>${start_param}</code> desde el mismo dispositivo físico.`);
        }
        
        const { data: newUser, error: insertError } = await supabase.from('users').insert([newUserObj]).select().single();
        if (insertError) throw new Error("Error en Supabase (insert user): " + insertError.message);
        dbUser = newUser;
      } else {
        // Actualizamos IP y device_id si faltaban
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

    if (action === 'request-withdrawal') {
      const targetId = String(userId || user?.id);
      const { address, amount } = req.body;
      const withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.2) return res.status(400).json({ success: false, error: 'Mínimo: 0.2 USDT.' });

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
        return res.status(400).json({ success: false, error: `Error en BD: ${withdrawError?.message || 'Rechazado'}` });
      }

      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📤 Retiro Procesando', description: `Enviando a: ${address.substring(0,6)}...`, amount: -withdrawAmount }]);
      notifyAdmin(`📤 <b>Nueva Solicitud de Retiro</b>\nUsuario: <code>${targetId}</code>\nMonto: <code>${withdrawAmount} USDT</code>`);

      if (withdrawAmount <= 0.9) {
          try {
              await sendTonAutomated(address, withdrawAmount);
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
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

      const { data: newIntent, error: intentErr } = await supabase.from('payment_intents').insert([{ 
        user_id: targetId, 
        expected_amount: Number(price), 
        public_wallet: publicAddress, 
        encrypted_private_key: privateKey, 
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

      const derivedWallet = getDerivedUsdtWallet(targetId);
      sweepUsdtAutomated(derivedWallet, balanceWei).catch(e => console.error("Fallo barrido en background:", e));

      return res.status(200).json({ success: true, deposit_balance: newDepositBalance });
    }

    if (action === 'generate-payment-wallet') {
      const { price, clicks } = req.body;
      const targetId = String(userId);
      const mnemonics = await mnemonicNew(); const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
      const secretWords = mnemonics.join(" ");
      const { data: newIntent } = await supabase.from('payment_intents').insert([{ user_id: targetId, expected_amount: price, public_wallet: publicAddress, encrypted_private_key: secretWords, status: 'pending' }]).select().single();
      return res.status(200).json({ success: true, wallet: publicAddress, intentId: newIntent.id });
    }

    if (action === 'verify-crypto-payment') {
      const { intentId, clicks } = req.body; const targetId = String(userId);
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'No procesado.' });
      
      const balanceNano = await tonClient.getBalance(intent.public_wallet);
      const balanceGram = Number(balanceNano) / 1e9; 
      if (balanceGram < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo actual: ${balanceGram.toFixed(4)} GRAM.` });

      const { data: dbUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);

      try {
        let sweepWallet = FALLBACK_MASTER_WALLET_GRAM;
        const { data: cfg } = await supabase.from('system_settings').select('master_wallet_gram').eq('id', 1).maybeSingle();
        if (cfg && cfg.master_wallet_gram) sweepWallet = cfg.master_wallet_gram;

        const mnemonics = intent.encrypted_private_key.split(" "); 
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
      const { creator_id, type, title, url, bot_token, completions_total, reward } = req.body;
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
        completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active' 
      }]).select().single();

      if (taskError || !newTask) {
        await supabase.from('users').update({ deposit_balance: newVaultBalance + totalCost }).eq('id', targetId);
        return res.status(400).json({ success: false, error: `Fallo BD: ${taskError?.message || 'Error desconocido'}. Saldo devuelto.` });
      }

      await supabase.from('history_logs').insert([{ user_id: targetId, title: '🚀 Campaña Activada', description: `Descontado de Bóveda para ${count} usuarios.`, amount: -totalCost }]);
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
      const { taskId } = req.body; 
      const targetId = String(userId);

      // 🛡️ COOLDOWN TEMPORAL ANTI-SPAM (Mínimo 5 segundos entre tareas)
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
        if (now - lastTime < 5000) { // 5000ms = 5 segundos
          notifyAdmin(`🤖 <b>Alerta Anti-Spam / Bot</b>\nEl usuario <code>${targetId}</code> intentó completar tareas demasiado rápido (menos de 5s).`);
          return res.status(400).json({ success: false, error: 'Por favor, espera unos segundos entre cada tarea.' });
        }
      }

      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Tarea no disponible.' });

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

      const logDesc = isDaily ? `Check-in: "${task.title}" [Daily:${taskId}]` : `Recompensa por "${task.title}".`;
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `✅ Tarea Completada`, description: logDesc, amount: rewardAmount }]);

      // 🛡️ COMISIÓN ESTRICTA DE REFERIDOS (20% POR TAREA REAL)
      if (dbUser.referred_by) {
        const commissionAmount = Number((rewardAmount * 0.20).toFixed(4));
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          await supabase.from('users').update({ 
            balance: Number((Number(referrer.balance || 0) + commissionAmount).toFixed(4)), 
            referral_earnings: Number((Number(referrer.referral_earnings || 0) + commissionAmount).toFixed(4)), 
            total_earnings: Number((Number(referrer.total_earnings || 0) + commissionAmount).toFixed(4)) 
          }).eq('id', referrer.id);
        }
      }

      const newDoneCount = Number(task.completions_done || 0) + 1;
      await supabase.from('tasks').update({ completions_done: newDoneCount, status: (newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' }).eq('id', taskId);

      return res.status(200).json({ success: true, reward: rewardAmount, balance: newBalance });
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
