export const maxDuration = 60;

import { supabase } from '../utils/supabase.js'; 
import { checkRateLimit, verifyTelegramWebAppData } from '../utils/security.js';
import { getDerivedUsdtWallet, sweepUsdtAutomated, sendTonAutomated } from '../utils/blockchain.js';
import { extractTelegramUsername, notifyAdmin, notifyUser, checkMembership, checkAdminStatus, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

// -----------------------------------------------------------
// FUNCIÓN INTERNA: AUDITORÍA DE RETENCIÓN (Anti Hit&Run)
// -----------------------------------------------------------
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
      if (t && (t.type === 'group' || t.type === 'channel' || t.type === 'partner' || t.type === 'daily_channel')) {
        const chatId = extractTelegramUsername(t.url);
        if (chatId) {
          const isStillMember = await checkMembership(userId, chatId);
          if (!isStillMember) {
            const penaltyAmount = Number(t.reward || 0);

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
                user_id: userId, title: '⚠️ Penalidad de Permanencia', 
                description: `Saliste de la comunidad antes de 24h. Sanción: -${gemasPenalidad} Gemas.`, amount: -penaltyAmount 
              }]);
              
              const penaltyMsg = `⚠️ <b>PENALIZACIÓN DE RED</b>\n\nHas abandonado la comunidad <b>${t.title}</b> antes de cumplir el ciclo mínimo de 24h.\n\n🔻 Se han deducido <b>${gemasPenalidad} Gemas</b> de tu balance.\n\n🔗 <a href="${t.url}">Haz clic aquí para unirte nuevamente</a> y poder reclamar la misión desde la App.`;
              await notifyUser(userId, penaltyMsg);
            }
          }
        }
      }
    }
  } catch (error) { console.error("Error auditoría:", error); }
}

