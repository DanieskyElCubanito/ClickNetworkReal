import { supabase } from '../utils/supabase.js';
import { sendTonAutomated } from '../utils/blockchain.js';
import { extractTelegramUsername, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

export async function handleAdminActions(action, targetId, reqBody) {
    if (action === 'verify-admin') {
      const chatId = extractTelegramUsername(reqBody.url);
      if (!chatId) return { status: 400, body: { success: false, error: 'Enlace inválido.' } };
      const adminCheck = await checkAdminStatusDetailed(chatId);
      if (adminCheck.isAdmin) return { status: 200, body: { success: true } };
      return { status: 400, body: { success: false, error: adminCheck.error } };
    }

    if (!action.startsWith('admin-')) return null;

    const adminId = reqBody.adminId;
    if (!ADMIN_IDS.includes(String(adminId))) return { status: 403, body: { success: false, error: 'Comando denegado.' } };

    if (action === 'admin-get-all-tasks') {
        const { data: allTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        return { status: 200, body: { success: true, tasks: allTasks || [] } };
    }

    if (action === 'admin-stats') {
        const { data: usersData } = await supabase.from('users').select('id');
        const { data: tasksData } = await supabase.from('tasks').select('id');
        return { status: 200, body: { success: true, stats: { users: usersData?.length || 0, tasks: tasksData?.length || 0 } } };
    }

    if (action === 'admin-search-user') {
        const { data: foundUser } = await supabase.from('users').select('*').eq('id', String(reqBody.targetId)).maybeSingle();
        return { status: 200, body: { success: !!foundUser, user: foundUser } };
    }

    if (action === 'admin-update-user') {
        await supabase.from('users').update(reqBody.update).eq('id', String(reqBody.targetId));
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-send-sorteo') {
        const usdtAmount = Number(reqBody.amount) / 1000;
        const { data: user } = await supabase.from('users').select('balance, total_earnings').eq('id', String(reqBody.targetId)).single();
        await supabase.from('users').update({ balance: Number((Number(user.balance) + usdtAmount).toFixed(4)), total_earnings: Number((Number(user.total_earnings) + usdtAmount).toFixed(4)) }).eq('id', String(reqBody.targetId));
        await supabase.from('history_logs').insert([{ user_id: String(reqBody.targetId), title: '🎁 Premio de Comando', description: `Acreditación manual | +${Number(reqBody.amount).toFixed(2)} Gemas`, amount: usdtAmount }]);
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-create-event') {
        const { title, event_type, start_date, end_date, prizes } = reqBody;
        const { data } = await supabase.from('events').insert([{ title, event_type, status: 'active', start_date, end_date, prizes: prizes || [] }]).select().single();
        return { status: 200, body: { success: true, event: data } };
    }
    
    if (action === 'admin-manage-event') {
        if (reqBody.newStatus === 'deleted') await supabase.from('events').delete().eq('id', reqBody.eventId);
        else await supabase.from('events').update({ status: 'completed' }).eq('id', reqBody.eventId);
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-get-past-events') {
        const { data: allEventsData } = await supabase.from('events').select('*').order('end_date', { ascending: false });
        const pastEventsData = (allEventsData || []).filter(ev => ev.status === 'completed' || (ev.status === 'active' && new Date(ev.end_date).getTime() <= Date.now())).slice(0, 10);
        const eventsWithWinners = [];
        for (const ev of pastEventsData) {
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
        return { status: 200, body: { success: true, pastEvents: eventsWithWinners } };
    }

    if (action === 'admin-get-withdrawals') {
        const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        return { status: 200, body: { success: true, withdrawals: withdrawals || [] } };
    }

    if (action === 'admin-approve-withdrawal') {
        const { withdrawalId } = reqBody;
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
        if (withdrawal.status === 'completed') return { status: 400, body: { success: false, error: 'Ya pagado.' } };
        
        try {
            const realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
            await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
            const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).like('title', '%Retiro%').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lastLog) await supabase.from('history_logs').update({ title: '✅ Retiro Completado', description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank">Ver TX</a>` }).eq('id', lastLog.id);
            return { status: 200, body: { success: true } };
        } catch (error) { 
            return { status: 400, body: { success: false, error: 'Fallo en blockchain.' } }; 
        }
    }

    if (action === 'admin-reject-withdrawal') {
        const { withdrawalId, reason } = reqBody;
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
        const { data: userToRefund } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
        
        await supabase.from('users').update({ balance: Number((Number(userToRefund.balance) + Number(withdrawal.amount)).toFixed(4)) }).eq('id', withdrawal.user_id);
        await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
        
        const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).like('title', '%Retiro%').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastLog) await supabase.from('history_logs').update({ title: '❌ Retiro Rechazado', description: reason ? `Reembolso. Motivo: ${reason}` : `Fondos devueltos.`, amount: Number(withdrawal.amount) }).eq('id', lastLog.id);
        return { status: 200, body: { success: true } };
    }

    // 🔥 ACTUALIZADO: Envía la info de los canales al Panel
    if (action === 'admin-get-config') {
        const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
        return { status: 200, body: { success: true, config: data || { master_wallet_gram: '', master_wallet_usdt_bep20: '', min_withdrawal: 0.05, ref_percent: 10, ref_bonus_gemas: 5, mandatory_channel_1: '', mandatory_channel_2: '' } } };
    }

    // 🔥 ACTUALIZADO: Guarda la info de los canales en la base de datos
    if (action === 'admin-update-config') {
        const { error } = await supabase.from('system_settings').upsert({ 
            id: 1, 
            master_wallet_gram: reqBody.config.master_wallet_gram, 
            master_wallet_usdt_bep20: reqBody.config.master_wallet_usdt_bep20,
            min_withdrawal: reqBody.config.min_withdrawal,
            ref_percent: reqBody.config.ref_percent,
            ref_bonus_gemas: reqBody.config.ref_bonus_gemas,
            mandatory_channel_1: reqBody.config.mandatory_channel_1,
            mandatory_channel_2: reqBody.config.mandatory_channel_2
        });
        if (error) return { status: 400, body: { success: false, error: `Fallo al guardar en BD: ${error.message}` } };
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-create-master-task') {
        const { title, url, type, reward } = reqBody;
        if (type === 'partner' || type === 'daily_channel') {
            const chatId = extractTelegramUsername(url);
            if (!chatId) return { status: 400, body: { success: false, error: 'Enlace inválido.' } };
            const adminCheck = await checkAdminStatusDetailed(chatId);
            if (!adminCheck.isAdmin) return { status: 400, body: { success: false, error: adminCheck.error } };
        }
        const { data, error } = await supabase.from('tasks').insert([{ creator_id: adminId, title, url, type, reward: Number(reward), completions_total: 9999999, completions_done: 0, total_cost: 0, status: 'active', current_clicks: 0, target_clicks: 9999999 }]).select().single();
        if (error) return { status: 400, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true, task: data } };
    }

    return { status: 400, body: { success: false, error: `Acción admin no reconocida: ${action}` } };
}
