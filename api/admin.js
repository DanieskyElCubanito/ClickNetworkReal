import { supabase } from '../utils/supabase.js';
import { sendTonAutomated } from '../utils/blockchain.js';
import { extractTelegramUsername, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

export async function handleAdminActions(action, targetId, reqBody) {
    // 🔍 Acción especial: Verificar si el bot es admin en un canal (Usado al crear tareas)
    if (action === 'verify-admin') {
      const chatId = extractTelegramUsername(reqBody.url);
      if (!chatId) return { status: 400, body: { success: false, error: 'Enlace inválido.' } };
      const adminCheck = await checkAdminStatusDetailed(chatId);
      if (adminCheck.isAdmin) return { status: 200, body: { success: true } };
      return { status: 400, body: { success: false, error: adminCheck.error } };
    }

    if (!action.startsWith('admin-')) return null;

    const adminId = reqBody.adminId;
    if (!ADMIN_IDS.includes(String(adminId))) {
        return { status: 403, body: { success: false, error: 'Comando denegado.' } };
    }

    // 🔥 RESTAURADO: Auditoría Global de Misiones
    if (action === 'admin-get-all-tasks') {
        const { data: allTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        return { status: 200, body: { success: true, tasks: allTasks || [] } };
    }

    // 🔥 RESTAURADO: Estadísticas Globales del Panel
    if (action === 'admin-stats') {
        const { data: usersData } = await supabase.from('users').select('id');
        const { data: tasksData } = await supabase.from('tasks').select('id');
        return { status: 200, body: { success: true, stats: { users: usersData?.length || 0, tasks: tasksData?.length || 0 } } };
    }

    // 🔥 RESTAURADO: Búsqueda y Edición de Usuarios
    if (action === 'admin-search-user') {
        const { data: foundUser } = await supabase.from('users').select('*').eq('id', String(reqBody.targetId)).maybeSingle();
        return { status: 200, body: { success: !!foundUser, user: foundUser } };
    }

    if (action === 'admin-update-user') {
        await supabase.from('users').update(reqBody.update).eq('id', String(reqBody.targetId));
        return { status: 200, body: { success: true } };
    }

    // 🔥 RESTAURADO: Enviar Premio Directo (Sorteo)
    if (action === 'admin-send-sorteo') {
        const usdtAmount = Number(reqBody.amount) / 1000;
        const { data: user } = await supabase.from('users').select('balance, total_earnings').eq('id', String(reqBody.targetId)).single();
        await supabase.from('users').update({ balance: Number((Number(user.balance) + usdtAmount).toFixed(4)), total_earnings: Number((Number(user.total_earnings) + usdtAmount).toFixed(4)) }).eq('id', String(reqBody.targetId));
        await supabase.from('history_logs').insert([{ user_id: String(reqBody.targetId), title: '🎁 Premio de Comando', description: `Acreditación manual | +${Number(reqBody.amount).toFixed(2)} Gemas`, amount: usdtAmount }]);
        return { status: 200, body: { success: true } };
    }

    // 🔥 RESTAURADO: Gestión de Eventos/Torneos
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

    // 🏦 PAGOS Y BÓVEDA
    if (action === 'admin-get-withdrawals') {
        const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        return { status: 200, body: { success: true, withdrawals: withdrawals || [] } };
    }

    if (action === 'admin-approve-withdrawal') {
        const { withdrawalId } = reqBody;
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
        
        if (withdrawal.status === 'completed') {
            return { status: 400, body: { success: false, error: 'Ya pagado.' } };
        }
        
        try {
            const realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
            await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
            
            const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).like('title', '%Retiro%').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lastLog) await supabase.from('history_logs').update({ title: '✅ Retiro Completado', description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank">Ver TX</a>` }).eq('id', lastLog.id);
            
            // Notificación al canal de pagos (Transparencia en Vivo)
            try {
                const { data: wUser } = await supabase.from('users').select('username').eq('id', withdrawal.user_id).single();
                const usernameDisplay = wUser?.username && wUser.username !== 'Usuario' ? `@${wUser.username}` : `ID: ${withdrawal.user_id}`;
                const withdrawAmount = Number(withdrawal.amount);
                
                const resPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
                if (resPrice.ok) {
                   const dataPrice = await resPrice.json();
                   if (dataPrice['the-open-network']?.usd) {
                       const gramPrice = dataPrice['the-open-network'].usd;
                       const gramAmount = (withdrawAmount / gramPrice).toFixed(4);
                       const canjeGemas = (withdrawAmount * 1000).toFixed(2);
                       const message = `💎 <b>PAGO VERIFICADO EXITOSAMENTE</b>\n\n👤 <b>Beneficiario:</b> ${usernameDisplay}\n💸 <b>Monto Total:</b> ${gramAmount} GRAM\n🔄 <b>Canje:</b> ${canjeGemas} Gemas\n🛡️ <b>Red:</b> Toncoin (Ton)\n⚡ <b>Estado:</b> Finalizado / 100%\n\n🔹 <b>TXID:</b>\n<a href="https://tonscan.org/tx/${realTxid}">${realTxid}</a>\n\n🔥 ¡Retiros procesados con total transparencia!`;
                       const keyboard = { inline_keyboard: [[{ text: "💰 ¡QUIERO GANAR GRAM AHORA!", url: "https://t.me/TeleGemAds_bot/app", style: "primary" }]] };
                       
                       await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                         method: 'POST', headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ chat_id: '-1002352835078', text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true })
                       });
                   }
                }
            } catch (e) { console.error("Error al notificar retiro manual:", e.message); }

            return { status: 200, body: { success: true } };
        } catch (error) { 
            return { status: 400, body: { success: false, error: 'Fallo en blockchain. Revisa el saldo de tu Master Wallet.' } }; 
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

    // ⚙️ CONFIGURACIÓN DEL SISTEMA
    if (action === 'admin-get-config') {
        const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
        return { status: 200, body: { success: true, config: data || { master_wallet_gram: '', master_wallet_usdt_bep20: '', min_withdrawal: 0.05 } } };
    }

    if (action === 'admin-update-config') {
        await supabase.from('system_settings').upsert({ 
            id: 1, 
            master_wallet_gram: reqBody.config.master_wallet_gram, 
            master_wallet_usdt_bep20: reqBody.config.master_wallet_usdt_bep20,
            min_withdrawal: reqBody.config.min_withdrawal
        });
        return { status: 200, body: { success: true } };
    }

    // 🚀 CREACIÓN DE MISIONES DESDE EL ADMIN
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
