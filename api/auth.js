import { supabase } from '../utils/supabase.js';
import { notifyAdmin, checkMembership, extractTelegramUsername, notifyUser, ADMIN_IDS } from '../utils/telegram.js';

const startOfTodayUTC = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

export async function handleAuthAndUserActions(action, targetId, targetUser, deviceId, clientIp, start_param, turnstileToken) {
    if (action === 'verify' || action === 'verify-channels') {
        
        const { data: config } = await supabase.from('system_settings').select('mandatory_channel_1, mandatory_channel_2').eq('id', 1).maybeSingle();
        let c1_joined = true;
        let c2_joined = true;
        let c1_url = config?.mandatory_channel_1 || '';
        let c2_url = config?.mandatory_channel_2 || '';

        if (c1_url) {
            const u1 = extractTelegramUsername(c1_url);
            if (u1) c1_joined = await checkMembership(targetId, u1);
        }
        if (c2_url) {
            const u2 = extractTelegramUsername(c2_url);
            if (u2) c2_joined = await checkMembership(targetId, u2);
        }

        if (action === 'verify-channels') {
            return { status: 200, body: { success: true, allJoined: (c1_joined && c2_joined), channel1: c1_joined, channel2: c2_joined, c1_url, c2_url } };
        }

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

        // 🔥 BLINDAJE: Los administradores (ADMIN_IDS) ahora están centralizados en utils/telegram.js
        if (firstDeviceOwner && String(firstDeviceOwner.id) !== targetId && !ADMIN_IDS.includes(String(targetId))) {
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
        
        return { 
            status: 200, 
            body: { 
                success: true, 
                user: dbUser, 
                stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) },
                mandatory: { c1_url, c2_url, c1_joined, c2_joined, all_joined: (c1_joined && c2_joined) } 
            } 
        };
    }

    if (action === 'claim-gigapub-daily') {
        // 🔥 BLINDAJE: Delegamos el cobro del check-in a una función atómica (RPC)
        // Esto previene que un usuario con mala conexión haga doble clic y cobre dos veces.
        const { data: result, error: rpcError } = await supabase.rpc('claim_daily_checkin', { 
            p_user_id: targetId,
            p_date_start: startOfTodayUTC()
        });

        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD: ${rpcError.message}` } };
        if (!result || result.ok !== true) {
            return { status: 400, body: { success: false, error: result?.error || 'No se pudo reclamar el bono.' } };
        }
        
        return { status: 200, body: { success: true, earned_gemas: (result.earned * 1000).toFixed(2), balance: result.balance } };
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
            
            // Revertimos pago de forma segura sin race conditions
            const { data: pUser } = await supabase.from('users').select('balance, total_earnings').eq('id', userId).single();
            if (pUser) {
              const newBal = Math.max(0, Number(pUser.balance) - penaltyAmount);
              const { data: updated } = await supabase.from('users').update({ balance: newBal, total_earnings: Math.max(0, Number(pUser.total_earnings) - penaltyAmount) }).eq('id', userId).eq('balance', pUser.balance).select('id');
              
              if (updated && updated.length > 0) {
                 await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', userId);
                 await supabase.from('history_logs').insert([{ user_id: userId, title: '⚠️ Penalidad de Permanencia', description: `Sanción por abandono prematuro: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, amount: -penaltyAmount }]);
                 await notifyUser(userId, `⚠️ <b>PENALIZACIÓN</b>\nSaliste de ${t.title} antes de 24h. Gemas deducidas.`);
              }
            }
        }
      }
    }
  } catch (error) {}
}
