import { supabase } from '../utils/supabase.js';
import { sendTonAutomated } from '../utils/blockchain.js';
import { extractTelegramUsername, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

export async function handleAdminActions(action, targetId, reqBody) {
    if (!action.startsWith('admin-')) return null;

    const adminId = reqBody.adminId;
    // Verificamos si el que pide la acción está en la lista de comandantes
    if (!ADMIN_IDS.includes(String(adminId))) {
        return { status: 403, body: { success: false, error: 'Comando denegado.' } };
    }

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
            // Se aprueba y se envía el dinero manual/automáticamente
            const realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
            await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
            
            // Actualizamos el historial del usuario
            const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).eq('title', '📤 Retiro En Revisión').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lastLog) await supabase.from('history_logs').update({ title: '✅ Retiro Completado', description: `Acreditado | <a href="https://tonscan.org/tx/${realTxid}" target="_blank">Ver TX</a>` }).eq('id', lastLog.id);
            
            return { status: 200, body: { success: true } };
        } catch (error) { 
            return { status: 400, body: { success: false, error: 'Fallo en blockchain. Revisa el saldo de tu Master Wallet.' } }; 
        }
    }

    if (action === 'admin-reject-withdrawal') {
        const { withdrawalId, reason } = reqBody;
        const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
        const { data: userToRefund } = await supabase.from('users').select('balance').eq('id', withdrawal.user_id).single();
        
        // Reembolsamos el balance
        await supabase.from('users').update({ balance: Number((Number(userToRefund.balance) + Number(withdrawal.amount)).toFixed(4)) }).eq('id', withdrawal.user_id);
        await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
        
        const { data: lastLog } = await supabase.from('history_logs').select('id').eq('user_id', withdrawal.user_id).eq('title', '📤 Retiro En Revisión').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastLog) await supabase.from('history_logs').update({ title: '❌ Retiro Rechazado', description: reason ? `Reembolso. Motivo: ${reason}` : `Fondos devueltos.`, amount: Number(withdrawal.amount) }).eq('id', lastLog.id);
        
        return { status: 200, body: { success: true } };
    }

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
