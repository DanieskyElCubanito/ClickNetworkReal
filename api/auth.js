import { supabase } from '../utils/supabase.js';
import { notifyAdmin } from '../utils/telegram.js';

export async function handleAuthAndUserActions(action, targetId, targetUser, deviceId, clientIp, start_param) {
    if (action === 'verify') {
        runRetentionAudit(targetId).catch(() => {});

        let { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
        if (dbError) throw new Error("Error en Supabase: " + dbError.message);
        
        if (dbUser && dbUser.is_banned) return { status: 403, body: { success: false, error: 'Cuenta suspendida.' } };

        const { data: firstDeviceOwner } = await supabase.from('users').select('id').eq('device_id', deviceId).order('created_at', { ascending: true }).limit(1).maybeSingle();
        const IMMUNE_IDS = ['8968109534', '8892196101'];

        if (firstDeviceOwner && String(firstDeviceOwner.id) !== targetId && !IMMUNE_IDS.includes(targetId)) {
            notifyAdmin(`🚨 <b>BLOQUEO DE MULTICUENTA (DEVICE)</b>\nEl usuario <code>${targetId}</code> intentó entrar a un dispositivo cuyo dueño original es <code>${firstDeviceOwner.id}</code>.`);
            return { status: 403, body: { success: false, error: 'Acceso bloqueado: Dispositivo vinculado a otra cuenta.' } };
        }

        if (!dbUser) {
            const newUserObj = { 
                id: targetId, username: targetUser.username, balance: 0, deposit_balance: 0, 
                total_earnings: 0, referral_earnings: 0, is_human: true, 
                device_id: deviceId, last_ip: clientIp, referral_reward_granted: true 
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
        return { status: 200, body: { success: true, earned_gemas: earnedGemas.toFixed(2), balance: newBalance } };
    }

    return null; // Acción no manejada por este archivo
}

async function runRetentionAudit(userId) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTasks } = await supabase.from('user_completed_tasks').select('task_id, tasks!inner(type, url, reward)').eq('user_id', userId).gte('created_at', yesterday);
    // (Lógica simplificada de retención. Si falla, el usuario no retiene la gema)
    if (recentTasks) {
       for (const item of recentTasks) {
          const t = item.tasks;
          if (t && ['group', 'channel'].includes(t.type)) {
             // Auditoría asíncrona de bots
          }
       }
    }
}
