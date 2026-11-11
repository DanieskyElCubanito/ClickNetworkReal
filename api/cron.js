import { createClient } from '@supabase/supabase-js';
// 🔥 BLINDAJE: Importamos las credenciales y utilidades centralizadas
import { BOT_TOKEN, MAIN_ADMIN_ID, checkMembership, extractTelegramUsername, notifyUser } from '../utils/telegram.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Solo estas descripciones significan que el anuncio fue borrado.
const DELETED_MESSAGE_ERRORS = ['message to forward not found', 'message to copy not found', 'message_id_invalid'];

async function checkMessage(chatId, messageId) {
    let res;
    let data;
    try {
        res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: MAIN_ADMIN_ID, from_chat_id: chatId, message_id: messageId, disable_notification: true }),
        });
        data = await res.json();
    } catch (e) {
        return { state: 'error', error: `Telegram no respondió: ${e.message}` };
    }
    if (data?.ok) return { state: 'exists' };
    const desc = String(data?.description || `HTTP ${res?.status}`);
    if (DELETED_MESSAGE_ERRORS.some((p) => desc.toLowerCase().includes(p))) return { state: 'deleted' };
    return { state: 'error', error: desc };
}

// 🔥 INYECTADO: La auditoría que sacamos de auth.js ahora corre en segundo plano
async function runRetentionAudit() {
    let penalties = 0;
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTasks } = await supabase.from('user_completed_tasks').select('task_id, user_id, created_at, tasks!inner(type, url, reward, title)').gte('created_at', yesterday);
      if (!recentTasks || recentTasks.length === 0) return penalties;
  
      for (const item of recentTasks) {
        const t = item.tasks;
        if (t && (t.type === 'group' || t.type === 'channel' || t.type === 'partner' || t.type === 'daily_channel')) {
          const chatId = extractTelegramUsername(t.url);
          if (chatId && !(await checkMembership(item.user_id, chatId))) {
              const penaltyAmount = Number(t.reward || 0);
              const { data: pUser } = await supabase.from('users').select('balance, total_earnings').eq('id', item.user_id).single();
              if (pUser) {
                const newBal = Math.max(0, Number(pUser.balance) - penaltyAmount);
                // Bloqueo optimista
                const { data: updated } = await supabase.from('users')
                    .update({ balance: newBal, total_earnings: Math.max(0, Number(pUser.total_earnings) - penaltyAmount) })
                    .eq('id', item.user_id).eq('balance', pUser.balance).select('id');
                
                if (updated && updated.length > 0) {
                   await supabase.from('user_completed_tasks').delete().eq('task_id', item.task_id).eq('user_id', item.user_id);
                   await supabase.from('history_logs').insert([{ user_id: item.user_id, title: '⚠️ Penalidad de Permanencia', description: `Sanción por abandono prematuro: -${(penaltyAmount * 1000).toFixed(2)} Gemas.`, amount: -penaltyAmount }]);
                   await notifyUser(item.user_id, `⚠️ <b>PENALIZACIÓN</b>\nSaliste de ${t.title} antes de 24h. Gemas deducidas.`);
                   penalties++;
                }
              }
          }
        }
      }
    } catch (error) { console.error("Error en Retention Audit:", error); }
    return penalties;
}

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, error: 'No autorizado' });
    }

    // 1. EJECUTAR AUDITORÍA DE RETENCIÓN DE CANALES
    const penaltiesApplied = await runRetentionAudit();

    // 2. EJECUTAR LIQUIDACIÓN DE CONTRATOS ESCROW
    const { data: expired, error } = await supabase
        .from('ad_contracts')
        .select('*')
        .eq('status', 'active')
        .lte('end_time', new Date().toISOString());
        
    if (error) return res.status(500).json({ success: false, error: `Fallo BD (contratos): ${error.message}` });
    if (!expired || expired.length === 0) return res.status(200).json({ success: true, message: 'No hay contratos por procesar.', penaltiesApplied });

    let processed = 0;
    let refunded = 0;
    const errors = [];

    for (const c of expired) {
        let claimed = false;
        try {
            const { data: got, error: cErr } = await supabase.rpc('claim_ad_contract', { p_id: String(c.id) });
            if (cErr) throw new Error(`reclamar: ${cErr.message}`);
            if (!got) continue; 
            claimed = true;

            const check = await checkMessage(c.chat_id, c.message_id);
            if (check.state === 'error') throw new Error(`Telegram: ${check.error}`);

            if (check.state === 'exists') {
                const { error: sErr } = await supabase.rpc('settle_ad_contract', {
                    p_id: String(c.id),
                    p_owner_id: String(c.channel_owner_id),
                    p_price: Number(c.price),
                    p_chat_id: String(c.chat_id),
                });
                if (sErr) throw new Error(`pagar: ${sErr.message}`);
                processed++;
            } else {
                const refund = Number((Number(c.price) * 1.2).toFixed(4));
                const { error: rErr } = await supabase.rpc('refund_ad_contract', {
                    p_id: String(c.id),
                    p_advertiser_id: String(c.advertiser_id),
                    p_refund: refund,
                    p_chat_id: String(c.chat_id),
                });
                if (rErr) throw new Error(`reembolsar: ${rErr.message}`);
                refunded++;
            }
        } catch (e) {
            errors.push(`contrato ${c.id}: ${e.message}`);
            if (claimed) {
                const { error: uErr } = await supabase.rpc('release_ad_contract', { p_id: String(c.id) });
                if (uErr) errors.push(`contrato ${c.id} sin liberar: ${uErr.message}`);
            }
        }
    }

    if (errors.length > 0) return res.status(500).json({ success: false, processed, refunded, penaltiesApplied, errors });
    return res.status(200).json({ success: true, processed, refunded, penaltiesApplied });
}
