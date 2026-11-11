import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MAIN_ADMIN_ID = '8968109534'; // cuenta que recibe la copia silenciosa de auditoría

// Solo estas descripciones significan que el anuncio fue borrado.
// Cualquier otro error (red, límite de peticiones, bot fuera del canal) NO es fraude: se reintenta.
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

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, error: 'No autorizado' });
    }

    const { data: expired, error } = await supabase
        .from('ad_contracts')
        .select('*')
        .eq('status', 'active')
        .lte('end_time', new Date().toISOString());
    if (error) return res.status(500).json({ success: false, error: `Fallo BD (contratos): ${error.message}` });
    if (!expired || expired.length === 0) return res.status(200).json({ success: true, message: 'No hay contratos por procesar.' });

    let processed = 0;
    let refunded = 0;
    const errors = [];

    for (const c of expired) {
        let claimed = false;
        try {
            // Reclamar el contrato: dos ejecuciones no pueden pagarlo ni reembolsarlo a la vez.
            const { data: got, error: cErr } = await supabase.rpc('claim_ad_contract', { p_id: String(c.id) });
            if (cErr) throw new Error(`reclamar: ${cErr.message}`);
            if (!got) continue; // otra ejecución ya lo tiene
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

    // Fallos visibles: el cron los marca como error para que los veas en los registros.
    if (errors.length > 0) return res.status(500).json({ success: false, processed, refunded, errors });
    return res.status(200).json({ success: true, processed, refunded });
}