import { supabase } from '../utils/supabase.js';
import { sendTonAutomated } from '../utils/blockchain.js';
import { extractTelegramUsername, checkAdminStatusDetailed, ADMIN_IDS, BOT_TOKEN, notifyAdmin } from '../utils/telegram.js';

const round4 = (n) => Number(Number(n).toFixed(4));

// Escapa caracteres HTML para evitar inyecciones en logs o mensajes de Telegram
const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Actualización de saldo con bloqueo optimista (reintenta hasta 3 veces si el saldo cambió en paralelo)
async function atomicAddBalance(userId, deltaBalance, deltaTotalEarnings = 0) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const { data: u, error: rErr } = await supabase
            .from('users')
            .select('balance, total_earnings')
            .eq('id', String(userId))
            .maybeSingle();

        if (rErr || !u) return { ok: false, error: rErr?.message || 'Usuario no encontrado.' };

        const currentBal = Number(u.balance || 0);
        const currentTotal = Number(u.total_earnings || 0);
        const nextBal = round4(currentBal + deltaBalance);
        const nextTotal = round4(currentTotal + deltaTotalEarnings);

        if (nextBal < 0) return { ok: false, error: 'El saldo resultante no puede ser negativo.' };

        const payload = deltaTotalEarnings !== 0
            ? { balance: nextBal, total_earnings: nextTotal }
            : { balance: nextBal };

        const { data: updated, error: uErr } = await supabase
            .from('users')
            .update(payload)
            .eq('id', String(userId))
            .eq('balance', currentBal)
            .select('id, balance');

        if (uErr) return { ok: false, error: uErr.message };
        if (updated && updated.length > 0) return { ok: true, balance: nextBal };
    }
    return { ok: false, error: 'El saldo del usuario estaba cambiando simultáneamente. Intenta de nuevo.' };
}
// Envía un mensaje (con foto o sin foto) a un usuario. Reintenta una vez si Telegram pide esperar (429).
async function sendBroadcastOne(chatId, { text, photo, parseMode, reply_markup }) {
    const method = photo ? 'sendPhoto' : 'sendMessage';
    const body = photo
        ? { chat_id: chatId, photo, caption: text || undefined, parse_mode: parseMode, reply_markup }
        : { chat_id: chatId, text, parse_mode: parseMode, reply_markup, disable_web_page_preview: true };
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) return true;
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 && attempt === 0) {
            await new Promise(r => setTimeout(r, (Number(data?.parameters?.retry_after) || 1) * 1000));
            continue;
        }
        return false;
    }
    return false;
}
export async function handleAdminActions(action, targetId, reqBody, verifiedUserId) {
    if (action === 'verify-admin') {
        const chatId = extractTelegramUsername(String(reqBody?.url || ''));
        if (!chatId) return { status: 400, body: { success: false, error: 'Enlace inválido.' } };
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (adminCheck.isAdmin) return { status: 200, body: { success: true } };
        return { status: 400, body: { success: false, error: adminCheck.error } };
    }

    if (!action.startsWith('admin-')) return null;

    // 🔥 BLINDAJE: Solo cuenta el ID criptográficamente verificado por HMAC en index.js.
    const callerId = String(verifiedUserId || targetId || '');
    if (!callerId || !ADMIN_IDS.includes(callerId)) {
        return { status: 403, body: { success: false, error: 'Comando denegado.' } };
    }

    if (action === 'admin-get-all-tasks') {
        const { data: allTasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true, tasks: allTasks || [] } };
    }

    if (action === 'admin-stats') {
        const [{ count: usersCount, error: uErr }, { count: tasksCount, error: tErr }] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('tasks').select('id', { count: 'exact', head: true })
        ]);
        if (uErr || tErr) return { status: 500, body: { success: false, error: 'Error al consultar métricas.' } };
        return { status: 200, body: { success: true, stats: { users: usersCount || 0, tasks: tasksCount || 0 } } };
    }

    if (action === 'admin-search-user') {
        const searchTarget = String(reqBody?.targetId || '').trim();
        if (!searchTarget) return { status: 400, body: { success: false, error: 'ID inválido.' } };
        const { data: foundUser, error } = await supabase.from('users').select('*').eq('id', searchTarget).maybeSingle();
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: !!foundUser, user: foundUser } };
    }

    if (action === 'admin-update-user') {
        const target = String(reqBody?.targetId || '').trim();
        const rawUpdate = reqBody?.update;
        if (!target || !rawUpdate || typeof rawUpdate !== 'object') {
            return { status: 400, body: { success: false, error: 'Parámetros de actualización inválidos.' } };
        }

        const safeUpdate = {};
        if (rawUpdate.balance !== undefined) {
            const b = Number(rawUpdate.balance);
            if (!Number.isFinite(b) || b < 0) return { status: 400, body: { success: false, error: 'Saldo inválido.' } };
            safeUpdate.balance = round4(b);
        }
        if (rawUpdate.deposit_balance !== undefined) {
            const db = Number(rawUpdate.deposit_balance);
            if (!Number.isFinite(db) || db < 0) return { status: 400, body: { success: false, error: 'Saldo de bóveda inválido.' } };
            safeUpdate.deposit_balance = round4(db);
        }
        if (rawUpdate.is_banned !== undefined) {
            safeUpdate.is_banned = Boolean(rawUpdate.is_banned);
        }

        if (Object.keys(safeUpdate).length === 0) {
            return { status: 400, body: { success: false, error: 'No se enviaron campos válidos para actualizar.' } };
        }

        const { error } = await supabase.from('users').update(safeUpdate).eq('id', target);
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-send-sorteo') {
        const target = String(reqBody?.targetId || '').trim();
        // 🔥 ECONOMÍA INSTITUCIONAL: Ahora se inyectan TGM, no "Gemas"
        const tgmAmount = Number(reqBody?.amount);
        if (!target || !Number.isFinite(tgmAmount) || tgmAmount <= 0) {
            return { status: 400, body: { success: false, error: 'Cantidad de Tokens inválida.' } };
        }
        const usdtAmount = round4(tgmAmount / 1000);

        const credit = await atomicAddBalance(target, usdtAmount, usdtAmount);
        if (!credit.ok) return { status: 409, body: { success: false, error: credit.error } };

        await supabase.from('history_logs').insert([{
            user_id: target,
            title: '🎁 Premio de Comando',
            description: `Acreditación manual | +${tgmAmount.toFixed(2)} $TGM`,
            amount: usdtAmount
        }]);
        return { status: 200, body: { success: true, balance: credit.balance } };
    }

    if (action === 'admin-create-event') {
        const { title, event_type, start_date, end_date, prizes } = reqBody;
        if (!title || !start_date || !end_date) {
            return { status: 400, body: { success: false, error: 'Faltan datos del evento.' } };
        }
        const { data, error } = await supabase
            .from('events')
            .insert([{ title: String(title).trim(), event_type, status: 'active', start_date, end_date, prizes: Array.isArray(prizes) ? prizes : [] }])
            .select()
            .single();
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true, event: data } };
    }

    if (action === 'admin-manage-event') {
        const { eventId, newStatus } = reqBody;
        if (!eventId) return { status: 400, body: { success: false, error: 'ID de evento requerido.' } };
        const { error } = newStatus === 'deleted'
            ? await supabase.from('events').delete().eq('id', eventId)
            : await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-get-past-events') {
        const { data: allEventsData, error } = await supabase.from('events').select('*').order('end_date', { ascending: false });
        if (error) return { status: 500, body: { success: false, error: error.message } };

        const pastEventsData = (allEventsData || [])
            .filter(ev => ev.status === 'completed' || (ev.status === 'active' && new Date(ev.end_date).getTime() <= Date.now()))
            .slice(0, 10);

        const eventsWithWinners = [];
        for (const ev of pastEventsData) {
            const { data: participants } = await supabase
                .from('event_participants')
                .select('user_id, score')
                .eq('event_id', ev.id)
                .order('score', { ascending: false })
                .limit(3);

            let winners = [];
            if (participants && participants.length > 0) {
                const userIds = participants.map(p => String(p.user_id));
                const { data: usersFound } = await supabase.from('users').select('id, username').in('id', userIds);
                const userMap = new Map((usersFound || []).map(u => [String(u.id), u.username]));
                winners = participants.map(p => ({
                    userId: p.user_id,
                    username: userMap.get(String(p.user_id)) || 'Usuario',
                    score: p.score
                }));
            }
            eventsWithWinners.push({ ...ev, winners });
        }
        return { status: 200, body: { success: true, pastEvents: eventsWithWinners } };
    }

    if (action === 'admin-get-withdrawals') {
        const { data: withdrawals, error } = await supabase
            .from('withdrawals')
            .select('*')
            .in('status', ['pending', 'manual_review'])
            .order('created_at', { ascending: false });
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true, withdrawals: withdrawals || [] } };
    }

    if (action === 'admin-approve-withdrawal') {
        const { withdrawalId } = reqBody;
        const { data: withdrawal, error: readError } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
        if (readError) return { status: 500, body: { success: false, error: `Fallo BD: ${readError.message}` } };
        if (!withdrawal) return { status: 404, body: { success: false, error: 'Retiro no encontrado.' } };
        if (withdrawal.status === 'completed') return { status: 400, body: { success: false, error: 'Ya pagado.' } };
        if (withdrawal.status !== 'pending') {
            return { status: 400, body: { success: false, error: `El retiro está en estado "${withdrawal.status}". Verifica en Tonscan antes de tocarlo.` } };
        }

        const { data: claimed, error: claimError } = await supabase
            .from('withdrawals')
            .update({ status: 'processing' })
            .eq('id', withdrawalId)
            .eq('status', 'pending')
            .select('id');

        if (claimError) return { status: 500, body: { success: false, error: `Fallo BD: ${claimError.message}` } };
        if (!claimed || claimed.length === 0) return { status: 409, body: { success: false, error: 'Este retiro ya está siendo procesado.' } };

        let realTxid;
        try {
            realTxid = await sendTonAutomated(withdrawal.wallet_address, withdrawal.amount);
        } catch (error) {
            await supabase.from('withdrawals').update({ status: 'manual_review' }).eq('id', withdrawalId).eq('status', 'processing');
            const errMsg = error?.message || String(error);
            console.error('Fallo/Timeout en blockchain (retiro):', errMsg);
            notifyAdmin(`⚠️ <b>ALERTA DE RETIRO EN REVISIÓN MANUAL</b>\nID Retiro: <code>${withdrawalId}</code>\nUsuario: <code>${withdrawal.user_id}</code>\nMonto: $${withdrawal.amount}\nError: <code>${escapeHtml(errMsg)}</code>\n\n<i>Revisa la wallet en Tonscan antes de volver a ponerlo en pending.</i>`);
            return { status: 502, body: { success: false, error: `Incertidumbre en blockchain (${errMsg}). Marcado como 'manual_review' para evitar doble pago. Revisa Tonscan.` } };
        }

        const safeTxid = encodeURIComponent(String(realTxid || '').trim());
        const { error: doneError } = await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
        if (doneError) {
            return { status: 500, body: { success: false, error: `Pagado (TX ${realTxid}), pero falló al marcar completado: ${doneError.message}` } };
        }

        const { data: lastLog } = await supabase
            .from('history_logs')
            .select('id')
            .eq('user_id', withdrawal.user_id)
            .eq('title', '📤 Retiro En Revisión')
            .eq('amount', -Number(withdrawal.amount))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastLog) {
            await supabase
                .from('history_logs')
                .update({
                    title: '✅ Retiro Completado',
                    description: `Liquidado | <a href="https://tonscan.org/tx/${safeTxid}" target="_blank">Ver TX</a>`
                })
                .eq('id', lastLog.id);
        }

        try {
            const { data: config } = await supabase.from('system_settings').select('payment_channel_id').eq('id', 1).maybeSingle();
            const payChannel = config?.payment_channel_id?.trim();

            if (payChannel && BOT_TOKEN) {
                const { data: wUser } = await supabase.from('users').select('username').eq('id', withdrawal.user_id).maybeSingle();
                const usernameDisplay = wUser?.username && wUser.username !== 'Usuario'
                    ? `@${escapeHtml(wUser.username)}`
                    : `ID: ${escapeHtml(withdrawal.user_id)}`;

                const withdrawAmount = Number(withdrawal.amount);
                // 🔥 ECONOMÍA INSTITUCIONAL: Convertimos a $TGM en lugar de Gemas
                const canjeTGM = (withdrawAmount * 1000).toFixed(2);

                let amountDisplay = `$${withdrawAmount.toFixed(4)} USDT`;
                try {
                    const resPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
                    if (resPrice.ok) {
                        const dataPrice = await resPrice.json();
                        const tonUsd = Number(dataPrice?.['the-open-network']?.usd);
                        if (Number.isFinite(tonUsd) && tonUsd > 0) {
                            amountDisplay = `${(withdrawAmount / tonUsd).toFixed(4)} GRAM ($${withdrawAmount.toFixed(2)})`;
                        }
                    }
                } catch {}

                const message =
                    `🌐 <b>LIQUIDACIÓN VERIFICADA EXITOSAMENTE</b>\n\n` +
                    `👤 <b>Beneficiario:</b> ${usernameDisplay}\n` +
                    `💸 <b>Monto Depositado:</b> ${amountDisplay}\n` +
                    `🔄 <b>Canje Efectuado:</b> ${canjeTGM} $TGM\n` +
                    `🛡️ <b>Protocolo:</b> Toncoin (TON)\n` +
                    `⚡ <b>Estado:</b> Procesado\n\n` +
                    `🔹 <b>TXID (Contrato Inteligente):</b>\n<a href="https://tonscan.org/tx/${safeTxid}">${escapeHtml(realTxid)}</a>\n\n` +
                    `🔥 ¡Operaciones procesadas con total transparencia!`;

                const keyboard = { inline_keyboard: [[{ text: '💰 ¡QUIERO INICIAR AHORA!', url: 'https://t.me/TeleGemAds_bot/app' }]] };

                const tgReq = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: payChannel,
                        text: message,
                        parse_mode: 'HTML',
                        reply_markup: keyboard,
                        disable_web_page_preview: true
                    })
                });

                if (!tgReq.ok) {
                    console.error('Fallo enviando notificación a Telegram (Retiro):', await tgReq.text());
                }
            }
        } catch (e) {
            console.error('Error crítico al notificar retiro:', e.message);
        }

        return { status: 200, body: { success: true, txid: realTxid } };
    }

    if (action === 'admin-reject-withdrawal') {
        const { withdrawalId, reason } = reqBody;
        const { data: withdrawal, error: readError } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
        if (readError) return { status: 500, body: { success: false, error: `Fallo BD: ${readError.message}` } };
        if (!withdrawal) return { status: 404, body: { success: false, error: 'Retiro no encontrado.' } };
        if (!['pending', 'manual_review'].includes(withdrawal.status)) {
            return { status: 400, body: { success: false, error: `No se puede rechazar un retiro en estado "${withdrawal.status}".` } };
        }

        const prevStatus = withdrawal.status;
        const { data: claimed, error: claimError } = await supabase
            .from('withdrawals')
            .update({ status: 'rejected' })
            .eq('id', withdrawalId)
            .eq('status', prevStatus)
            .select('id');

        if (claimError) return { status: 500, body: { success: false, error: `Fallo BD: ${claimError.message}` } };
        if (!claimed || claimed.length === 0) return { status: 409, body: { success: false, error: 'Este retiro ya fue procesado.' } };

        const refund = await atomicAddBalance(withdrawal.user_id, Number(withdrawal.amount), 0);
        if (!refund.ok) {
            await supabase.from('withdrawals').update({ status: prevStatus }).eq('id', withdrawalId).eq('status', 'rejected');
            return { status: 500, body: { success: false, error: `No se pudo devolver el saldo (${refund.error}). El retiro sigue en ${prevStatus}.` } };
        }

        const cleanReason = escapeHtml(String(reason || '').trim());
        const { data: lastLog } = await supabase
            .from('history_logs')
            .select('id')
            .eq('user_id', withdrawal.user_id)
            .eq('title', '📤 Retiro En Revisión')
            .eq('amount', -Number(withdrawal.amount))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastLog) {
            await supabase
                .from('history_logs')
                .update({
                    title: '❌ Retiro Rechazado',
                    description: cleanReason ? `Reembolso. Motivo: ${cleanReason}` : 'Fondos devueltos a tu balance.',
                    amount: Number(withdrawal.amount)
                })
                .eq('id', lastLog.id);
        }
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-get-config') {
        const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
        if (error) return { status: 500, body: { success: false, error: error.message } };
        return {
            status: 200,
            body: {
                success: true,
                config: data || {
                    master_wallet_gram: '',
                    master_wallet_usdt_bep20: '',
                    min_withdrawal: 0.50, // 🔥 ECONOMÍA INSTITUCIONAL: Defecto $0.50 (500 TGM)
                    ref_percent: 20,      // 🔥 ECONOMÍA INSTITUCIONAL: Defecto 20%
                    ref_bonus_gemas: 5,   // $TGM
                    mandatory_channel_1: '',
                    mandatory_channel_2: '',
                    payment_channel_id: ''
                }
            }
        };
    }

    if (action === 'admin-update-config') {
        const cfg = reqBody?.config;
        if (!cfg || typeof cfg !== 'object') return { status: 400, body: { success: false, error: 'Configuración inválida.' } };

        const minW = Number(cfg.min_withdrawal);
        const refP = Number(cfg.ref_percent);
        const refB = Number(cfg.ref_bonus_gemas);

        if (!Number.isFinite(minW) || minW <= 0) return { status: 400, body: { success: false, error: 'Mínimo de retiro inválido.' } };
        if (!Number.isFinite(refP) || refP < 0 || refP > 100) return { status: 400, body: { success: false, error: '% de referido debe estar entre 0 y 100.' } };
        if (!Number.isFinite(refB) || refB < 0) return { status: 400, body: { success: false, error: 'Bono de referido inválido.' } };

        const { error } = await supabase.from('system_settings').upsert({
            id: 1,
            master_wallet_gram: String(cfg.master_wallet_gram || '').trim(),
            master_wallet_usdt_bep20: String(cfg.master_wallet_usdt_bep20 || '').trim(),
            min_withdrawal: minW,
            ref_percent: refP,
            ref_bonus_gemas: refB,
            mandatory_channel_1: String(cfg.mandatory_channel_1 || '').trim(),
            mandatory_channel_2: String(cfg.mandatory_channel_2 || '').trim(),
            payment_channel_id: String(cfg.payment_channel_id || '').trim()
        });
        if (error) return { status: 400, body: { success: false, error: `Fallo al guardar en BD: ${error.message}` } };
        return { status: 200, body: { success: true } };
    }

    if (action === 'admin-create-master-task') {
        const title = String(reqBody?.title || '').trim();
        const url = String(reqBody?.url || '').trim();
        const type = String(reqBody?.type || '').trim();
        const reward = Number(reqBody?.reward);

        if (!title || !url || !Number.isFinite(reward) || reward <= 0) {
            return { status: 400, body: { success: false, error: 'Datos de misión maestra inválidos.' } };
        }

        if (type === 'partner' || type === 'daily_channel') {
            const chatId = extractTelegramUsername(url);
            if (!chatId) return { status: 400, body: { success: false, error: 'Enlace inválido.' } };
            const adminCheck = await checkAdminStatusDetailed(chatId);
            if (!adminCheck.isAdmin) return { status: 400, body: { success: false, error: adminCheck.error } };
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                creator_id: callerId,
                title,
                url,
                type,
                reward,
                completions_total: 9999999,
                completions_done: 0,
                total_cost: 0,
                status: 'active',
                current_clicks: 0,
                target_clicks: 9999999
            }])
            .select()
            .single();

        if (error) return { status: 400, body: { success: false, error: error.message } };
        return { status: 200, body: { success: true, task: data } };
    }

        // Envío masivo por lotes: el panel llama de nuevo con next_offset hasta que done sea true.
    if (action === 'admin-broadcast') {
        const text = String(reqBody?.text || '').trim();
        const photo = String(reqBody?.photo || '').trim();
        const parseMode = reqBody?.parse_mode === 'HTML' ? 'HTML' : undefined;
        const offset = Math.max(0, Number(reqBody?.offset) || 0);
        const limit = Math.min(20, Math.max(1, Number(reqBody?.limit) || 20));

        if (!text && !photo) return { status: 400, body: { success: false, error: 'El mensaje no puede estar vacío.' } };
        if (!photo && text.length > 4096) return { status: 400, body: { success: false, error: 'El texto pasa de 4096 caracteres.' } };
        if (photo && text.length > 1024) return { status: 400, body: { success: false, error: 'Con foto, el texto no puede pasar de 1024 caracteres.' } };
        if (photo && !/^https:\/\//.test(photo)) return { status: 400, body: { success: false, error: 'La foto debe ser un enlace https.' } };
        if (!BOT_TOKEN) return { status: 500, body: { success: false, error: 'Falta BOT_TOKEN en el servidor.' } };

        // Botones: solo enlaces https. style es opcional: primary, success o danger.
        const buttons = Array.isArray(reqBody?.buttons) ? reqBody.buttons.slice(0, 8) : [];
        const inline_keyboard = [];
        for (const b of buttons) {
            const bt = String(b?.text || '').trim().slice(0, 64);
            const bu = String(b?.url || '').trim();
            if (!bt || !/^https:\/\//.test(bu)) {
                return { status: 400, body: { success: false, error: `Botón inválido: «${bt}». El enlace debe empezar por https://` } };
            }
            const btn = { text: bt, url: bu };
            if (['primary', 'success', 'danger'].includes(b?.style)) btn.style = b.style;
            inline_keyboard.push([btn]);
        }
        const reply_markup = inline_keyboard.length ? { inline_keyboard } : undefined;

        const { data: users, error } = await supabase
            .from('users')
            .select('id, is_banned')
            .order('id', { ascending: true })
            .range(offset, offset + limit - 1);
        if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };

        const list = users || [];
        let sent = 0, failed = 0, skipped = 0;
        for (const u of list) {
            if (u.is_banned === true) { skipped++; continue; }
            const ok = await sendBroadcastOne(String(u.id), { text, photo, parseMode, reply_markup });
            if (ok) sent++; else failed++;
            await new Promise(r => setTimeout(r, 40));
        }

        return {
            status: 200,
            body: {
                success: true,
                sent,
                failed,
                skipped,
                next_offset: offset + list.length,
                done: list.length < limit
            }
        };
    }
    return { status: 400, body: { success: false, error: `Acción admin no reconocida: ${action}` } };
}
