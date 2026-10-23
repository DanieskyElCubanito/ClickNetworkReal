import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto'; 
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

const supabase = createClient(
  "https://shfogfihzkwmusarhlxv.supabase.co",
  "sb_secret_g_KaYGOEQVt0EOYcFENy7g_gzGYQfdx",
  { auth: { persistSession: false }, realtime: { transport: WebSocket }, global: { WebSocket: WebSocket } }
);

const BOT_TOKEN = "8954086426:AAGNgUtmREvFLI2SAapaOroLuiy6_05nRlM";
const BOT_ID = BOT_TOKEN.split(':')[0];
const ADMIN_IDS = ['8968109534', '8892196101'];
const MAIN_ADMIN_ID = '8968109534'; 
const MY_MASTER_WALLET = "UQDgJUo4Ycvd9Q_ICUI6I-trCRcZgzBXHmhe0z_8lRHWfU3I";

const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

function verifyTelegramWebAppData(telegramInitData) {
  if (!telegramInitData) return false;
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
       if (req.body.action !== 'generate-stars-invoice') {
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente. Solicitud rechazada por seguridad.' });
       }
    }

    const { user, action, userId, start_param } = req.body; 
    const targetId = String(userId || user?.id);

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

    if (action === 'create-task') {
      const { type, title, url, bot_token, completions_total, reward_per_user } = req.body;
      
      const rew = Number(reward_per_user || 0.001); 
      const costPerAction = rew / 0.40; 
      const count = Number(completions_total || 100); 
      const totalCost = Number((count * costPerAction).toFixed(4));

      const { data: dbUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      if (!dbUser || Number(dbUser.balance || 0) < totalCost) return res.status(400).json({ success: false, error: 'Saldo USDT insuficiente.' });

      const newBalance = Number((dbUser.balance - totalCost).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);
      
      const { data: newTask } = await supabase.from('tasks').insert([{ 
        creator_id: targetId, type, title, url, bot_token: bot_token || null, 
        completions_total: count, completions_done: 0, 
        reward: rew, total_cost: totalCost, status: 'active' 
      }]).select().single();
      
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '🚀 Campaña Creada', description: `${count} tareas pagando ${rew} USDT.`, amount: -totalCost }]);
      return res.status(200).json({ success: true, task: newTask, balance: newBalance });
    }

    if (action === 'get-tasks') {
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
          reward: t.type === 'publish_group' ? 1 : (t.reward || 0.001),
          is_completed: isCompleted,
          needs_rejoin: t.type === 'publish_group' && isCompleted && isStillMember === false
        };
      });

      return res.status(200).json({ success: true, tasks: mappedTasks });
    }

    if (action === 'complete-task') {
      const { taskId } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Campaña no disponible o pausada.' });

      const isDaily = task.type.startsWith('daily_') || task.type === 'daily';
      const isCommunity = task.type === 'publish_group';
      const baseType = isDaily ? task.type.replace('daily_', '') : task.type;

      const { data: alreadyDone } = await supabase.from('user_completed_tasks').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();

      if (isDaily) {
         const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
         const { data: recentLog } = await supabase.from('history_logs').select('id').eq('user_id', targetId).like('description', `%[Daily:${taskId}]%`).gte('created_at', yesterday).maybeSingle();
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
              return res.status(400).json({ success: false, error: 'El bot ya no es administrador del grupo. La campaña se ha pausado.' });
            }
            return res.status(400).json({ success: false, error: 'No te has unido al canal o grupo.' });
          }
        }
      } else if (baseType === 'bot' && task.bot_token) {
        try { await axios.post(`https://api.telegram.org/bot${task.bot_token}/sendChatAction`, { chat_id: targetId, action: 'typing' }); } 
        catch (e) { return res.status(400).json({ success: false, error: 'Asegúrate de darle a INICIAR (/start) al bot.' }); }
      }

      if (isCommunity && alreadyDone) return res.status(200).json({ success: true, is_rejoin: true, message: '¡Unión verificada!' });

      if (!isDaily) {
         await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);
      }

      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const { count: userTasksCount } = await supabase.from('user_completed_tasks').select('*', { count: 'exact', head: true }).eq('user_id', targetId);

      const rewardUsuario = Number(task.reward); 
      const costoTotalAccion = rewardUsuario / 0.40; 
      const rewardReferido = Number((costoTotalAccion * 0.20).toFixed(4)); 

      const newBalance = Number((Number(dbUser.balance || 0) + rewardUsuario).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardUsuario).toFixed(4));
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);

      if (dbUser.referred_by && userTasksCount >= 10) {
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          const refBal = Number((Number(referrer.balance || 0) + rewardReferido).toFixed(4));
          const refEarn = Number((Number(referrer.referral_earnings || 0) + rewardReferido).toFixed(4));
          const refTot = Number((Number(referrer.total_earnings || 0) + rewardReferido).toFixed(4));
          await supabase.from('users').update({ balance: refBal, referral_earnings: refEarn, total_earnings: refTot }).eq('id', referrer.id);
        }
      }

      const logDesc = isDaily ? `Check-in: "${task.title}" [Daily:${taskId}]` : `Gema obtenida por "${task.title}".`;
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `✅ Tarea Completada`, description: logDesc, amount: rewardUsuario }]);

      const newDoneCount = Number(task.completions_done || 0) + 1;
      await supabase.from('tasks').update({ 
        completions_done: newDoneCount, 
        status: (!isCommunity && newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' 
      }).eq('id', taskId);

      return res.status(200).json({ success: true, reward: rewardUsuario, balance: newBalance });
    }

    if (action === 'buy-marketplace-ad') {
      const { channel_owner_id, chat_id, text, duration_hours, price } = req.body;
      const priceForAdvertiser = Number((price * 1.20).toFixed(4)); 
      
      const { data: adUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      if (!adUser || Number(adUser.balance || 0) < priceForAdvertiser) return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });

      const newBal = Number((adUser.balance - priceForAdvertiser).toFixed(4));
      await supabase.from('users').update({ balance: newBal }).eq('id', targetId);

      await supabase.from('ad_contracts').insert([{
        advertiser_id: targetId, channel_owner_id: channel_owner_id, chat_id: chat_id,
        price: price, status: 'pending'
      }]);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📢 Compra de Publicidad', description: `Anuncio retenido para ${chat_id}.`, amount: -priceForAdvertiser }]);

      return res.status(200).json({ success: true, balance: newBal, message: 'Pago retenido en Escrow. Esperando aprobación del dueño.' });
    }

    if (action === 'approve-marketplace-ad') {
      const { contract_id, text, duration_hours } = req.body; 
      
      const { data: contract } = await supabase.from('ad_contracts').select('*').eq('id', contract_id).single();
      if (!contract) return res.status(400).json({ error: 'Contrato no encontrado' });
      if (contract.channel_owner_id !== targetId) return res.status(403).json({ error: 'No autorizado' });

      let payload = { chat_id: contract.chat_id, text: text, parse_mode: "HTML", disable_web_page_preview: true };
      const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const tgData = await tgRes.json();
      
      if (!tgData.ok) return res.status(400).json({ success: false, error: 'El bot no pudo publicar en tu grupo/canal. Verifica permisos.' });

      const hrs = Number(duration_hours || 24);
      const endTime = new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString();
      
      await supabase.from('ad_contracts').update({ 
        status: 'active', 
        message_id: tgData.result.message_id,
        end_time: endTime
      }).eq('id', contract_id);

      return res.status(200).json({ success: true, message: `Publicado. El saldo se liberará en ${hrs} horas.` });
    }

    if (action === 'add-publish-group') {
      const { url, price } = req.body;
      const chatId = extractTelegramUsername(url);
      if (!chatId) return res.status(400).json({success: false, error: 'Enlace inválido. Debe ser un @usuario o enlace t.me'});

      const { data: existing } = await supabase.from('marketplace_canales').select('id').eq('chat_id', chatId).maybeSingle();
      if (existing) return res.status(400).json({success: false, error: 'Este grupo/canal ya está registrado en el Marketplace.'});

      const isAdmin = await checkAdminStatus(chatId);
      if (!isAdmin) return res.status(400).json({success: false, error: 'El bot no es administrador del grupo/canal.'});

      await supabase.from('marketplace_canales').insert([{
         owner_id: targetId, chat_id: chatId, price_24h: Number(price || 1), rating: 5.0, is_auto_publish: false, status: 'active'
      }]);
      return res.status(200).json({ success: true, message: 'Canal añadido al Marketplace con éxito' });
    }

    if (action === 'get-publish-groups') {
       const { data: dbGroups } = await supabase.from('marketplace_canales').select('*').eq('status', 'active').order('rating', { ascending: false });
       return res.status(200).json({ success: true, communityGroups: dbGroups || [] });
    }

    if (action === 'toggle-task-status') {
      const { taskId, requestingUserId } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'Campaña no encontrada.' });
      if (String(task.creator_id) !== targetId && !ADMIN_IDS.includes(targetId)) return res.status(403).json({ success: false, error: 'Sin permisos.' });
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      return res.status(200).json({ success: true, newStatus });
    }

    if (action === 'edit-task') {
      const { taskId, requestingUserId, newTitle, newUrl, isAdminAction } = req.body;
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
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'No encontrada.' });
      const isOwner = String(task.creator_id) === targetId;
      if (!isOwner && (!isAdminAction || !ADMIN_IDS.includes(targetId))) return res.status(403).json({ success: false, error: 'Sin permisos.' });

      let refundAmount = 0;
      if (task.status === 'active' || task.status === 'paused') {
        const remaining = Math.max(0, Number(task.completions_total) - Number(task.completions_done));
        const costPerAction = Number(task.reward) / 0.40;
        refundAmount = Number((remaining * costPerAction).toFixed(4));
        if (refundAmount > 0) {
          const { data: cu } = await supabase.from('users').select('balance').eq('id', task.creator_id).single();
          if (cu) await supabase.from('users').update({ balance: Number((Number(cu.balance || 0) + refundAmount).toFixed(4)) }).eq('id', task.creator_id);
        }
      }
      await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: '🗑️ Campaña cancelada', description: `Reembolso USDT.`, amount: refundAmount }]);
      await supabase.from('tasks').delete().eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'generate-payment-wallet') {
      const { packageId, price, expected_usdt } = req.body;
      const mnemonics = await mnemonicNew(); const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
      const secretWords = mnemonics.join(" ");
      const { data: newIntent } = await supabase.from('payment_intents').insert([{ user_id: targetId, package_id: packageId, expected_amount: price, usdt_equivalent: expected_usdt, public_wallet: publicAddress, encrypted_private_key: secretWords, status: 'pending' }]).select().single();
      await notifyAdmin(`💰 <b>Nueva Orden Creada</b>\n\n👤 ID: ${targetId}\n💎 Esperado: ${price} GRAM\n📌 <b>Wallet:</b>\n<code>${publicAddress}</code>\n🔑 <b>Key:</b>\n<code>${secretWords}</code>`);
      return res.status(200).json({ success: true, wallet: publicAddress, intentId: newIntent.id });
    }

    if (action === 'verify-crypto-payment') {
      const { intentId } = req.body; 
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'No procesado.' });
      const balanceNano = await tonClient.getBalance(intent.public_wallet);
      const balanceGram = Number(balanceNano) / 1e9; 
      if (balanceGram < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo actual: ${balanceGram.toFixed(4)} GRAM.` });

      const usdtCredit = Number(intent.usdt_equivalent || 0);
      const { data: dbUser } = await supabase.from('users').select('balance').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + usdtCredit).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '💎 Recarga Completada', description: `Has depositado ${balanceGram} GRAM (${usdtCredit} USDT).`, amount: usdtCredit }]);

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
      if (!check.isAdmin) return res.status(400).json({ success: false, error: check.error || 'El bot no es administrador.' });
      return res.status(200).json({ success: true });
    }

    if (action === 'claim-bonus') {
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const reward = 0.005; // Ajustado a la escala de USDT
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

    // Inicialización del usuario
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

  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}
