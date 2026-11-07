import { supabase } from '../utils/supabase.js';

export async function handleBankingActions(action, targetId, reqBody) {
    if (action === 'request-withdrawal') {
        const { address, amount } = reqBody;
        let withdrawAmount = Number(amount);

        // 1. Obtener el mínimo de retiro dinámico desde system_settings
        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).single();
        const dynamicMin = Number(config?.min_withdrawal || 0.05); // Default 50 Gemas (0.05 USDT) si no existe
        if (!address || withdrawAmount < dynamicMin) return { status: 400, body: { success: false, error: `Mínimo de retiro: ${dynamicMin * 1000} Gemas.` } };

        const todayDate = new Date(); todayDate.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString());

        if ((refCount || 0) < 5 && (adsCount || 0) < 5) return { status: 400, body: { success: false, error: `Requisito: 5 referidos activos O ver 5 anuncios web.` } };

        const { data: wUser } = await supabase.from('users').select('balance, saved_wallet').eq('id', targetId).single();
        if (!wUser) return { status: 400, body: { success: false, error: 'Usuario no encontrado.' } };

        // 2. Seguridad de Billetera Guardada (Inmodificable)
        if (wUser.saved_wallet && wUser.saved_wallet !== address) {
             return { status: 400, body: { success: false, error: 'Por seguridad, no puedes cambiar la billetera vinculada a esta cuenta.' } };
        }
        
        if (!wUser.saved_wallet) {
            // Verificar si la wallet ya está usada por otro usuario (Anti-Multicuentas)
            const { data: existingWallet } = await supabase.from('users').select('id').eq('saved_wallet', address).single();
            if (existingWallet && existingWallet.id !== targetId) {
                 await supabase.from('users').update({ is_banned: true }).eq('id', targetId);
                 return { status: 403, body: { success: false, error: 'Wallet vinculada a otra cuenta. Has sido baneado por multicuentas.' } };
            }
        }

        if (Number(wUser.balance) < withdrawAmount) return { status: 400, body: { success: false, error: 'Saldo insuficiente.' } };

        const newBalance = Number((Number(wUser.balance) - withdrawAmount).toFixed(4));
        await supabase.from('users').update({ balance: newBalance, saved_wallet: address }).eq('id', targetId);

        // 3. Retiros 100% Manuales (Enviados a Pending)
        const { data: withdrawal, error: withdrawError } = await supabase.from('withdrawals').insert([{ user_id: targetId, wallet_address: address, amount: withdrawAmount, status: 'pending' }]).select().single();
        if (withdrawError) return { status: 400, body: { success: false, error: `Error en BD.` } };

        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📤 Retiro En Revisión', description: `Destino: ${address.substring(0,8)}... | -${(withdrawAmount * 1000).toFixed(2)} Gemas`, amount: -withdrawAmount }]);
        return { status: 200, body: { success: true, balance: newBalance, saved_wallet: address, message: 'Retiro en revisión administrativa.' } };
    }

    if (action === 'get-withdrawal-reqs') {
        const todayStr = new Date(); todayStr.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString());
        
        // Devolvemos también la wallet guardada para bloquear el frontend
        const { data: u } = await supabase.from('users').select('saved_wallet').eq('id', targetId).single();
        return { status: 200, body: { success: true, referrals: refCount || 0, ads: adsCount || 0, saved_wallet: u?.saved_wallet || null } };
    }

    return null;
}