// -----------------------------------------------------------
// ENRUTADOR PRINCIPAL (ROUTER)
// -----------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');

    if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ==========================================
    // 🤖 INTERCEPTOR DE WEBHOOKS (BOTONES DE TELEGRAM)
    // ==========================================
    if (req.body && req.body.callback_query) {
      const cb = req.body.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;

      // Solo tú (Comandante) puedes pulsar estos botones
      if (String(cb.from.id) !== '8968109534' && String(cb.from.id) !== '8892196101') {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, { method: 'POST', body: JSON.stringify({ callback_query_id: cb.id, text: 'Acceso Denegado', show_alert: true }) });
        return res.status(200).end();
      }

      if (data.startsWith('bounty_')) {
        const parts = data.split('_');
        const actionType = parts[1]; 
        const submissionId = parts[2];

        const { data: sub } = await supabase.from('bounty_submissions').select('*, bounty_tasks(*)').eq('id', submissionId).single();
        
        if (!sub || sub.status !== 'pending') {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: cb.id, text: 'Esta prueba ya fue procesada.', show_alert: true }) });
          return res.status(200).end();
        }

        const targetUserId = sub.user_id;
        const rewardUsdt = Number(sub.bounty_tasks.reward);
        const gemas = (rewardUsdt * 1000).toFixed(2);

        if (actionType === 'approve') {
          await supabase.from('bounty_submissions').update({ status: 'approved' }).eq('id', submissionId);
          await supabase.from('bounty_tasks').update({ completions_done: sub.bounty_tasks.completions_done + 1 }).eq('id', sub.bounty_tasks.id);
          
          const { data: u } = await supabase.from('users').select('balance, total_earnings').eq('id', targetUserId).single();
          await supabase.from('users').update({ balance: Number((Number(u.balance) + rewardUsdt).toFixed(4)), total_earnings: Number((Number(u.total_earnings) + rewardUsdt).toFixed(4)) }).eq('id', targetUserId);
          
          await supabase.from('history_logs').insert([{ user_id: targetUserId, title: '✅ Misión VIP Aprobada', description: `Recompensa por "${sub.bounty_tasks.title}" | +${gemas} Gemas`, amount: rewardUsdt }]);
          
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetUserId, text: `🎉 <b>¡MISIÓN VIP APROBADA!</b>\n\nTu prueba para <b>${sub.bounty_tasks.title}</b> fue válida.\n💰 Se han añadido <b>${gemas} Gemas</b> a tu balance.`, parse_mode: 'HTML' }) });
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: cb.message.text + '\n\n✅ <b>ESTADO: APROBADA Y PAGADA</b>.', parse_mode: 'HTML' }) });

        } else if (actionType === 'reject') {
          await supabase.from('bounty_submissions').update({ status: 'rejected' }).eq('id', submissionId);
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetUserId, text: `❌ <b>MISIÓN VIP RECHAZADA</b>\n\nTu prueba para <b>${sub.bounty_tasks.title}</b> no cumplió los requisitos o la imagen era inválida.`, parse_mode: 'HTML' }) });
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: cb.message.text + '\n\n❌ <b>ESTADO: RECHAZADA</b>.', parse_mode: 'HTML' }) });
        }

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: cb.id, text: 'Comando ejecutado con éxito' }) });
      }
      return res.status(200).end();
    }

    // A partir de aquí sigue el código normal de IP y validación de firma
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';


    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ success: false, error: 'Demasiadas solicitudes. Intente más tarde.' });
    }

    const telegramInitData = req.headers['x-telegram-init-data'];
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
         return res.status(403).json({ success: false, error: 'Firma de Telegram inválida o ausente. Abre la app desde el bot oficial.' });
    }

    if (!req.body) return res.status(400).json({ success: false, error: 'Cuerpo de solicitud vacío.' });

    const { user, action, userId, start_param } = req.body; 


           // ==========================================
    // 🛡️ AUTENTICACIÓN Y REGISTRO (BLINDADO CONTRA BOTS Y CLONES)
    // ==========================================
    if (action === 'verify') {
      const targetUser = user || { id: userId, is_premium: false };
      const targetId = String(targetUser?.id);
      const deviceId = targetUser?.deviceId || 'unknown_device';

      if (!targetId || targetId === 'undefined') return res.status(400).json({ success: false, error: 'No user id' });

      // 🔥 ESCUDO 1: Bloquear entornos sin deviceId válido (emuladores básicos)
      if (!deviceId || deviceId === 'unknown_device' || deviceId === 'undefined') {
        return res.status(403).json({ success: false, error: 'Acceso denegado: Dispositivo no verificado o emulador detectado.' });
      }

      runRetentionAudit(targetId).catch(err => {});

      let { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
      if (dbError) throw new Error("Error en Supabase: " + dbError.message);
      
      if (dbUser && dbUser.is_banned) return res.status(403).json({ success: false, error: 'Cuenta suspendida.' });

      // 🔥 ESCUDO 2: Resolver el "empate" de dispositivos
      // Buscamos cuál fue la PRIMERA cuenta (la más antigua) que registró este dispositivo
      const { data: firstDeviceOwner } = await supabase
        .from('users')
        .select('id')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: true }) // El más antiguo es el dueño real
        .limit(1)
        .maybeSingle();

      // 🛡️ LISTA BLANCA DE COMANDANTE (Cuentas inmunes al bloqueo por clonación)
      const IMMUNE_IDS = ['8968109534', '8892196101'];

      // Si el dispositivo ya tiene un dueño original, NO eres tú, y NO estás en la lista de inmunidad, te bloquea
      if (firstDeviceOwner && String(firstDeviceOwner.id) !== targetId && !IMMUNE_IDS.includes(targetId)) {
        notifyAdmin(`🚨 <b>BLOQUEO DE GRANJA / MULTICUENTA</b>\nEl usuario <code>${targetId}</code> intentó entrar a un dispositivo cuyo dueño original es <code>${firstDeviceOwner.id}</code>.`);
        return res.status(403).json({ 
          success: false, 
          error: 'Acceso bloqueado: Dispositivo vinculado a otra cuenta principal. No se permiten multicuentas.' 
        });
      }

      if (!dbUser) {
        // Usuario totalmente nuevo y legítimo
        const newUserObj = { 
          id: targetId, 
          username: targetUser.username || 'Usuario', 
          balance: 0, 
          deposit_balance: 0, 
          total_earnings: 0, 
          referral_earnings: 0, 
          is_human: true, 
          device_id: deviceId, 
          last_ip: clientIp, 
          referral_reward_granted: true 
        };
       
        if (start_param && String(start_param) !== targetId) {
          const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
          if (inviter) {
            newUserObj.referred_by = String(start_param);
            const { data: activeEv } = await supabase.from('events').select('id, event_type, end_date').eq('status', 'active').maybeSingle();
            if (activeEv && activeEv.event_type === 'referral') {
              if (new Date().getTime() < new Date(activeEv.end_date).getTime()) { 
                const { data: part } = await supabase.from('event_participants').select('score').eq('event_id', activeEv.id).eq('user_id', String(start_param)).maybeSingle();
                if (part) await supabase.from('event_participants').update({ score: part.score + 1 }).eq('event_id', activeEv.id).eq('user_id', String(start_param));
                else await supabase.from('event_participants').insert([{ event_id: activeEv.id, user_id: String(start_param), score: 1 }]);
              } else await supabase.from('events').update({ status: 'completed' }).eq('id', activeEv.id);
            }
          }
        }

        const { data: newUser } = await supabase.from('users').insert([newUserObj]).select().single();
        dbUser = newUser;
      } else {
        // Actualizar último dispositivo e IP para la cuenta legítima o inmune
        await supabase.from('users').update({ device_id: deviceId, last_ip: clientIp }).eq('id', targetId);
      }

      const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);
      return res.status(200).json({ success: true, user: dbUser, stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) } });
    }



    // ==========================================
    // 📊 ESTADÍSTICAS Y LEADERBOARD
    // ==========================================
    if (action === 'get-global-stats') {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('status', 'completed');
      const totalWithdrawnUsdt = withdrawals ? withdrawals.reduce((sum, w) => sum + Number(w.amount), 0) : 0;
      const { data: deposits } = await supabase.from('users').select('deposit_balance');
      const totalDeposited = deposits ? deposits.reduce((sum, u) => sum + Number(u.deposit_balance), 0) : 0;
      const { data: statsRow } = await supabase.from('platform_stats').select('total_global_clicks').eq('id', 1).maybeSingle();
      const daysOnline = Math.max(1, Math.floor((Date.now() - new Date("2026-10-25T00:00:00Z").getTime()) / 86400000));
      return res.status(200).json({ success: true, stats: { users: totalUsers || 0, withdrawn: totalWithdrawnUsdt * 1000, deposited: totalDeposited, globalClicks: statsRow?.total_global_clicks || 0, daysOnline } });
    }

    if (action === 'get-leaderboard') {
      let completedRanking = [];
      const { data: allTasksDone } = await supabase.from('user_completed_tasks').select('user_id');
      if (allTasksDone) {
        const taskCounts = {};
        for (const t of allTasksDone) taskCounts[t.user_id] = (taskCounts[t.user_id] || 0) + 1;
        const sortedUsers = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        for (const [uid, count] of sortedUsers) {
          const { data: u } = await supabase.from('users').select('username').eq('id', uid).maybeSingle();
          completedRanking.push({ id: uid, username: u?.username || 'Usuario', score: count });
        }
      }

      let topReferrers = [];
      const { data: tr } = await supabase.from('users').select('id, username').order('referral_earnings', { ascending: false }).limit(10);
      if (tr) {
        for (const u of tr) {
          const { count: activosCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', u.id).gte('total_earnings', 0.005);
          topReferrers.push({ id: u.id, username: u.username || 'Usuario', score: activosCount || 0 });
        }
        topReferrers.sort((a, b) => b.score - a.score);
      }

      let pastEventsPublic = [];
      const { data: allEventsData } = await supabase.from('events').select('*').order('end_date', { ascending: false });
      const pastEventsData = (allEventsData || []).filter(ev => ev.status === 'completed' || (ev.status === 'active' && new Date(ev.end_date).getTime() <= Date.now())).slice(0, 5);
      for (const ev of pastEventsData) {
        const { data: participants } = await supabase.from('event_participants').select('user_id, score').eq('event_id', ev.id).order('score', { ascending: false }).limit(3);
        const winners = [];
        if (participants) {
          for (const p of participants) {
            const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).maybeSingle();
            winners.push({ userId: p.user_id, username: u?.username || 'Usuario', score: p.score });
          }
        }
        pastEventsPublic.push({ ...ev, winners });
      }
      return res.status(200).json({ success: true, topTasks: completedRanking, topReferrals: topReferrers, pastEvents: pastEventsPublic });
    }

    if (action === 'get-active-event') {
      const { data: activeEvent } = await supabase.from('events').select('*').eq('status', 'active').maybeSingle();
      if (!activeEvent) return res.status(200).json({ success: true, activeEvent: null, leaderboard: [] });
      if (new Date().getTime() >= new Date(activeEvent.end_date).getTime()) {
        await supabase.from('events').update({ status: 'completed' }).eq('id', activeEvent.id);
        return res.status(200).json({ success: true, activeEvent: null, leaderboard: [] });
      }
      const { data: participants } = await supabase.from('event_participants').select('user_id, score').eq('event_id', activeEvent.id).order('score', { ascending: false }).limit(10);
      const leaderboard = [];
      if (participants) {
        for (const p of participants) {
          const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).single();
          leaderboard.push({ userId: p.user_id, username: u?.username || 'Usuario', score: p.score });
        }
      }
      return res.status(200).json({ success: true, activeEvent, leaderboard });
    }

    // ==========================================
    // 💼 GESTIÓN DE TAREAS Y RACHA
    // ==========================================
    if (action === 'get-tasks') {
      const targetId = String(userId);
      const { data: allTasks } = await supabase.from('tasks').select('*').or(`status.in.(active,paused),creator_id.eq.${targetId}`).order('created_at', { ascending: false });

      const { data: completedRows } = await supabase.from('user_completed_tasks').select('task_id').eq('user_id', targetId);
      const completedIds = new Set((completedRows || []).map(r => String(r.task_id)));

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: historyLogs } = await supabase.from('history_logs').select('created_at, description').eq('user_id', targetId).order('created_at', { ascending: false }).limit(20);
      
      let gigaPubClaimed = false; 
      let currentStreak = 1;
      const completedDailyIds = new Set();
      
      if (historyLogs) {
         const latestGigaLog = historyLogs.find(log => log.description?.includes('[GigaPubDaily]'));
         if (latestGigaLog) {
            const match = latestGigaLog.description.match(/\[Streak:(\d+)\]/);
            if (match) currentStreak = Number(match[1]);
            
            const logDate = new Date(latestGigaLog.created_at);
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            
            if (logDate >= startOfToday) {
               gigaPubClaimed = true; 
            } else if (logDate < new Date(startOfToday.getTime() - 86400000)) {
               currentStreak = 1; 
            } else if (!gigaPubClaimed) {
               currentStreak = Math.min(currentStreak + 1, 7);
            }
         }
         historyLogs.forEach(log => {
           const match = log.description?.match(/\[Daily:(.+?)\]/);
           if (match) {
             const lDate = new Date(log.created_at);
             const startToday = new Date(); startToday.setUTCHours(0,0,0,0);
             if (lDate >= startToday) completedDailyIds.add(match[1]);
           }
         });
      }

      const mappedTasks = (allTasks || []).map(t => {
        const isDaily = t.type.startsWith('daily_') || t.type === 'daily';
        return { ...t, reward: (t.reward || 1), is_completed: isDaily ? completedDailyIds.has(String(t.id)) : completedIds.has(String(t.id)) };
      });

      return res.status(200).json({ success: true, tasks: mappedTasks, gigaPubClaimed, streakCount: currentStreak });
    }

        // ==========================================
    // 🌟 MISIONES VIP (BOUNTIES MANUALES)
    // ==========================================
    if (action === 'get-bounties') {
      const targetId = String(userId);
      const { data: bounties } = await supabase.from('bounty_tasks').select('*').eq('status', 'active').order('created_at', { ascending: false });
      const { data: submissions } = await supabase.from('bounty_submissions').select('task_id, status').eq('user_id', targetId);
      
      const mapped = (bounties || []).map(b => {
        const sub = (submissions || []).find(s => s.task_id === b.id);
        return { ...b, user_status: sub ? sub.status : 'none' };
      });
      return res.status(200).json({ success: true, bounties: mapped });
    }

    if (action === 'submit-bounty') {
      const { taskId, imageUrl } = req.body;
      const targetId = String(userId);

      const { data: task } = await supabase.from('bounty_tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Misión inactiva o finalizada.' });

      const { data: existing } = await supabase.from('bounty_submissions').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();
      if (existing) return res.status(400).json({ success: false, error: 'Ya has enviado una prueba para esta misión.' });

      const { data: newSub, error } = await supabase.from('bounty_submissions').insert([{ task_id: taskId, user_id: targetId, image_url: imageUrl, status: 'pending' }]).select().single();
      if (error) return res.status(400).json({ success: false, error: 'Error de conexión.' });

      // Preparar alerta directa a tu Telegram personal
      const { data: u } = await supabase.from('users').select('username').eq('id', targetId).single();
      const usernameDisplay = u?.username && u.username !== 'Usuario' ? `@${u.username}` : `ID: ${targetId}`;
      const rewardGemas = (Number(task.reward) * 1000).toFixed(2);

      const msg = `🚨 <b>NUEVA PRUEBA VIP RECIBIDA</b>\n\n👤 <b>Soldado:</b> ${usernameDisplay}\n🎯 <b>Misión:</b> ${task.title}\n💰 <b>Pago:</b> ${rewardGemas} Gemas\n\n👇 Revisa la captura en el enlace y decide:`;
      const keyboard = {
        inline_keyboard: [
          [{ text: "🖼️ VER CAPTURA DE PANTALLA", url: imageUrl }],
          [{ text: "✅ APROBAR PAGO", callback_data: `bounty_approve_${newSub.id}` }, { text: "❌ RECHAZAR", callback_data: `bounty_reject_${newSub.id}` }]
        ]
      };

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '8968109534', text: msg, parse_mode: 'HTML', reply_markup: keyboard })
      });

      return res.status(200).json({ success: true });
    }

            if (action === 'admin-create-bounty') {
      const { adminId, title, description_es, description_en, imageBase64, url, reward_gemas, completions_total } = req.body;
      if (String(adminId) !== '8968109534' && String(adminId) !== '8892196101') return res.status(403).json({ success: false, error: 'Comando denegado.' });

      let imageUrl = null;
      if (imageBase64) {
        try {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `bounty_ref_${adminId}_${Date.now()}.png`;
          
          const { error: uploadErr } = await supabase.storage.from('proofs').upload(fileName, buffer, { contentType: 'image/png' });
          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(fileName);
            imageUrl = publicUrlData.publicUrl;
          }
        } catch (e) { console.error("Error subiendo foto de admin:", e); }
      }

      const rewardUsdt = Number(reward_gemas) / 1000;
      const { data: newBounty, error } = await supabase.from('bounty_tasks').insert([{ creator_id: String(adminId), title, description_es, description_en, image_url: imageUrl, url: url, reward: rewardUsdt, completions_total: Number(completions_total) }]).select().single();
      
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, bounty: newBounty });
    }

    // 🔥 NUEVA ACCIÓN: ELIMINAR MISIÓN VIP
    if (action === 'admin-delete-bounty') {
      const { adminId, bountyId } = req.body;
      if (String(adminId) !== '8968109534' && String(adminId) !== '8892196101') return res.status(403).json({ success: false, error: 'Comando denegado.' });
      
      const { error } = await supabase.from('bounty_tasks').delete().eq('id', bountyId);
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.status(200).json({ success: true });
    }



    if (action === 'claim-gigapub-daily') {
      const targetId = String(userId);
      const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

      const { data: lastLog } = await supabase.from('history_logs').select('created_at, description').eq('user_id', targetId).like('description', '%[GigaPubDaily]%').order('created_at', { ascending: false }).limit(1).maybeSingle();

      let currentStreak = 1;
      if (lastLog) {
        const logDate = new Date(lastLog.created_at);
        if (logDate >= startOfToday) return res.status(400).json({ success: false, error: 'Ya reclamaste tu bono hoy. Vuelve a partir de la medianoche (UTC).' });
        else if (logDate >= startOfYesterday) {
          const match = lastLog.description.match(/\[Streak:(\d+)\]/);
          if (match) currentStreak = Math.min(Number(match[1]) + 1, 7); 
        }
      }

      const earnedGemas = currentStreak; 
      const rewardForDb = earnedGemas / 1000;

      const { data: dbUser } = await supabase.from('users').select('balance, total_earnings, referred_by, is_human').eq('id', targetId).single();
      const wasPending = Number(dbUser.total_earnings || 0) < 0.005; 
      const newBalance = Number((Number(dbUser.balance || 0) + rewardForDb).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardForDb).toFixed(4));
      
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `🎁 Bono Diario (Día ${currentStreak})`, description: `Anuncio completado [GigaPubDaily] [Streak:${currentStreak}] | +${earnedGemas.toFixed(2)} Gemas`, amount: rewardForDb }]);

      if (wasPending && newTotal >= 0.005 && dbUser.referred_by && dbUser.is_human) {
         const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
         if (referrer) {
            await supabase.from('users').update({ balance: Number((Number(referrer.balance || 0) + 0.005).toFixed(4)), referral_earnings: Number((Number(referrer.referral_earnings || 0) + 0.005).toFixed(4)), total_earnings: Number((Number(referrer.total_earnings || 0) + 0.005).toFixed(4)) }).eq('id', referrer.id);
            await supabase.from('history_logs').insert([{ user_id: referrer.id, title: '🎯 Recluta Validado', description: `Tu recluta (ID: ${targetId}) se activó. Bono: +5.00 Gemas`, amount: 0.005 }]);
         }
      }
      return res.status(200).json({ success: true, earned_gemas: earnedGemas.toFixed(2), balance: newBalance });
    }

    if (action === 'complete-task') {
      const { taskId, validation_code_input } = req.body; 
      const targetId = String(userId);

      const { data: lastLog } = await supabase.from('history_logs').select('created_at').eq('user_id', targetId).eq('title', '✅ Tarea Completada').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lastLog && (Date.now() - new Date(lastLog.created_at).getTime() < 5000)) { 
        notifyAdmin(`🤖 <b>Alerta Anti-Spam / Bot</b>\nEl usuario <code>${targetId}</code> intentó completar tareas en ráfaga.`);
        return res.status(400).json({ success: false, error: 'Por favor, espera unos segundos entre cada tarea.' });
      }

      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task || task.status !== 'active') return res.status(400).json({ success: false, error: 'Misión inactiva o finalizada.' });
      if (String(task.creator_id) === targetId) return res.status(400).json({ success: false, error: 'Comando denegado: No puedes cobrar tu propia misión.' });
      if (task.validation_code && String(task.validation_code).trim() !== String(validation_code_input || '').trim()) return res.status(400).json({ success: false, error: 'Código de validación incorrecto.' });

      const isDaily = task.type.startsWith('daily_');
      if (isDaily) {
         const startOfToday = new Date(); 
         startOfToday.setUTCHours(0,0,0,0);
         const { data: recentLog } = await supabase.from('history_logs').select('created_at').eq('user_id', targetId).like('description', `%[Daily:${taskId}]%`).order('created_at', { ascending: false }).limit(1).maybeSingle();
         if (recentLog && new Date(recentLog.created_at) >= startOfToday) {
             return res.status(400).json({ success: false, error: 'Misión diaria ya completada. Vuelve mañana a partir del corte UTC.' });
         }
      } else {
         const { data: alreadyDone } = await supabase.from('user_completed_tasks').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();
         if (alreadyDone) return res.status(400).json({ success: false, error: 'Ya has completado esta misión táctica.' });
      }

      if (task.type === 'group' || task.type === 'channel' || task.type === 'partner' || task.type === 'daily_channel') {
        const chatId = extractTelegramUsername(task.url);
        if (chatId) {
          const isJoined = await checkMembership(targetId, chatId);
          if (!isJoined) {
            const isBotStillAdmin = await checkAdminStatus(chatId);
            if (!isBotStillAdmin) { 
              await supabase.from('tasks').update({ status: 'paused' }).eq('id', taskId); 
              return res.status(400).json({ success: false, error: 'Error táctico: El bot ha perdido los privilegios de administrador en esa comunidad. Misión pausada automáticamente.' }); 
            }
            return res.status(400).json({ success: false, error: 'Validación fallida: No detectamos tu membresía en el canal requerido. Únete para reclamar.' });
          }
        } else {
          return res.status(400).json({ success: false, error: 'Enlace de comunidad inválido.' });
        }
      } else if (task.type === 'bot' && task.bot_token) {
        try { 
          const tgCheck = await fetch(`https://api.telegram.org/bot${task.bot_token}/sendChatAction`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ chat_id: targetId, action: 'typing' })
          });
          if (!tgCheck.ok) throw new Error('Bot block');
        } 
        catch (e) { return res.status(400).json({ success: false, error: 'Validación fallida: Debes iniciar el bot externo presionando /start primero.' }); }
      }

      if (!isDaily) await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);

      const rewardAmount = Number(task.reward || 1);
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).single();
      const newBalance = Number((Number(dbUser.balance || 0) + rewardAmount).toFixed(4));
      const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);

      const gemasGanadas = (rewardAmount * 1000).toFixed(2);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: `✅ Tarea Completada`, description: isDaily ? `Check-in: "${task.title}" [Daily:${taskId}] | +${gemasGanadas} Gemas` : `Campaña: "${task.title}" | +${gemasGanadas} Gemas`, amount: rewardAmount }]);

      if (dbUser.referred_by) {
        const totalToReferrer = Number((rewardAmount * 0.10).toFixed(4)) + ((Number(dbUser.total_earnings || 0) < 0.005 && newTotal >= 0.005 && dbUser.is_human) ? 0.005 : 0);
        const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
        if (referrer) {
          await supabase.from('users').update({ balance: Number((Number(referrer.balance || 0) + totalToReferrer).toFixed(4)), referral_earnings: Number((Number(referrer.referral_earnings || 0) + totalToReferrer).toFixed(4)), total_earnings: Number((Number(referrer.total_earnings || 0) + totalToReferrer).toFixed(4)) }).eq('id', referrer.id);
          await supabase.from('history_logs').insert([{ user_id: referrer.id, title: '👥 Comisión', description: `Misión de recluta (ID: ${targetId}) | +${(totalToReferrer * 1000).toFixed(2)} Gemas`, amount: totalToReferrer }]);
        }
      }

      const newDoneCount = Number(task.completions_done || 0) + 1;
      await supabase.from('tasks').update({ completions_done: newDoneCount, current_clicks: Number(task.current_clicks || 0) + 1, status: (newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' }).eq('id', taskId);
      await supabase.rpc('increment_global_clicks').then(({error}) => { if (error) supabase.from('platform_stats').select('total_global_clicks').eq('id', 1).maybeSingle().then(({data}) => { if(data) supabase.from('platform_stats').update({ total_global_clicks: (data.total_global_clicks || 0) + 1 }).eq('id', 1) }) });

      const { data: activeEv } = await supabase.from('events').select('id, event_type, end_date').eq('status', 'active').maybeSingle();
      if (activeEv && activeEv.event_type === 'task_completion') {
        if (Date.now() < new Date(activeEv.end_date).getTime()) {
          const { data: part } = await supabase.from('event_participants').select('score').eq('event_id', activeEv.id).eq('user_id', targetId).maybeSingle();
          if (part) await supabase.from('event_participants').update({ score: part.score + 1 }).eq('event_id', activeEv.id).eq('user_id', targetId);
          else await supabase.from('event_participants').insert([{ event_id: activeEv.id, user_id: targetId, score: 1 }]);
        } else await supabase.from('events').update({ status: 'completed' }).eq('id', activeEv.id);
      }

      return res.status(200).json({ success: true, reward: rewardAmount, balance: newBalance });
    }

    if (action === 'create-task') {
      const { creator_id, type, title, url, bot_token, completions_total, reward, validation_code } = req.body;
      const targetId = String(creator_id || userId);

      if (type === 'bot' && !url.toLowerCase().includes('bot')) {
        return res.status(400).json({ success: false, error: 'Enlace inválido. Las URLs de Bots o Mini Apps deben contener la palabra "bot".' });
      }
      if (type === 'promo' && (!validation_code || String(validation_code).trim() === '')) {
        return res.status(400).json({ success: false, error: 'Las misiones web requieren obligatoriamente un Código de Validación para evitar fraudes.' });
      }
      if (type === 'group' || type === 'channel') {
        const chatId = extractTelegramUsername(url);
        if (!chatId) return res.status(400).json({ success: false, error: 'Formato de enlace de Telegram inválido.' });
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (!adminCheck.isAdmin) return res.status(400).json({ success: false, error: adminCheck.error });
      }

      const count = Number(completions_total || 100); 
      const rew = Number(reward || 0.001); 
      const totalCost = Number((count * rew * 1.30).toFixed(4));

      const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      if (!cUser || Number(cUser.deposit_balance) < totalCost) return res.status(400).json({ success: false, error: 'Bóveda insuficiente.' });
      
      const newVaultBalance = Number((Number(cUser.deposit_balance) - totalCost).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newVaultBalance }).eq('id', targetId);

      const { data: newTask, error } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active', validation_code: validation_code || null, current_clicks: 0, target_clicks: count }]).select().single();
      if (error || !newTask) {
        await supabase.from('users').update({ deposit_balance: newVaultBalance + totalCost }).eq('id', targetId);
        return res.status(400).json({ success: false, error: `Fallo BD.` });
      }

      await supabase.from('history_logs').insert([{ user_id: targetId, title: '🚀 Campaña Activada', description: `Despliegue de "${title}" | -$${totalCost.toFixed(2)} USDT`, amount: -totalCost }]);
      return res.status(200).json({ success: true, task: newTask, deposit_balance: newVaultBalance });
    }

    if (action === 'toggle-task-status') {
      const { taskId, requestingUserId } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('creator_id', String(requestingUserId)).single();
      if (!task) return res.status(400).json({ success: false, error: 'Sin permisos.' });
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      return res.status(200).json({ success: true, status: newStatus });
    }

    if (action === 'delete-task') {
      const { taskId, requestingUserId, isAdminAction } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'No encontrada.' });
      if (task.creator_id !== String(requestingUserId) && !isAdminAction) return res.status(403).json({ success: false, error: 'Sin permisos.' });

      const remainingCompletions = task.completions_total - (task.completions_done || 0);
      if (remainingCompletions > 0) {
        const refundAmount = Number((remainingCompletions * task.reward * 1.30).toFixed(4));
        const { data: user } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).single();
        if (user) {
          await supabase.from('users').update({ deposit_balance: Number((Number(user.deposit_balance) + refundAmount).toFixed(4)) }).eq('id', task.creator_id);
          await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: '💰 Reembolso', description: `Cancelación. +$${refundAmount.toFixed(2)} USDT`, amount: 0 }]);
        }
      }
      await supabase.from('tasks').delete().eq('id', taskId);
      return res.status(200).json({ success: true });
    }

    if (action === 'edit-task') {
      const { taskId, requestingUserId, newTitle, newUrl, addCompletions, newReward, newLogo, isAdminAction } = req.body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return res.status(400).json({ success: false, error: 'No encontrada.' });
      if (task.creator_id !== String(requestingUserId) && !isAdminAction) return res.status(403).json({ success: false, error: 'Sin permisos.' });

      if (task.type === 'bot' && !newUrl.toLowerCase().includes('bot')) {
        return res.status(400).json({ success: false, error: 'Las URLs de Bots o Mini Apps deben contener la palabra "bot".' });
      }

      if ((task.type === 'group' || task.type === 'channel') && newUrl !== task.url) {
        const chatId = extractTelegramUsername(newUrl);
        if (!chatId) return res.status(400).json({ success: false, error: 'Enlace de Telegram inválido.' });
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (!adminCheck.isAdmin) return res.status(400).json({ success: false, error: adminCheck.error });
      }

      const updates = { title: newTitle, url: newUrl };
      if (newLogo !== undefined) updates.logo = newLogo;

      let netCost = 0;
      const remainingCompletions = task.completions_total - (task.completions_done || 0);

      if (newReward && Number(newReward) !== Number(task.reward) && remainingCompletions > 0) {
        netCost += (remainingCompletions * Number(newReward) * 1.30) - (remainingCompletions * task.reward * 1.30);
        updates.reward = Number(newReward);
      }

      if (addCompletions && Number(addCompletions) > 0) {
        netCost += Number(addCompletions) * (updates.reward || task.reward) * 1.30;
        updates.completions_total = task.completions_total + Number(addCompletions);
        updates.status = 'active'; 
      }

      if (netCost !== 0) {
        const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).single();
        if (netCost > 0 && (!cUser || Number(cUser.deposit_balance) < netCost)) return res.status(400).json({ success: false, error: `Bóveda insuficiente.` });
        await supabase.from('users').update({ deposit_balance: Number((Number(cUser.deposit_balance) - netCost).toFixed(4)) }).eq('id', task.creator_id);
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: netCost > 0 ? '🔋 Ajuste' : '💰 Reembolso', description: `Edición táctica`, amount: -netCost }]);
      }

      await supabase.from('tasks').update(updates).eq('id', taskId);
      return res.status(200).json({ success: true });
    }

            // ==========================================
    // 🏦 PAGOS, RETIROS Y BÓVEDA
    // ==========================================
    if (action === 'request-withdrawal') {
      const targetId = String(userId || user?.id);
      const { address, amount } = req.body;
      let withdrawAmount = Number(amount);

      if (!address || withdrawAmount < 0.05) return res.status(400).json({ success: false, error: 'Mínimo: 0.05 USDT.' });

      const todayDate = new Date(); todayDate.setUTCHours(0, 0, 0, 0);
      const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
      const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString());

      if ((refCount || 0) < 3 && (adsCount || 0) < 15) return res.status(400).json({ success: false, error: `Requisito: 3 referidos activos O ver 15 anuncios hoy.` });

      await runRetentionAudit(targetId).catch(e => {});

      let penaltyAmount = 0;
      const { data: recentTasks } = await supabase.from('user_completed_tasks').select('task_id, tasks(type, url, reward)').eq('user_id', targetId).order('created_at', { ascending: false }).limit(5); 
      if (recentTasks) {
        for (const item of recentTasks) {
          if (['group', 'channel', 'partner', 'daily_channel'].includes(item.tasks?.type)) {
            const chatId = extractTelegramUsername(item.tasks.url);
            if (chatId && !(await checkMembership(targetId, chatId))) {
              penaltyAmount += Number(item.tasks.reward || 0);
              await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', targetId);
            }
          }
        }
      }

      const { data: wUser } = await supabase.from('users').select('username, balance, total_earnings').eq('id', targetId).single();
      if (!wUser) return res.status(400).json({ success: false, error: 'Usuario no encontrado.' });

      if (penaltyAmount > 0) {
        const balAfterPenalty = Math.max(0, Number(wUser.balance) - penaltyAmount);
        await supabase.from('users').update({ balance: balAfterPenalty, total_earnings: Math.max(0, Number(wUser.total_earnings) - penaltyAmount) }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '⚠️ Penalidad de Red', description: `Abandono de canales. Sanción: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, amount: -penaltyAmount }]);
        withdrawAmount = withdrawAmount - penaltyAmount;
        if (withdrawAmount < 0.05) return res.status(400).json({ success: false, error: `Se dedujeron gemas por salirte de canales. Saldo insuficiente.` });
        wUser.balance = balAfterPenalty;
      }

      if (Number(wUser.balance) < withdrawAmount) return res.status(400).json({ success: false, error: 'Saldo insuficiente.' });

      const newBalance = Number((Number(wUser.balance) - withdrawAmount).toFixed(4));
      await supabase.from('users').update({ balance: newBalance }).eq('id', targetId);

      const { data: withdrawal, error: withdrawError } = await supabase.from('withdrawals').insert([{ user_id: targetId, wallet_address: address, amount: withdrawAmount, status: withdrawAmount <= 0.9 ? 'processing' : 'pending' }]).select().single();

      if (withdrawError || !withdrawal) {
        await supabase.from('users').update({ balance: newBalance + withdrawAmount }).eq('id', targetId);
        return res.status(400).json({ success: false, error: `Error en BD.` });
      }

      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📤 Retiro Procesando', description: `Destino: ${address.substring(0,8)}... | -${(withdrawAmount * 1000).toFixed(2)} Gemas`, amount: -withdrawAmount }]);

      if (withdrawAmount <= 0.9) {
          try {
              const realTxid = await sendTonAutomated(address, withdrawAmount);
              await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal.id);
              
              const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', targetId).eq('title', '📤 Retiro Procesando').order('created_at', { ascending: false }).limit(1).maybeSingle();
              if (lastLog) await supabase.from('history_logs').update({ title: '✅ Retiro Completado', description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank" style="color:#00f0ff; text-decoration:underline;">Ver Transacción ➔</a>` }).eq('id', lastLog.id);
              
              try {
                const usernameDisplay = wUser?.username && wUser.username !== 'Usuario' ? `@${wUser.username}` : `ID: ${targetId}`;
                
                const resPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
                if (!resPrice.ok) throw new Error("Fallo de conexión con la API de precios.");
                
                const dataPrice = await resPrice.json();
                if (!dataPrice['the-open-network']?.usd) throw new Error("El precio de GRAM no está disponible en este momento.");
                
                const gramPrice = dataPrice['the-open-network'].usd;
                const gramAmount = (withdrawAmount / gramPrice).toFixed(4);
                const canjeGemas = (withdrawAmount * 1000).toFixed(2);

                const message = `💎 <b>PAGO VERIFICADO EXITOSAMENTE</b>\n\n👤 <b>Beneficiario:</b> ${usernameDisplay}\n💸 <b>Monto Total:</b> ${gramAmount} GRAM\n🔄 <b>Canje:</b> ${canjeGemas} Gemas\n🛡️ <b>Red:</b> Toncoin (Ton)\n⚡ <b>Estado:</b> Finalizado / 100%\n\n🔹 <b>TXID:</b>\n<a href="https://tonscan.org/tx/${realTxid}">${realTxid}</a>\n\n🔥 ¡Retiros procesados con total transparencia!`;
                const keyboard = { inline_keyboard: [[{ text: "💰 ¡QUIERO GANAR GRAM AHORA!", url: "https://t.me/TeleGemAds_bot/app", style: "primary" }]] };
                
                const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: '-1002352835078', text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true })
                });

                if (!tgRes.ok) throw new Error("Fallo al enviar notificación a Telegram.");
              } catch (e) { console.error("Operación de notificación cancelada:", e.message); }

              return res.status(200).json({ success: true, balance: newBalance, message: 'Pago enviado a la blockchain.' });
          } catch (err) {
              await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal.id);
              return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en cola manual por red saturada.' });
          }
      } else {
          return res.status(200).json({ success: true, balance: newBalance, message: 'Retiro en revisión administrativa.' });
      }
    }


    if (action === 'generate-usdt-wallet' || action === 'generate-payment-wallet') {
      const { price } = req.body;
      const targetId = String(userId);
      let publicAddress, encryptedKey;

      if (action === 'generate-usdt-wallet') {
        const { ethers } = await import('ethers');
        const randomWallet = ethers.Wallet.createRandom();
        publicAddress = randomWallet.address;
        encryptedKey = (await import('../utils/security.js')).encryptText(randomWallet.privateKey);
      } else {
        const { mnemonicNew, mnemonicToPrivateKey, WalletContractV4 } = await import('../utils/blockchain.js');
        const mnemonics = await mnemonicNew(); 
        const keyPair = await mnemonicToPrivateKey(mnemonics);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
        encryptedKey = (await import('../utils/security.js')).encryptText(mnemonics.join(" "));
      }

      const { data: newIntent } = await supabase.from('payment_intents').insert([{ user_id: targetId, expected_amount: Number(price), public_wallet: publicAddress, encrypted_private_key: encryptedKey, status: 'pending' }]).select().single();
      return res.status(200).json({ success: true, wallet: publicAddress, intentId: newIntent.id });
    }

    if (action === 'verify-usdt-payment' || action === 'verify-crypto-payment') {
      const { intentId, clicks } = req.body; 
      const targetId = String(userId);
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return res.status(400).json({ success: false, error: 'No procesado.' });

      if (action === 'verify-usdt-payment') {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC || "https://bsc-dataseed.binance.org/");
        const usdtContract = new ethers.Contract("0x55d398326f99059fF775485246999027B3197955", ["function balanceOf(address owner) view returns (uint256)"], provider);
        const balanceWei = await usdtContract.balanceOf(intent.public_wallet);
        if (Number(ethers.formatUnits(balanceWei, 18)) < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo insuficiente en blockchain.` });
        sweepUsdtAutomated(getDerivedUsdtWallet(targetId), balanceWei).catch(e => {});
      } else {
        const { tonClient, mnemonicToPrivateKey, WalletContractV4, internal } = await import('../utils/blockchain.js');
        const balanceNano = await tonClient.getBalance(intent.public_wallet);
        if (Number(balanceNano) / 1e9 < intent.expected_amount) return res.status(400).json({ success: false, error: `Saldo insuficiente.` });
        
        try {
          const { decryptText } = await import('../utils/security.js');
          const secretWords = decryptText(intent.encrypted_private_key);
          const keyPair = await mnemonicToPrivateKey(secretWords.split(" "));
          const contract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
          const seqno = await contract.getSeqno();
          await contract.sendTransfer({ seqno: seqno || 0, secretKey: keyPair.secretKey, messages: [ internal({ to: "UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk", value: 0n, bounce: false, body: "Barrido" }) ], sendMode: 128 });
        } catch (e) {}
      }

      const { data: dbUser } = await supabase.from('users').select('username, deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📥 Recarga de Bóveda', description: `Acreditado: $${Number(clicks).toFixed(2)} USDT.`, amount: 0 }]);
      
      try {
        const usernameDisplay = dbUser?.username && dbUser.username !== 'Usuario' ? `@${dbUser.username}` : `ID: ${targetId}`;
        const cryptoType = action === 'verify-usdt-payment' ? 'USDT (BEP20)' : 'GRAM (TON)';

        const message = `🚀 <b>NUEVA INYECCIÓN DE LIQUIDEZ TÁCTICA</b>\n\n` +
                        `👤 <b>Anunciante:</b> ${usernameDisplay}\n` +
                        `💰 <b>Suministro:</b> $${Number(clicks).toFixed(2)} USDT\n` +
                        `🛡️ <b>Blockchain:</b> ${cryptoType}\n` +
                        `⚡ <b>Estado:</b> Bóveda Cargada y Operativa\n\n` +
                        `🔥 ¡La red publicitaria se expande! ¿Listo para dominar Telegram con tus propias campañas?`;

                const keyboard = { inline_keyboard: [[{ text: "🚀 ¡LANZAR MI CAMPAÑA AHORA!", url: "https://t.me/TeleGemAds_bot/app", style: "primary" }]] };
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: '-1002352835078', text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true })
        });
      } catch (errLog) {
        console.error("Error al enviar mensaje de depósito al canal:", errLog);
      }

      return res.status(200).json({ success: true, deposit_balance: newDepositBalance });
    }

    // ==========================================
    // ⚙️ PANEL DE COMANDO (ADMIN)
    // ==========================================
    if (action.startsWith('admin-')) {
      const adminId = req.body.adminId;
      if (!ADMIN_IDS.includes(String(adminId))) return res.status(403).json({ success: false });

      if (action === 'admin-create-event') {
        const { title, event_type, start_date, end_date, prizes } = req.body;
        const { data } = await supabase.from('events').insert([{ title, event_type, status: 'active', start_date, end_date, prizes: prizes || [] }]).select().single();
        return res.status(200).json({ success: true, event: data });
      }
      
      if (action === 'admin-manage-event') {
        if (req.body.newStatus === 'deleted') await supabase.from('events').delete().eq('id', req.body.eventId);
        else await supabase.from('events').update({ status: 'completed' }).eq('id', req.body.eventId);
        return res.status(200).json({ success: true });
      }
      
      if (action === 'admin-create-master-task') {
        const { title, url, type, reward } = req.body;
        
        if (type === 'partner' || type === 'daily_channel') {
           const chatId = extractTelegramUsername(url);
           if (!chatId) return res.status(400).json({ success: false, error: 'Enlace de Telegram inválido.' });
           const adminCheck = await checkAdminStatusDetailed(chatId);
           if (!adminCheck.isAdmin) return res.status(400).json({ success: false, error: adminCheck.error });
        }

        const { data, error } = await supabase.from('tasks').insert([{
          creator_id: adminId, title, url, type, reward: Number(reward), 
          completions_total: 9999999, completions_done: 0, total_cost: 0, 
          status: 'active', current_clicks: 0, target_clicks: 9999999
        }]).select().single();

        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.status(200).json({ success: true, task: data });
      }

      if (action === 'admin-get-past-events') {
        const { data: allEvents } = await supabase.from('events').select('*').order('end_date', { ascending: false });
        const pastEvents = (allEvents || []).filter(ev => ev.status === 'completed' || (ev.status === 'active' && new Date(ev.end_date).getTime() <= Date.now())).slice(0, 10);
        const eventsWithWinners = [];
        for (const ev of pastEvents) {
          const { data: participants } = await supabase.from('event_participants').select('user_id, score').eq('event_id', ev.id).order('score', { ascending: false }).limit(3);
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

      if (action === 'admin-get-config') {
        const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
        return res.status(200).json({ success: true, config: data || { master_wallet_gram: '', master_wallet_usdt_bep20: '' } });
      }

      if (action === 'admin-update-config') {
        await supabase.from('system_settings').upsert({ id: 1, master_wallet_gram: req.body.config.master_wallet_gram, master_wallet_usdt_bep20: req.body.config.master_wallet_usdt_bep20 });
        return res.status(200).json({ success: true });
      }

      if (action === 'admin-get-all-tasks') {
        const { data: allTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        return res.status(200).json({ success: true, tasks: allTasks || [] });
      }

      if (action === 'admin-send-sorteo') {
        const usdtAmount = Number(req.body.amount) / 1000;
        const { data: user } = await supabase.from('users').select('balance, total_earnings').eq('id', String(req.body.targetId)).single();
        await supabase.from('users').update({ balance: Number((Number(user.balance) + usdtAmount).toFixed(4)), total_earnings: Number((Number(user.total_earnings) + usdtAmount).toFixed(4)) }).eq('id', String(req.body.targetId));
        await supabase.from('history_logs').insert([{ user_id: String(req.body.targetId), title: '🎁 Premio de Comando', description: `Acreditación manual | +${Number(req.body.amount).toFixed(2)} Gemas`, amount: usdtAmount }]);
        return res.status(200).json({ success: true });
      }

      if (action === 'admin-stats') {
        const { data: usersData } = await supabase.from('users').select('id');
        const { data: tasksData } = await supabase.from('tasks').select('id');
        return res.status(200).json({ success: true, stats: { users: usersData?.length || 0, tasks: tasksData?.length || 0 } });
      }

      if (action === 'admin-search-user') {
        const { data: foundUser } = await supabase.from('users').select('*').eq('id', String(req.body.targetId)).maybeSingle();
        return res.status(200).json({ success: !!foundUser, user: foundUser });
      }

      if (action === 'admin-update-user') {
        await supabase.from('users').update(req.body.update).eq('id', String(req.body.targetId));
        return res.status(200).json({ success: true });
      }

      if (action === 'admin-get-withdrawals') {
        const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        return res.status(200).json({ success: true, withdrawals: withdrawals || [] });
      }
      
            if (action === 'admin-approve-withdrawal') {
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', req.body.withdrawalId).single();
        if (withdrawal.status === 'completed') return res.status(400).json({ success: false, error: 'Ya pagado.' });
        try {
          const realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
          await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', req.body.withdrawalId);
          
          const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).eq('title', '📤 Retiro Procesando').order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (lastLog) await supabase.from('history_logs').update({ title: '✅ Retiro Completado', description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank">Ver TX</a>` }).eq('id', lastLog.id);
          
          // 🔥 NUEVO: Notificación al canal de pagos (Retiro Manual) igual al automático
          try {
            const { data: wUser } = await supabase.from('users').select('username').eq('id', withdrawal.user_id).single();
            const usernameDisplay = wUser?.username && wUser.username !== 'Usuario' ? `@${wUser.username}` : `ID: ${withdrawal.user_id}`;
            const withdrawAmount = Number(withdrawal.amount);
            
            const resPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
            if (!resPrice.ok) throw new Error("Fallo de conexión con la API de precios.");
            
            const dataPrice = await resPrice.json();
            if (!dataPrice['the-open-network']?.usd) throw new Error("El precio de GRAM no está disponible en este momento.");
            
            const gramPrice = dataPrice['the-open-network'].usd;
            const gramAmount = (withdrawAmount / gramPrice).toFixed(4);
            const canjeGemas = (withdrawAmount * 1000).toFixed(2);

            const message = `💎 <b>PAGO VERIFICADO EXITOSAMENTE</b>\n\n👤 <b>Beneficiario:</b> ${usernameDisplay}\n💸 <b>Monto Total:</b> ${gramAmount} GRAM\n🔄 <b>Canje:</b> ${canjeGemas} Gemas\n🛡️ <b>Red:</b> Toncoin (Ton)\n⚡ <b>Estado:</b> Finalizado / 100%\n\n🔹 <b>TXID:</b>\n<a href="https://tonscan.org/tx/${realTxid}">${realTxid}</a>\n\n🔥 ¡Retiros procesados con total transparencia!`;
            const keyboard = { inline_keyboard: [[{ text: "💰 ¡QUIERO GANAR GRAM AHORA!", url: "https://t.me/TeleGemAds_bot/app", style: "primary" }]] };
            
            const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: '-1002352835078', text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true })
            });

            if (!tgRes.ok) throw new Error("Fallo al enviar notificación a Telegram.");
          } catch (e) { console.error("Error al notificar retiro manual:", e.message); }

          return res.status(200).json({ success: true });
        } catch (error) { return res.status(400).json({ success: false, error: 'Fallo en blockchain.' }); }
      }

      if (action === 'admin-reject-withdrawal') {
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', req.body.withdrawalId).single();
        const { data: userToRefund } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
        await supabase.from('users').update({ balance: Number((Number(userToRefund.balance) + Number(withdrawal.amount)).toFixed(4)) }).eq('id', withdrawal.user_id);
        await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', req.body.withdrawalId);
        
        const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).eq('title', '📤 Retiro Procesando').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastLog) await supabase.from('history_logs').update({ title: '❌ Retiro Rechazado', description: req.body.reason ? `Reembolso. Motivo: ${req.body.reason}` : `Fondos devueltos.`, amount: Number(withdrawal.amount) }).eq('id', lastLog.id);
        return res.status(200).json({ success: true });
      }
    }

    // ==========================================
    // 🔍 ACCIONES SECUNDARIAS
    // ==========================================
    if (action === 'verify-admin') {
      const chatId = extractTelegramUsername(req.body.url);
      if (!chatId) return res.status(400).json({ success: false, error: 'Enlace inválido.' });
      const adminCheck = await checkAdminStatusDetailed(chatId);
      if (adminCheck.isAdmin) return res.status(200).json({ success: true });
      return res.status(400).json({ success: false, error: adminCheck.error });
    }

    if (action === 'get-history') {
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', String(userId)).order('created_at', { ascending: false }); 
      return res.status(200).json({ success: true, history: history || [] });
    }

    if (action === 'get-referrals') {
      let { data: lv1 } = await supabase.from('users').select('*').eq('referred_by', String(userId));
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', String(userId)).maybeSingle();
      return res.status(200).json({ success: true, referrals: lv1 || [], earnings: dbUser?.referral_earnings || 0 });
    }

    if (action === 'get-withdrawal-reqs') {
      const todayStr = new Date(); todayStr.setUTCHours(0, 0, 0, 0);
      const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', String(userId)).gte('total_earnings', 0.005);
      const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', String(userId)).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString());
      return res.status(200).json({ success: true, referrals: refCount || 0, ads: adsCount || 0 });
    }

    if (action === 'watch-ad-progress') {
      const targetId = String(userId);
      const { data: dbUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).single();
      await supabase.from('users').update({ balance: Number((Number(dbUser.balance || 0) + 0.0005).toFixed(4)), total_earnings: Number((Number(dbUser.total_earnings || 0) + 0.0005).toFixed(4)) }).eq('id', targetId);
      await supabase.from('history_logs').insert([{ user_id: targetId, title: '📺 Anuncio Visto', description: `Visualización para retiro [AdView] | +0.50 Gemas`, amount: 0.0005 }]);
      return res.status(200).json({ success: true, balance: Number((Number(dbUser.balance || 0) + 0.0005).toFixed(4)) });
    }

    return res.status(400).json({ success: false, error: `Acción desconocida: ${action}` });

  } catch (error) { 
    console.error("CRITICAL BACKEND ERROR 500:", error);
    return res.status(500).json({ success: false, error: `Error en servidor: ${error.message || String(error)}` }); 
  }
}
