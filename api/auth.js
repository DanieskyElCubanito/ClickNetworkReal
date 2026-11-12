import { supabase } from '../utils/supabase.js';
import { notifyAdmin, checkMembership, extractTelegramUsername, ADMIN_IDS } from '../utils/telegram.js';

const startOfTodayUTC = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

export async function handleAuthAndUserActions(action, targetId, targetUser, deviceId, clientIp, start_param, turnstileToken) {
    const uid = String(targetId || '').trim();
    if (!uid) return { status: 401, body: { success: false, error: 'Identidad de usuario inválida.' } };

    if (action === 'verify' || action === 'verify-channels') {
        // 1. Verificación de Canales Obligatorios (Gatekeeper)
        const { data: config } = await supabase
            .from('system_settings')
            .select('mandatory_channel_1, mandatory_channel_2')
            .eq('id', 1)
            .maybeSingle();

        let c1_joined = true;
        let c2_joined = true;
        const c1_url = config?.mandatory_channel_1?.trim() || '';
        const c2_url = config?.mandatory_channel_2?.trim() || '';

        if (c1_url) {
            const u1 = extractTelegramUsername(c1_url);
            if (u1) c1_joined = await checkMembership(uid, u1);
        }
        if (c2_url) {
            const u2 = extractTelegramUsername(c2_url);
            if (u2) c2_joined = await checkMembership(uid, u2);
        }

        if (action === 'verify-channels') {
            return {
                status: 200,
                body: {
                    success: true,
                    allJoined: c1_joined && c2_joined,
                    channel1: c1_joined,
                    channel2: c2_joined,
                    c1_url,
                    c2_url
                }
            };
        }

        // 2. Verificación Cloudflare Turnstile
        // Fail-closed: en producción, sin TURNSTILE_SECRET_KEY el login se rechaza con error de configuración.
        const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
        if (isProduction && !process.env.TURNSTILE_SECRET_KEY) {
            console.error('[Turnstile] TURNSTILE_SECRET_KEY no configurada en producción.');
            return { status: 500, body: { success: false, error: 'Configuración de seguridad incompleta (Turnstile).' } };
        }

        const requireTurnstile = process.env.REQUIRE_TURNSTILE === 'true';
        if (requireTurnstile || turnstileToken) {
            if (!process.env.TURNSTILE_SECRET_KEY) {
                return { status: 500, body: { success: false, error: 'Configuración de seguridad incompleta (Turnstile).' } };
            }
            if (!turnstileToken) {
                return { status: 403, body: { success: false, error: 'Captcha requerido. Actualiza la app.' } };
            }
            try {
                const cfForm = new URLSearchParams({
                    secret: process.env.TURNSTILE_SECRET_KEY,
                    response: String(turnstileToken),
                    remoteip: String(clientIp || '')
                });
                const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    method: 'POST',
                    body: cfForm
                });
                const cfData = await cfRes.json();
                if (!cfData.success) {
                    return { status: 403, body: { success: false, error: 'Verificación anti-bot fallida.' } };
                }
            } catch {
                return { status: 503, body: { success: false, error: 'No se pudo contactar al servidor anti-bot. Reintenta.' } };
            }
        }

        // 3. Validación estricta de huella de dispositivo
        const cleanDeviceId = String(deviceId || '').trim();
        if (!cleanDeviceId || cleanDeviceId === 'unknown_device' || cleanDeviceId.length < 8 || cleanDeviceId.length > 128) {
            return { status: 403, body: { success: false, error: 'Dispositivo no verificado.' } };
        }

        let { data: dbUser, error: queryError } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
        if (queryError) return { status: 500, body: { success: false, error: 'Error de conexión con la base de datos.' } };
        if (dbUser && dbUser.is_banned) return { status: 403, body: { success: false, error: 'Cuenta suspendida.' } };

        // 4. Control Anti-Multicuenta por Dispositivo (Inmutable)
        const { data: firstDeviceOwner, error: devError } = await supabase
            .from('users')
            .select('id')
            .eq('device_id', cleanDeviceId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (devError) return { status: 500, body: { success: false, error: 'Error al verificar dispositivo.' } };

        if (firstDeviceOwner && String(firstDeviceOwner.id) !== uid && !ADMIN_IDS.includes(uid)) {
            notifyAdmin(`🚨 <b>BLOQUEO DE MULTICUENTA</b>\nEl usuario <code>${uid}</code> intentó entrar en el dispositivo vinculado a <code>${firstDeviceOwner.id}</code>.`);
            return { status: 403, body: { success: false, error: 'Acceso bloqueado: Dispositivo vinculado a otra cuenta.' } };
        }

        const safeUsername = targetUser?.username ? String(targetUser.username).trim() : 'Usuario';

        // 5. Registro o Actualización Segura (Device ID nunca se sobrescribe si ya existe)
        if (!dbUser) {
            const newUserObj = {
                id: uid,
                username: safeUsername,
                balance: 0,
                deposit_balance: 0,
                total_earnings: 0,
                referral_earnings: 0,
                is_human: true,
                device_id: cleanDeviceId,
                last_ip: clientIp
            };

            const cleanRef = start_param ? String(start_param).trim() : '';
            if (cleanRef && cleanRef !== uid) {
                const { data: inviter } = await supabase.from('users').select('id').eq('id', cleanRef).maybeSingle();
                if (inviter) newUserObj.referred_by = cleanRef;
            }

            const { data: newUser, error: insertError } = await supabase.from('users').insert([newUserObj]).select().single();

            if (insertError) {
                if (insertError.code === '23505') {
                    const { data: existingUser, error: reReadErr } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
                    if (reReadErr || !existingUser) {
                        return { status: 500, body: { success: false, error: 'Fallo al recuperar sesión concurrente.' } };
                    }
                    dbUser = existingUser;
                } else {
                    return { status: 500, body: { success: false, error: `Fallo crítico de registro: ${insertError.message}` } };
                }
            } else {
                dbUser = newUser;
            }
        } else {
            // Si la cuenta era antigua y tenía device_id vacío, lo sellamos ahora; si ya tenía uno, jamás se pisa.
            const updatePayload = { last_ip: clientIp, username: safeUsername };
            if (!dbUser.device_id) updatePayload.device_id = cleanDeviceId;

            const { error: updErr } = await supabase.from('users').update(updatePayload).eq('id', uid);
            if (updErr) console.error('Error actualizando metadatos de login:', updErr.message);
        }

        if (!dbUser) {
            return { status: 500, body: { success: false, error: 'No se pudo inicializar el perfil del usuario.' } };
        }

        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', uid);

        return {
            status: 200,
            body: {
                success: true,
                user: dbUser,
                stats: { n1: refCount || 0, c1: String(dbUser.referral_earnings || 0) },
                mandatory: { c1_url, c2_url, c1_joined, c2_joined, all_joined: c1_joined && c2_joined }
            }
        };
    }

    if (action === 'claim-gigapub-daily') {
        const { data: result, error: rpcError } = await supabase.rpc('claim_daily_checkin', {
            p_user_id: uid,
            p_date_start: startOfTodayUTC()
        });

        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD: ${rpcError.message}` } };
        if (!result || result.ok !== true) {
            return { status: 400, body: { success: false, error: result?.error || 'No se pudo reclamar el bono.' } };
        }

        // Gemas ganadas hoy (1 a 7). Son la recompensa, NO el día de la racha.
        const gemasGanadas = Number(result.earned_gemas ?? result.earned ?? 1);

        // Día de la racha que devuelve la función. Solo se acepta un entero de 1 a 7.
        const rawDay = Number(result.streak_day ?? result.day);
        const streakDay = Number.isInteger(rawDay) && rawDay >= 1 && rawDay <= 7 ? rawDay : null;

        return {
            status: 200,
            body: {
                success: true,
                earned_gemas: gemasGanadas.toFixed(2),
                streak_day: streakDay,
                balance: result.balance
            }
        };
    }

    return null;
}