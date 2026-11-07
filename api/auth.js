import { supabase } from '../utils/supabase.js';
import { notifyAdmin, checkMembership, extractTelegramUsername, notifyUser } from '../utils/telegram.js';

export async function handleAuthAndUserActions(action, targetId, targetUser, deviceId, clientIp, start_param, turnstileToken) {
    if (action === 'verify') {
        if (process.env.TURNSTILE_SECRET_KEY) {
            if (!turnstileToken) return { status: 403, body: { success: false, error: 'Captcha requerido. Actualiza la app.' } };
            const cfForm = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: clientIp });
            const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: cfForm });
            const cfData = await cfRes.json();
            if (!cfData.success) return { status: 403, body: { success: false, error: 'Bot detectado por Cloudflare.' } };
        }

        if (!deviceId || deviceId === 'unknown_device') return { status: 403, body: { success: false, error: 'Dispositivo no verificado.' } };

        runRetentionAudit(targetId).catch(() => {});

        let { data: dbUser } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
        if (dbUser && dbUser.is_banned) return { status: 403, body: { success: false, error: 'Cuenta suspendida.' } };

        const { data: firstDeviceOwner } = await supabase.from('users').select('id').eq('device_id', deviceId).order('created_at', { ascending: true }).limit(1).maybeSingle();
        const IMMUNE_IDS = ['8968109534', '8892196101'];

        if (firstDeviceOwner && String(firstDeviceOwner.id) !== targetId && !IMMUNE_IDS.includes(targetId)) {
            notifyAdmin(`🚨 <b>BLOQUEO DE MULTICUENTA</b>\nEl usuario <code>${targetId}</code> intentó entrar al dispositivo de <code>${firstDeviceOwner.id}</code>.`);
            return { status: 403, body: { success: false, error: 'Acceso bloqueado: Dispositivo vinculado a otra cuenta.' } };
        }

        if (!dbUser) {
            const newUserObj = { 
                id: targetId, username: targetUser.username, balance: 0, deposit_balance: 0, 
                total_earnings: 0, referral_earnings: 0, is_human: true, device_id: deviceId, last_ip: clientIp 
            };
            if (start_param && String(start_param) !== targetId) {
                const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
                if (inviter) newUserObj.referred_by = String(start_param);
            }
            const { data: newUser } = await supabase.from('users').insert([newUserObj]).select().single();
            dbUser = newUser;
        } else {
            await supabase.from('users').update({ device_id: deviceId, last_ip: clientIp, username: targetUser.username }).eq('id', targetId);
        }

        const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', targetId);
        return { status: 200, body: { success: true, user: dbUser, stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) } } };
    }

    if (action === 'claim-gigapub-daily') {
        const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
        const { data: lastLog } = await supabase.from('history_logs').select('created_at, description').eq('user_id', targetId).like('description', '%[GigaPubDaily]%').order('created_at', { ascending: false }).limit(1).maybeSingle();

        let currentStreak = 1;
        if (lastLog) {
            const logDate = new Date(lastLog.created_at);
            if (logDate >= startOfToday) return { status: 400, body: { success: false, error: 'Ya reclamaste hoy. Vuelve a partir de la medianoche (UTC).' } };
            else if (logDate >= startOfYesterday) {
                const match = lastLog.description.match(/\[Streak:(\d+)\]/);
                if (match) currentStreak = Math.min(Number(match[1]) + 1, 7); 
            }
        }

        const earnedGemas = currentStreak; 
        const rewardForDb = earnedGemas / 1000;
        const { data: dbUser } = await supabase.from('users').select('balance, total_earnings, referred_by, is_human').eq('id', targetId).single();
        const newBalance = Number((Number(dbUser.balance || 0) + rewardForDb).toFixed(4));
        const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardForDb).toFixed(4));
        
        await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: `🎁 Bono Diario (Día ${currentStreak})`, description: `Anuncio completado [GigaPubDaily] [Streak:${currentStreak}] | +${earnedGemas.toFixed(2)} Gemas`, amount: rewardForDb }]);
        
        if (Number(dbUser.total_earnings || 0) < 0.005 && newTotal >= 0.005 && dbUser.referred_by) {
            const { data: referrer } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
            if (referrer) {
                await supabase.from('users').update({ balance: Number((Number(referrer.balance || 0) + 0.005).toFixed(4)), referral_earnings: Number((Number(referrer.referral_earnings || 0) + 0.005).toFixed(4)), total_earnings: Number((Number(referrer.total_earnings || 0) + 0.005).toFixed(4)) }).eq('id', referrer.id);
                await supabase.from('history_logs').insert([{ user_id: referrer.id, title: '🎯 Recluta Validado', description: `Tu recluta se activó. Bono: +5.00 Gemas`, amount: 0.005 }]);
            }
        }
        return { status: 200, body: { success: true, earned_gemas: earnedGemas.toFixed(2), balance: newBalance } };
    }

    return null; 
}

async function runRetentionAudit(userId) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTasks } = await supabase.from('user_completed_tasks').select('task_id, created_at, tasks!inner(type, url, reward, title)').eq('user_id', userId).gte('created_at', yesterday);
    if (!recentTasks || recentTasks.length === 0) return;

    for (const item of recentTasks) {
      const t = item.tasks;
      if (t && (t.type === 'group' || t.type === 'channel' || t.type === 'partner' || t.type === 'daily_channel')) {
        const chatId = extractTelegramUsername(t.url);
        if (chatId && !(await checkMembership(userId, chatId))) {
            const penaltyAmount = Number(t.reward || 0);
            const { data: pUser } = await supabase.from('users').select('balance, total_earnings').eq('id', userId).single();
            if (pUser) {
              const newBal = Math.max(0, Number(pUser.balance) - penaltyAmount);
              await supabase.from('users').update({ balance: newBal, total_earnings: Math.max(0, Number(pUser.total_earnings) - penaltyAmount) }).eq('id', userId);
              await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', userId);
              await supabase.from('history_logs').insert([{ user_id: userId, title: '⚠️ Penalidad de Permanencia', description: `Sanción por abandono prematuro: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, amount: -penaltyAmount }]);
              await notifyUser(userId, `⚠️ <b>PENALIZACIÓN</b>\nSaliste de ${t.title} antes de 24h. Gemas deducidas.`);
            }
        }
      }
    }
  } catch (error) {}
}
