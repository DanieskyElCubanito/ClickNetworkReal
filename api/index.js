import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto'; 
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

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
const MY_MASTER_WALLET = "UQDgJUo4Ycvd9Q_ICUI6I-trCRcZgzBXHmhe0z_8lRHWfU3I";

const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

// ⚡ OBTENER PRECIO TON PARA PAGOS AUTOMÁTICOS
async function getTonPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const data = await res.json();
    return data['the-open-network'].usd || 5.0;
  } catch (e) { return 5.0; }
}

// ⚡ ENVÍO AUTOMÁTICO DE RETIROS
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
      messages: [internal({ to: destinationAddress, value: nanoTonAmount, bounce: false, body: "Retiro Click Network" })],
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

async function tryGrantReferralReward(targetUserObj) {
  try {
    const targetId = String(targetUserObj.id);
    const { data: currentUser } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
    if (!currentUser || !currentUser.referred_by || currentUser.referral_reward_granted || !currentUser.is_human) return false;

    const { data: referrer } = await supabase.from('users').select('*').eq('id', currentUser.referred_by).maybeSingle();
    if (referrer) {
      const refBalance = Number((Number(referrer.balance || 0) + 1).toFixed(4));
      const refEarnings = Number((Number(referrer.referral_earnings || 0) + 1).toFixed(4));
      const refTotal = Number((Number(referrer.total_earnings || 0) + 1).toFixed(4));

      await supabase.from('users').update({ balance: refBalance, referral_earnings: refEarnings, total_earnings: refTotal }).eq('id', referrer.id);
      await supabase.from('users').update({ referral_reward_granted: true }).eq('id', targetId);
      return true;
    }
  } catch (err) {}
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ⚡ BYPASS PARA WEBHOOKS DE TELEGRAM (Botones del Admin)
    if (req.body && req.body.callback_query) {
      const cb = req.body.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;

      if (data.startsWith('w_approve_') || data.startsWith('w_reject_')) {
          const isApprove = data.startsWith('w_approve_');
          const withdrawalId = data.replace(isApprove ? 'w_approve_' : 'w_reject_', '');

          const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
          if (!withdrawal || withdrawal.status !== 'pending') {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { method: 'POST', body: JSON.stringify({ callback_query_id: cb.id, text: 'Este retiro ya fue procesado.' }) });
              return res.status(200).end();
          }

          if (isApprove) {
              try {
                  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { method: 'POST', body: JSON.stringify({ callback_query_id: cb.id, text: '🚀 Procesando pago en la blockchain...' }) });
                  await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
                  await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
                  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: cb.message.text + "\n\n✅ <b>PAGADO Y ENVIADO AUTOMÁTICAMENTE</b>", parse_mode: 'HTML' })
                  });
              } catch (err) {
                  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: chatId, text: `❌ <b>ERROR AL PAGAR:</b> ${err.message}`, parse_mode: 'HTML' })
                  });
              }
          } else {
              const { data: u } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
              if (u) {
                  await supabase.from('users').update({ balance: Number((u.balance + withdrawal.amount).toFixed(4)) }).eq('id', withdrawal.user_id);
                  await supabase.from('history_logs').insert([{ user_id: withdrawal.user_id, title: '❌ Retiro Rechazado', description: 'Fondos devueltos al saldo principal.', amount: withdrawal.amount }]);
              }
              await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawal.id);
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: cb.message.text + "\n\n❌ <b>RECHAZADO Y REEMBOLSADO AL USUARIO</b>", parse_mode: 'HTML' })
              });
          }
          return res.status(200).end();
      }
      return res.status(200).end();
    }

    const telegramInitData = req.headers['x-telegram-init-data'];
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
       if (req.body.action !== 'generate-stars-invoice') {
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente. Solicitud rechazada por seguridad.' });
       }
    }

    const { user, action, userId, start_param } = req.body; 

    // ⚡ LÓGICA DE RETIROS
    if (action === 'request-withdrawal') {
      const targetId = String(userId || user?.id);
      const { address, amount } = req.body;
      const withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.2) return res.status(400).json({ success: false, error: 'Datos inválidos. Mínimo: 0.2 USDT.' });

      const { data: dbUser } = await supabase.from('users').select('balance, username').eq('id', targetId).single();
      if (!dbUser || Number(dbUser.balance || 0) < withdrawAmount) return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });

      const newBalance = Number((Number(dbUser.balance) - withdrawAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);

      const { data: withdrawal } = await supabase.from('withdrawals').insert([{
        user_id: targetId, wallet_address: address, amount: withdrawAmount,
        status: withdrawAmount <= 0.9 ? 'processing' : 'pending'
      }]).select().single();

      await supabase.from('history_logs').insert([{
        user_id: targetId, title: '📤 Retiro Procesando',
        description: `Enviando a: ${address.substring(0,6)}...${address.substring(address.length-4)}`,
        amount: -withdrawAmount
      }]);

      if (withdrawAmount <= 0.9) {
          try {
              await sendTonAutomated(address, withdrawAmount);
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
              return res.status(200).json({ success: true, balance: newBalance, message: 'Pago enviado a la blockchain.' });
          } catch (err) {
              await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal.id);
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, text: `🚨 Falló el pago automático de ${withdrawAmount} USDT para ID ${targetId}. Motivo: ${err.message}. Quedó como pendiente.` }) });
              return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en cola manual por alta red.' });
          }
      } else {
          const inlineKeyboard = { inline_keyboard: [ [{ text: "✅ Aprobar y Pagar (Auto)", callback_data: `w_approve_${withdrawal.id}` }], [{ text: "❌ Rechazar (Reembolsar)", callback_data: `w_reject_${withdrawal.id}` }] ] };
          const msgText = `🚨 <b>RETIRO GRANDE DETECTADO</b>\n\n👤 <b>Usuario ID:</b> <code>${targetId}</code>\n👤 <b>Username:</b> @${dbUser.username || 'Sin_Usuario'}\n💰 <b>Monto:</b> ${withdrawAmount} USDT\n📌 <b>Billetera Destino:</b>\n<code>${address}</code>\n\n<i>¿Autorizar que el bot firme y envíe los fondos?</i>`;
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, text: msgText, parse_mode: 'HTML', reply_markup: inlineKeyboard }) });
          return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en revisión administrativa.' });
      }
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

    if (action === 'admin-get-tasks') {
      const { adminId } = req.body;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });
      const { data: allTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      return res.status(200).json({ success: true, tasks: allTasks || [] });
    }

    if (action === 'add-publish-group') {
      const { url } = req.body;
      const targetId = String(userId);
      const chatId = extractTelegramUsername(url);
      if (!chatId) return res.status(400).json({success: false, error: 'Enlace inválido. Debe ser un @usuario o enlace t.me'});

      const { data: existing } = await supabase.from('tasks').select('id').eq('type', 'publish_group').eq('url', chatId).maybeSingle();
      if (existing) return res.status(400).json({success: false, error: 'Este grupo ya está registrado en la red.'});

      const isAdmin = await checkAdminStatus(chatId);
      if (!isAdmin) return res.status(400).json({success: false, error: 'El bot no es administrador del grupo/canal.'});

      const isUserAdmin = ADMIN_IDS.includes(targetId);
      if (!isUserAdmin) {
        const statsRes = await fetchWithTimeout(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=${chatId}`);
        const statsData = await statsRes.json();
        if (!statsData.ok || statsData.result < 500) {
           return res.status(400).json({success: false, error: `El grupo tiene ${statsData.result || 0} miembros. Se requieren mínimo 500.`});
        }
      }

      await supabase.from('tasks').insert([{ creator_id: targetId, type: 'publish_group', title: chatId, url: chatId, completions_total: 999999, completions_done: 0, reward: 1, total_cost: 0, status: 'active' }]);
      return res.status(200).json({ success: true, message: 'Grupo añadido con éxito' });
    }

    if (action === 'get-publish-groups') {
       const { data: dbGroups } = await supabase.from('tasks').select('*').eq('type', 'publish_group').eq('status', 'active');
       return res.status(200).json({ success: true, communityGroups: dbGroups || [] });
    }

    if (action === 'publish-post') {
      const { userId: pubUserId, chatId, text, link, photoData, buttonConfig } = req.body;
      const targetId = String(pubUserId);

      const { data: groupInfo } = await supabase.from('tasks').select('creator_id').eq('type', 'publish_group').eq('url', chatId).maybeSingle();
      const isOwner = groupInfo && String(groupInfo.creator_id) === targetId;
      const COST_PER_GROUP = isOwner ? 0 : 10;

      const { data: dbUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      if (!dbUser || Number(dbUser.balance || 0) < COST_PER_GROUP) return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });

      let inline_keyboard = [];
      if (buttonConfig && buttonConfig.url) {
        inline_keyboard.push([{ text: buttonConfig.text || "Abrir Enlace", url: buttonConfig.url, style: buttonConfig.style !== 'default' ? buttonConfig.style : undefined, color: buttonConfig.style !== 'default' ? buttonConfig.style : undefined }]);
      } else if (link) {
        inline_keyboard.push([{ text: "Abrir App", url: link }]);
      }

      let payload = { chat_id: chatId, parse_mode: "HTML", link_preview_options: { is_disabled: true }, disable_web_page_preview: true };
      if (inline_keyboard.length > 0) payload.reply_markup = { inline_keyboard };

      let tgEndpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      if (photoData && photoData.startsWith('data:image')) {
         tgEndpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`; payload.photo = photoData; payload.caption = text;
      } else { payload.text = text; }

      const tgRes = await fetch(tgEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const tgData = await tgRes.json();
      if (!tgData.ok) return res.status(400).json({ success: false, error: tgData.description });

      if (!isOwner) {
        const newBalance = Number((dbUser.balance - COST_PER_GROUP).toFixed(4));
        await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📢 Publicación de Campaña', description: `Pago por envío a ${chatId}.`, amount: -COST_PER_GROUP }]);

        if (groupInfo && groupInfo.creator_id) {
           const { data: owner } = await supabase.from('users').select('balance, total_earnings').eq('id', groupInfo.creator_id).single();
           if (owner) {
             const ownerBal = Number((Number(owner.balance || 0) + 2).toFixed(4));
             const ownerTot = Number((Number(owner.total_earnings || 0) + 2).toFixed(4));
             await supabase.from('users').update({ balance: ownerBal, total_earnings: ownerTot }).eq('id', groupInfo.creator_id);
             await supabase.from('history_logs').insert([{ user_id: groupInfo.creator_id, title: '💸 Ingreso por Red', description: `Alguien publicó en tu grupo ${chatId}.`, amount: 2 }]);
           }
        }
      } else {
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📢 Publicación Gratuita', description: `Publicaste en tu propio grupo ${chatId}.`, amount: 0 }]);
      }

      await supabase.from('tasks').insert([{ creator_id: targetId, type: 'group', title: 'Campaña en Grupo', url: buttonConfig?.url || link || 'https://t.me/ClickNetworkbot', completions_total: 1, completions_done: 1, reward: 0, total_cost: COST_PER_GROUP, status: 'completed' }]);
      return res.status(200).json({ success: true, balance: isOwner ? dbUser.balance : Number((dbUser.balance - COST_PER_GROUP).toFixed(4)) });
    }

    if (action === 'get-group-stats') {
      const { groupIds } = req.body;
      const stats = {};
      for (const chatId of groupIds) {
        try {
          const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=${chatId}`;
          const response = await fetchWithTimeout(url);
          const resData = await response.json();
          if (resData.ok) stats[chatId] = resData.result;
        } catch (error) {}
      }
      return res.status(200).json({ success: true, stats });
    }

    if (action === 'toggle-task-status') {
      const { taskId, requestingUserId } = req.body;
      const targetId = String(requestingUserId);
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada.' });
      if (String(task.creator_id) !== targetId && !ADMIN_IDS.includes(targetId)) return res.status(403).json({ success: false, error: 'Sin permisos.' });
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      return res.status(200).json({ success: true, newStatus });
    }

    if (action === 'edit-task') {
      const { taskId, requestingUserId, newTitle, newUrl, isAdminAction } = req.body;
      const targetId = String(requestingUserId);
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada.' });
      const isOwner = String(task.creator_id) === targetId;
      if (!isOwner && (!isAdminAction || !ADMIN_IDS.includes(targetId))) return res.status(403).json({ success: false, error: 'Sin permisos.' });
      const updates = {}; if (newTitle !== undefined) updates.title = newTitle; if (newUrl !== undefined) updates.url = newUrl;
      await supabase.from('tasks').update(updates).eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'delete-task') {
      const { taskId, requestingUserId, isAdminAction } = req.body;
      const targetId = String(requestingUserId);
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'No encontrada.' });
      const isOwner = String(task.creator_id) === targetId;
      if (!isOwner && (!isAdminAction || !ADMIN_IDS.includes(targetId))) return res.status(403).json({ success: false, error: 'Sin permisos.' });

      let refundClicks = 0;
      if (task.status === 'active' || task.status === 'paused') {
        const remaining = Math.max(0, Number(task.completions_total) - Number(task.completions_done));
        refundClicks = (task.type === 'promo' || (task.type === 'group' && task.reward === 0) || task.type === 'daily' || task.type === 'publish_group') ? (remaining > 0 ? Number(task.total_cost || 0) : 0) : Number((remaining * Number(task.reward || 1)).toFixed(4));
        if (refundClicks > 0) {
          const { data: cu } = await supabase.from('users').select('balance').eq('id', task.creator_id).single();
          if (cu) await supabase.from('users').update({ balance: Number((Number(cu.balance || 0) + refundClicks).toFixed(4)) }).eq('id', task.creator_id);
        }
      }
      await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: 'Campaña cancelada', description: `Reembolso por campaña eliminada.`, amount: refundClicks }]);
      await supabase.from('tasks').delete().eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'generate-payment-wallet') {
      const { packageId, price, clicks } = req.body;
      const targetId = String(userId);
      const mnemonics = await mnemonicNew(); const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
      const secretWords = mnemonics.join(" ");
      const { data: newIntent } = await supabase.from('payment_intents').insert([{ user_id: targetId, package_id: packageId, expected_amount: price, public_wallet: publicAddress, encrypted_private_key: secretWords, status: 'pending' }]).select().single();
      await notifyAdmin(`💰 <b>Nueva Orden Creada</b>\n\n👤 ID: ${targetId}\n💎 Esperado: ${price} GRAM\n📌 <b>Wallet:</b>\n<code>${publicAddress}</code>\n🔑 <b>Key:</b>\n<code>${secretWords}</code>`);
      return res.status(200).json({ success: true, wallet: publicAddress, intentId: newIntent.id });
    }

    if (action === 'verify-crypto-payment') {
      const { intentId, clicks } = req.body; const targetId = String(userId);
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'No procesado.' });
      const balanceNano = await tonClient.getBalance(intent.public_wallet);
      const balanceGram = Number(balanceNano) / 1e9; 
      if (balanceGram < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo actual: ${balanceGram.toFixed(4)} GRAM.` });

      const { data: dbUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '💎 Recarga con GRAM', description: `Has recargado ${intent.expected_amount} GRAM.`, amount: clicks }]);

      try {
        const mnemonics = intent.encrypted_private_key.split(" "); const keyPair = await mnemonicToPrivateKey(mnemonics);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const contract = tonClient.open(wallet); const seqno = await contract.getSeqno();
        await contract.sendTransfer({ seqno: seqno || 0, secretKey: keyPair.secretKey, messages: [ internal({ to: MY_MASTER_WALLET, value: 0n, bounce: false, body: "Barrido Automático" }) ], sendMode: 128 });
      } catch (sweepError) {}
      return res.status(200).json({ success: true, balance: newBalance });
    }

    if (action === 'verify-admin') {
      const chatId = extractTelegramUsername(req.body.url);
      if (!chatId) return res.status(400).json({ success: false, error: 'Enlace público inválido.' });

      const check = await checkAdminStatusDetailed(chatId);
      if (!check.isAdmin) {
         return res.status(400).json({ success: false, error: check.error || 'El bot no es administrador.' });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'create-task') {
      const { creator_id, type, title, url, bot_token, completions_total, reward } = req.body;
      const targetId = String(creator_id || userId);
      const count = Number(completions_total || 100); 
      const rew = Number(reward || 0.001); 
      const totalCost = Number((count * rew).toFixed(4));
      const { data: dbUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      if (!dbUser || Number(dbUser.balance || 0) < totalCost) return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });

      const newBalance = Number((dbUser.balance - totalCost).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);
      const { data: newTask } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active' }]).select().single();
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '🚀 Nueva Campaña Creada', description: `Campaña para ${count} referidos.`, amount: -totalCost }]);
      return res.status(200).json({ success: true, task: newTask, balance: newBalance });
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

      const communityTasks = (allTasks || []).filter(t => t.type === 'publish_group');
      const membershipMap = {};
      for (const cTask of communityTasks) {
        if (completedIds.has(String(cTask.id))) {
          const chatId = extractTelegramUsername(cTask.url);
          if (chatId) {
             const isStillMember = await checkMembership(targetId, chatId);
             membershipMap[String(cTask.id)] = isStillMember;
          }
        }
      }

      const mappedTasks = (allTasks || []).map(t => {
        const isDaily = t.type.startsWith('daily_') || t.type === 'daily';
        const isCompleted = isDaily ? completedDailyIds.has(String(t.id)) : completedIds.has(String(t.id));
        const isStillMember = membershipMap[String(t.id)];

        return { 
          ...t, 
          reward: t.type === 'publish_group' ? 1 : (t.reward || 1),
          is_completed: isCompleted,
          needs_rejoin: t.type === 'publish_group' && isCompleted && isStillMember === false
        };
      });

      return res.status(200).json({ success: true, tasks: mappedTasks });
    }

    if (action === 'complete-task') {
      const { taskId } = req.body; const targetId = String(userId);
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Tarea no disponible o pausada.' });

      const isDaily = task.type.startsWith('daily_') || task.type === 'daily';
      const isCommunity = task.type === 'publish_group';
      const baseType = isDaily ? task.type.replace('daily_', '') : task.type;

      const { data: alreadyDone } = await supabase.from('user_completed_tasks').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();

      if (isDaily) {
         const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
         const { data: recentLog } = await supabase.from('history_logs')
           .select('id').eq('user_id', targetId).like('description', `%[Daily:${taskId}]%`).gte('created_at', yesterday).maybeSingle();
         if (recentLog) return res.status(400).json({ success: false, error: 'Ya reclamaste este Check-in hoy. Vuelve mañana.' });
      } else if (alreadyDone && !isCommunity) {
         return res.status(400).json({ success: false, error: 'Ya completaste esta tarea.' });
      }

      if (baseType === 'group' || baseType === 'channel' || isCommunity) {
        const chatId = extractTelegramUsername(task.url);
        if (chatId) {
          const isJoined = await checkMembership(targetId, chatId);
          if (!isJoined) {
            const isBotStillAdmin = await checkAdminStatus(chatId);
            if (!isBotStillAdmin) {
              await supabase.from('tasks').update({ status: 'paused' }).eq('id', taskId);
              return res.status(400).json({ success: false, error: 'El bot ya no es administrador del grupo. La campaña se ha pausado automáticamente.' });
            }
            return res.status(400).json({ success: false, error: 'No te has unido al canal o grupo.' });
          }
        }
      } else if (baseType === 'bot' && task.bot_token) {
        try { await axios.post(`https://api.telegram.org/bot${task.bot_token}/sendChatAction`, { chat_id: targetId, action: 'typing' }); } catch (e) { return res.status(400).json({ success: false, error: 'Asegúrate de darle a INICIAR (/start) al bot.' }); }
      }

      if (isCommunity && alreadyDone) {
        return res.status(200).json({ success: true, is_rejoin: true, message: '¡Unión verificada!' });
      }

      if (!isDaily) {
         await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);
      }

      const rewardAmount = isCommunity ? 1 : Number(task.reward || 1);
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + rewardAmount).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);

      const logDesc = isDaily ? `Check-in: "${task.title}" [Daily:${taskId}]` : `Recompensa por "${task.title}".`;
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `✅ Tarea Completada`, description: logDesc, amount: rewardAmount }]);

      if (dbUser.referred_by) {
        const commissionAmount = Number((rewardAmount * 0.20).toFixed(4));
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          await supabase.from('users').update({ balance: Number((Number(referrer.balance || 0) + commissionAmount).toFixed(4)), referral_earnings: Number((Number(referrer.referral_earnings || 0) + commissionAmount).toFixed(4)), total_earnings: Number((Number(referrer.total_earnings || 0) + commissionAmount).toFixed(4)) }).eq('id', referrer.id);
        }
      }

      const newDoneCount = Number(task.completions_done || 0) + 1;
      await supabase.from('tasks').update({ 
        completions_done: newDoneCount, 
        status: (!isCommunity && newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' 
      }).eq('id', taskId);

      return res.status(200).json({ success: true, reward: rewardAmount, balance: newBalance });
    }

    if (action === 'claim-bonus') {
      const targetId = String(userId);
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const reward = 0.50;
      const newBalance = Number((Number(dbUser.balance || 0) + reward).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + reward).toFixed(4));

      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📺 Bono por anuncio', description: 'Visualización de anuncio.', amount: reward }]);

      if (dbUser.referred_by) {
        const commissionAmount = Number((reward * 0.20).toFixed(4));
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) { await supabase.from('users').update({ balance: Number((Number(referrer.balance || 0) + commissionAmount).toFixed(4)), referral_earnings: Number((Number(referrer.referral_earnings || 0) + commissionAmount).toFixed(4)), total_earnings: Number((Number(referrer.total_earnings || 0) + commissionAmount).toFixed(4)) }).eq('id', referrer.id); }
      }
      return res.status(200).json({ success: true, balance: newBalance });
    }

    if (action === 'get-history') {
      const targetId = String(userId);
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', targetId).order('created_at', { ascending: false }); 
      return res.status(200).json({ success: true, history: history || [] });
    }

    if (action === 'get-referrals') {
      const targetId = String(userId);
      let { data: lv1 } = await supabase.from('users').select('*').eq('referred_by', targetId);

      if (lv1 && lv1.length > 0) {
        for (const refUser of lv1) {
          if (!refUser.referral_reward_granted) { await tryGrantReferralReward({ id: refUser.id, is_premium: false }); }
        }
        const refreshed = await supabase.from('users').select('*').eq('referred_by', targetId);
        lv1 = refreshed.data || lv1;
      }
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', targetId).maybeSingle();
      return res.status(200).json({ success: true, referrals: lv1 || [], earnings: dbUser?.referral_earnings || 0 });
    }

    if (action === 'verify-human') {
      const targetId = String(userId || user?.id);
      await supabase.from('users').update({ is_human: true }).eq('id', targetId);
      await tryGrantReferralReward(user || { id: targetId, is_premium: false });
      return res.status(200).json({ success: true, is_human: true });
    }

    const targetUser = user || { id: userId, is_premium: false };
    const targetId = String(targetUser?.id);
    if (!targetId || targetId === 'undefined') return res.status(400).json({ success: false, error: 'No user id' });

    let { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
    if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

    if (!dbUser) {
      const newUserObj = { id: targetId, username: targetUser.username || 'Usuario', balance: 0, total_earnings: 0, referral_earnings: 0, is_human: false, referral_reward_granted: false };
      if (start_param && String(start_param) !== targetId) newUserObj.referred_by = String(start_param);
      const { data: newUser } = await supabase.from('users').insert([newUserObj]).select().single();
      dbUser = newUser;
    }

    await tryGrantReferralReward(targetUser);
    
    // 🔥 CALCULAR CLICKS GLOBALES Y RECIBIDOS REALES
    const { data: totalTasks } = await supabase.from('tasks').select('completions_done, creator_id').neq('type', 'publish_group');
    
    let globalclicks = 0;
    let receivedclicks = 0;
    
    if (totalTasks) {
      totalTasks.forEach(t => {
        const done = t.completions_done || 0;
        globalclicks += done;
        if (String(t.creator_id) === targetId) {
          receivedclicks += done;
        }
      });
    }

    const formattedGlobal = globalclicks >= 1000 ? (globalclicks / 1000).toFixed(1) + 'K' : globalclicks;
    const formattedReceived = receivedclicks >= 1000 ? (receivedclicks / 1000).toFixed(1) + 'K' : receivedclicks;

    dbUser.global_clicks = formattedGlobal;
    dbUser.received_clicks = formattedReceived;

    const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);
    
    return res.status(200).json({ success: true, user: dbUser, stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) } });

  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}
