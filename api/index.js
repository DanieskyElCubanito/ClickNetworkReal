import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto'; 
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

// VARIABLES DE ENTORNO SEGURAS
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
const FALLBACK_MASTER_WALLET = "UQDgJUo4Ycvd9Q_ICUI6I-trCRcZgzBXHmhe0z_8lRHWfU3I";

const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

// ⚡ NUEVO: Obtener precio en vivo para el pago
async function getTonPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const data = await res.json();
    return data['the-open-network'].usd || 5.0;
  } catch (e) { return 5.0; }
}

// ⚡ NUEVO: Función que firma y envía los TON a los usuarios
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
      messages: [internal({
          to: destinationAddress,
          value: nanoTonAmount,
          bounce: false,
          body: "Retiro TeleGem"
      })],
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
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente.' });
       }
    }

    const { user, action, userId, start_param } = req.body; 
    const targetId = String(userId || user?.id);

    // ⚡ LÓGICA DE RETIROS ACTUALIZADA
    if (action === 'request-withdrawal') {
      const { address, amount } = req.body;
      const withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.2) {
        return res.status(400).json({ success: false, error: 'Datos inválidos. Mínimo: 0.2 USDT.' });
      }

      const { data: dbUser } = await supabase.from('users').select('balance, username').eq('id', targetId).single();
      if (!dbUser || Number(dbUser.balance || 0) < withdrawAmount) {
        return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });
      }

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

      // Si es menor a 0.9, lo paga automáticamente sin preguntar
      if (withdrawAmount <= 0.9) {
          try {
              await sendTonAutomated(address, withdrawAmount);
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
              return res.status(200).json({ success: true, balance: newBalance, message: 'Pago enviado a la blockchain.' });
          } catch (err) {
              await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal.id);
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, text: `🚨 Falló el pago automático de ${withdrawAmount} USDT para ID ${targetId}. Motivo: ${err.message}. Quedó como pendiente.` })
              });
              return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en cola manual por alta red.' });
          }
      } else {
          // Si es mayor a 0.9, envía los botones al admin
          const inlineKeyboard = {
            inline_keyboard: [
              [
                { text: "✅ Aprobar y Pagar (Auto)", callback_data: `w_approve_${withdrawal.id}` }
              ],
              [
                { text: "❌ Rechazar (Reembolsar)", callback_data: `w_reject_${withdrawal.id}` }
              ]
            ]
          };

          const msgText = `🚨 <b>RETIRO GRANDE DETECTADO</b>\n\n👤 <b>Usuario ID:</b> <code>${targetId}</code>\n👤 <b>Username:</b> @${dbUser.username || 'Sin_Usuario'}\n💰 <b>Monto:</b> ${withdrawAmount} USDT\n📌 <b>Billetera Destino:</b>\n<code>${address}</code>\n\n<i>¿Autorizar que el bot firme y envíe los fondos?</i>`;

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, text: msgText, parse_mode: 'HTML', reply_markup: inlineKeyboard })
          });

          return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en revisión administrativa.' });
      }
    }

    if (action === 'claim-bonus') {
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const reward = 0.005;
      const newBalance = Number((Number(dbUser.balance || 0) + reward).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + reward).toFixed(4));
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📺 Bono por anuncio', description: 'Visualización de anuncio.', amount: reward }]);
      return res.status(200).json({ success: true, balance: newBalance });
    }

    if (action === 'get-history') {
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', targetId).order('created_at', { ascending: false }); 
      return res.status(200).json({ success: true, history: history || [] });
    }

    if (action === 'get-referrals') {
      let { data: lv1 } = await supabase.from('users').select('id, username, is_human').eq('referred_by', targetId);
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', targetId).maybeSingle();
      return res.status(200).json({ success: true, referrals: lv1 || [], earnings: dbUser?.referral_earnings || 0 });
    }

    if (action === 'verify-human') {
      await supabase.from('users').update({ is_human: true }).eq('id', targetId);
      return res.status(200).json({ success: true, is_human: true });
    }

    if (action === 'verify' || !action) {
      const targetUser = user || { id: userId, is_premium: false };
      if (!targetId || targetId === 'undefined') return res.status(400).json({ success: false, error: 'No user id' });

      let { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
      if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

      if (!dbUser) {
        const newUserObj = { id: targetId, username: targetUser.username || 'Usuario', balance: 0, balance_retenido: 0, total_earnings: 0, referral_earnings: 0, is_human: false };
        if (start_param && String(start_param) !== targetId) newUserObj.referred_by = String(start_param);
        const { data: newUser } = await supabase.from('users').insert([newUserObj]).select().single();
        dbUser = newUser;
      }

      const { data: totalTasks } = await supabase.from('tasks').select('completions_done, creator_id').neq('type', 'publish_group');
      let globalclicks = 0; let receivedclicks = 0;
      if (totalTasks) {
        totalTasks.forEach(t => {
          const done = t.completions_done || 0;
          globalclicks += done;
          if (String(t.creator_id) === targetId) receivedclicks += done;
        });
      }

      dbUser.global_clicks = globalclicks >= 1000 ? (globalclicks / 1000).toFixed(1) + 'K' : globalclicks;
      dbUser.received_clicks = receivedclicks >= 1000 ? (receivedclicks / 1000).toFixed(1) + 'K' : receivedclicks;

      const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);

      return res.status(200).json({ success: true, user: dbUser, stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) } });
    }

    return res.status(400).json({ success: false, error: `Acción '${action}' no reconocida.` });

  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}
