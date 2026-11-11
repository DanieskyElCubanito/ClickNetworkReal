import { supabase } from '../utils/supabase.js';
import { notifyAdmin, checkMembership, extractTelegramUsername, notifyUser, ADMIN_IDS } from '../utils/telegram.js';

const startOfTodayUTC = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

export async function handleAuthAndUserActions(action, targetId, targetUser, deviceId, clientIp, start_param, turnstileToken) {
    if (action === 'verify' || action === 'verify-channels') {
        
        const { data: config } = await supabase.from('system_settings').select('mandatory_channel_1, mandatory_channel_2').eq('id', 1).maybeSingle();
        let c1_joined = true;
        let c2_joined = true;
        let c1_url = config?.mandatory_channel_1 || '';
        let c2_url = config?.mandatory_channel_2 || '';

        if (c1_url) {
            const u1 = extractTelegramUsername(c1_url);
            if (u1) c1_joined = await checkMembership(targetId, u1);
        }
        if (c2_url) {
            const u2 = extractTelegramUsername(c2_url);
            if (u2) c2_joined = await checkMembership(targetId, u2);
        }

        if (action === 'verify-channels') {
            return { status: 200, body: { success: true, allJoined: (c1_joined && c2_joined), channel1: c1_joined, channel2: c2_joined, c1_url, c2_url } };
        }

        // 🔥 BLINDAJE 1: Captcha FALLA CERRADO (Fail-Closed)
        if (!process.env.TURNSTILE_SECRET_KEY) {
            return { status: 500, body: { success: false, error: 'Configuración de seguridad incompleta: Falta Turnstile Key.' } };
        }
        if (!turnstileToken) return { status: 403, body: { success: false, error: 'Captcha requerido. Actualiza la app.' } };
        
        const cfForm = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: clientIp });
        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: cfForm });
        const cfData = await cfRes.json();
        if (!cfData.success) return { status: 403, body: { success: false, error: 'Verificación de bot fallida.' } };

        if (!deviceId || deviceId === 'unknown_device') return { status: 403, body: { success: false, error: 'Dispositivo no verificado.' } };

        // 🔥 BLINDAJE 4: Quitamos runRetentionAudit() del login para evitar cuellos de botella y baneos de API.

        let { data: dbUser, error: queryError } = await supabase.from('users').select('*').eq('id', targetId).maybeSingle();
        if (queryError) return { status: 500, body: { success: false, error: 'Error de conexión con la base de datos.' } };
        if (dbUser && dbUser.is_banned) return { status: 403, body: { success: false, error: 'Cuenta suspendida.' } };

        const { data: firstDeviceOwner } = await supabase.from('users').select('id').eq('device_id', deviceId).order('created_at', { ascending: true }).limit(1).maybeSingle();

        if (firstDeviceOwner && String(firstDeviceOwner.id) !== targetId && !ADMIN_IDS.includes(String(targetId))) {
            notifyAdmin(`🚨 <b>BLOQUEO DE MULTICUENTA</b>\nEl usuario <code>${targetId}</code> intentó entrar al dispositivo de <code>${firstDeviceOwner.id}</code>.`);
            return { status: 403, body: { success: false, error: 'Acceso bloqueado: Dispositivo vinculado a otra cuenta.' } };
        }

        // 🔥 BLINDAJE 2: Control estricto de Errores de Registro y Race Conditions
        if (!dbUser) {
            const newUserObj = { 
                id: targetId, username: targetUser.username, balance: 0, deposit_balance: 0, 
                total_earnings: 0, referral_earnings: 0, is_human: true, 
                device_id: deviceId, // 🔥 BLINDAJE 3: Solo se inserta una vez
                last_ip: clientIp 
            };
            if (start_param && String(start_param) !== targetId) {
                const { data: inviter } = await supabase.from('users').select('id').eq('id', String(start_param)).maybeSingle();
                if (inviter) newUserObj.referred_by = String(start_param);
            }
            
            const { data: newUser, error: insertError } = await supabase.from('users').insert([newUserObj]).select().single();
            
            if (insertError) {
                // Manejo de carrera: si otro hilo lo creó milisegundos antes
                if (insertError.code === '23505') {
                    const { data: existingUser } = await supabase.from('users').select('*').eq('id', targetId).single();
                    dbUser = existingUser;
                } else {
                    return { status: 500, body: { success: false, error: `Fallo crítico de registro: ${insertError.message}` } };
                }
            } else {
                dbUser = newUser;
            }
        } else {
            // 🔥 BLINDAJE 3: No sobreescribir el device_id, solo actualizamos datos volátiles
            await supabase.from('users').update({ last_ip: clientIp, username: targetUser.username }).eq('id', targetId);
        }

        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId);
        
        return { 
            status: 200, 
            body: { 
                success: true, 
                user: dbUser, 
                stats: { n1: refCount || 0, c1: String(dbUser?.referral_earnings || 0) },
                mandatory: { c1_url, c2_url, c1_joined, c2_joined, all_joined: (c1_joined && c2_joined) } 
            } 
        };
    }

    if (action === 'claim-gigapub-daily') {
        const { data: result, error: rpcError } = await supabase.rpc('claim_daily_checkin', { 
            p_user_id: targetId,
            p_date_start: startOfTodayUTC()
        });

        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD: ${rpcError.message}` } };
        if (!result || result.ok !== true) {
            return { status: 400, body: { success: false, error: result?.error || 'No se pudo reclamar el bono.' } };
        }
        
        return { status: 200, body: { success: true, earned_gemas: (result.earned * 1000).toFixed(2), balance: result.balance } };
    }

    return null; 
}
