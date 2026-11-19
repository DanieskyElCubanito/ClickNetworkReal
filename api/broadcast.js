// api/broadcast.js — envío masivo por lotes (solo admins; lo llama api/admin.js).
// Cada llamada envía hasta 25 usuarios desde «offset» y responde next_offset y done.
import { supabase } from '../utils/supabase.js';
import { BOT_TOKEN } from '../utils/telegram.js';

const COLORS = ['primary', 'success', 'danger'];
const BATCH_MS = 40000;

async function tgPost(method, payload) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    return { httpStatus: res.status, data };
}

// Envía a un usuario. Si Telegram pide esperar (429), espera y reintenta una vez.
async function sendOne(chatId, msg) {
    const method = msg.photo ? 'sendPhoto' : 'sendMessage';
    const payload = {
        chat_id: chatId,
        parse_mode: msg.parseMode,
        reply_markup: msg.reply_markup,
        ...(msg.photo ? { photo: msg.photo, caption: msg.text } : { text: msg.text }),
    };
    for (let attempt = 0; attempt < 2; attempt++) {
        const r = await tgPost(method, payload);
        if (r.data?.ok) return true;
        const retry = Number(r.data?.parameters?.retry_after) || 0;
        if (r.httpStatus === 429 && retry > 0 && attempt === 0) {
            await new Promise((res) => setTimeout(res, Math.min(retry, 30) * 1000));
            continue;
        }
        return false;
    }
    return false;
}

// Botones: filas de {text, url, style|color}. Solo enlaces https.
function buildKeyboard(rawButtons) {
    const rows = Array.isArray(rawButtons) ? rawButtons.slice(0, 8) : [];
    const inline_keyboard = [];
    for (const row of rows) {
        const items = Array.isArray(row) ? row : [row];
        const line = [];
        for (const b of items.slice(0, 4)) {
            const label = String(b?.text || '').trim().slice(0, 64);
            const url = String(b?.url || '').trim();
            if (!label || !/^https:\/\//i.test(url)) {
                return { error: `Botón inválido: «${label}». El enlace debe empezar por https://` };
            }
            const btn = { text: label, url };
            const color = b?.style ?? b?.color;
            if (COLORS.includes(color)) btn.style = color;
            line.push(btn);
        }
        if (line.length) inline_keyboard.push(line);
    }
    return { markup: inline_keyboard.length ? { inline_keyboard } : undefined };
}

export async function handleBroadcast(reqBody) {
    const started = Date.now();
    const text = String(reqBody?.text || '').trim();
    const photo = String(reqBody?.photo || '').trim();
    const pm = reqBody?.parseMode ?? reqBody?.parse_mode;
    const parseMode = pm === 'HTML' ? 'HTML' : undefined;
    const offset = Math.max(0, Number(reqBody?.offset ?? reqBody?.next_offset) || 0);
    const limit = Math.min(25, Math.max(1, Number(reqBody?.limit) || 25));

    if (!text && !photo) return { status: 400, body: { success: false, error: 'El mensaje no puede estar vacío.' } };
    if (!photo && text.length > 4096) return { status: 400, body: { success: false, error: 'El texto pasa de 4096 caracteres.' } };
    if (photo && text.length > 1024) return { status: 400, body: { success: false, error: 'Con foto, el texto no puede pasar de 1024 caracteres.' } };
    if (photo && !/^https:\/\//.test(photo)) return { status: 400, body: { success: false, error: 'La foto debe ser un enlace https.' } };
    if (!BOT_TOKEN) return { status: 500, body: { success: false, error: 'Falta BOT_TOKEN en el servidor.' } };

    const kb = buildKeyboard(reqBody?.buttons);
    if (kb.error) return { status: 400, body: { success: false, error: kb.error } };

    const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, is_banned')
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1);
    if (uErr) return { status: 500, body: { success: false, error: `Fallo BD: ${uErr.message}` } };

    const list = users || [];
    let sent = 0, failed = 0, skipped = 0, processed = 0;
    for (const u of list) {
        if (Date.now() - started > BATCH_MS) break;
        processed++;
        if (u.is_banned === true) { skipped++; continue; }
        const ok = await sendOne(String(u.id), { text, photo: photo || null, parseMode, reply_markup: kb.markup });
        if (ok) sent++; else failed++;
        await new Promise((r) => setTimeout(r, 40));
    }

    const next = offset + processed;
    return {
        status: 200,
        body: {
            success: true,
            sent,
            failed,
            skipped,
            next_offset: next,
            nextOffset: next,
            done: processed === list.length && list.length < limit,
        },
    };
}