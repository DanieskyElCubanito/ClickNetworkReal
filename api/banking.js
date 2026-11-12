import { supabase } from '../utils/supabase.js';
import { BOT_TOKEN, notifyAdmin } from '../utils/telegram.js';

const FALLBACK_SWEEP_ADDRESS = 'UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk';

const round4 = (n) => Number(Number(n).toFixed(4));

const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function handleBankingActions(action, targetId, reqBody) {
    const id = String(targetId || '').trim();
    if (!id) return { status: 401, body: { success: false, error: 'Identidad no verificada.' } };

    if (action === 'request-withdrawal') {
        const cleanAddress = String(reqBody?.address || '').trim();
        const withdrawAmount = Number(reqBody?.amount);

        // 1. Validación estricta de formato de dirección y monto
        if (!cleanAddress || cleanAddress.length < 20 || cleanAddress.length > 128 || /\s/.test(cleanAddress)) {
            return { status: 400, body: { success: false, error: 'Dirección de billetera inválida.' } };
        }

        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle();
        const dynamicMin = Number(config?.min_withdrawal || 0.05);

        if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0 || withdrawAmount < dynamicMin) {
            return { status: 400, body: { success: false, error: `Mínimo de retiro: ${(dynamicMin * 1000).toFixed(0)} Gemas.` } };
        }

        // 2. Requisitos diarios (5 referidos activos O 5 anuncios vistos hoy)
        const todayDate = new Date();
        todayDate.setUTCHours(0, 0, 0, 0);

        const [{ count: refCount, error: refErr }, { count: adsCount, error: adsErr }] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', id).gte('total_earnings', 0.005),
            supabase.from('history_logs').select('id', { count: 'exact', head: true }).eq('user_id', id).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString())
        ]);

        if (refErr || adsErr) {
            return { status: 500, body: { success: false, error: 'Error al verificar requisitos de retiro.' } };
        }

        if ((refCount || 0) < 5 && (adsCount || 0) < 5) {
            return { status: 400, body: { success: false, error: 'Requisito: 5 referidos activos O ver 5 anuncios web.' } };
        }

        // 3. Verificación del usuario y bloqueo de cambio de billetera
        const { data: wUser, error: wError } = await supabase.from('users').select('id, saved_wallet, is_banned').eq('id', id).maybeSingle();
        if (wError) return { status: 500, body: { success: false, error: `Fallo BD (Users): ${wError.message}` } };
        if (!wUser) return { status: 400, body: { success: false, error: 'Usuario no encontrado.' } };
        if (wUser.is_banned) return { status: 403, body: { success: false, error: 'Cuenta suspendida.' } };

        if (wUser.saved_wallet && String(wUser.saved_wallet).trim() !== cleanAddress) {
            return { status: 400, body: { success: false, error: 'Por seguridad, no puedes cambiar la billetera vinculada a esta cuenta.' } };
        }

        // 🔥 BLINDAJE 1: Comprobación SIEMPRE activa contra otras cuentas (tenga o no saved_wallet previa)
        const { data: existingWalletUsers, error: exError } = await supabase
            .from('users')
            .select('id')
            .eq('saved_wallet', cleanAddress)
            .neq('id', id)
            .limit(1);

        if (exError) return { status: 500, body: { success: false, error: `Fallo BD (Wallet): ${exError.message}` } };

        if (existingWalletUsers && existingWalletUsers.length > 0) {
            await supabase.from('users').update({ is_banned: true }).eq('id', id);
            notifyAdmin(`🚨 <b>BANEO POR WALLET DUPLICADA</b>\nUsuario <code>${id}</code> intentó retirar a la wallet <code>${escapeHtml(cleanAddress)}</code> que ya pertenece a <code>${existingWalletUsers[0].id}</code>.`);
            return { status: 403, body: { success: false, error: 'Wallet usada en otra cuenta. Multi-cuentas detectado.' } };
        }

        // 4. Transacción atómica en PostgreSQL
        const { data: result, error: rpcError } = await supabase.rpc('request_withdrawal', {
            p_user_id: id,
            p_amount: round4(withdrawAmount),
            p_address: cleanAddress
        });

        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD (Retiro): ${rpcError.message}` } };
        if (!result?.ok) return { status: result?.status || 400, body: { success: false, error: result?.error || 'No se pudo registrar el retiro.' } };

        return {
            status: 200,
            body: {
                success: true,
                balance: result.balance,
                saved_wallet: cleanAddress,
                message: 'Retiro en revisión administrativa.'
            }
        };
    }

    if (action === 'get-withdrawal-reqs') {
        const todayStr = new Date();
        todayStr.setUTCHours(0, 0, 0, 0);

        const [{ count: refCount }, { count: adsCount }, { data: u }, { data: config }] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', id).gte('total_earnings', 0.005),
            supabase.from('history_logs').select('id', { count: 'exact', head: true }).eq('user_id', id).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString()),
            supabase.from('users').select('saved_wallet').eq('id', id).maybeSingle(),
            supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle()
        ]);

        return {
            status: 200,
            body: {
                success: true,
                referrals: refCount || 0,
                ads: adsCount || 0,
                saved_wallet: u?.saved_wallet || null,
                min_withdrawal: config?.min_withdrawal || 0.05
            }
        };
    }

    if (action === 'generate-payment-wallet') {
        // 🔥 BLINDAJE 2: Validación estricta del monto ANTES de generar claves o insertar en BD
        const expectedAmt = Number(reqBody?.price);
        if (!Number.isFinite(expectedAmt) || expectedAmt < 0.01 || expectedAmt > 100000) {
            return { status: 400, body: { success: false, error: 'Monto de depósito inválido (mínimo 0.01).' } };
        }

        const { mnemonicNew, mnemonicToPrivateKey, WalletContractV4 } = await import('../utils/blockchain.js');
        const { encryptText } = await import('../utils/security.js');

        const mnemonics = await mnemonicNew();
        const keyPair = await mnemonicToPrivateKey(mnemonics);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
        const encryptedKey = encryptText(mnemonics.join(' '));

        if (!encryptedKey) {
            return { status: 500, body: { success: false, error: 'Fallo crítico al cifrar la billetera temporal.' } };
        }

        const { data: newIntent, error } = await supabase
            .from('payment_intents')
            .insert([{
                user_id: id,
                expected_amount: round4(expectedAmt),
                public_wallet: publicAddress,
                encrypted_private_key: encryptedKey,
                status: 'pending'
            }])
            .select('id')
            .single();

        if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
        return { status: 200, body: { success: true, wallet: publicAddress, intentId: newIntent.id } };
    }

    if (action === 'verify-crypto-payment') {
        const intentId = String(reqBody?.intentId || '').trim();
        if (!intentId) return { status: 400, body: { success: false, error: 'ID de pago requerido.' } };

        const { data: intent, error: iError } = await supabase
            .from('payment_intents')
            .select('*')
            .eq('id', intentId)
            .eq('user_id', id)
            .eq('status', 'pending')
            .maybeSingle();

        if (iError) return { status: 500, body: { success: false, error: `Fallo BD (Pago): ${iError.message}` } };
        if (!intent) return { status: 400, body: { success: false, error: 'Orden de pago no encontrada o ya procesada.' } };

        const expectedTon = Number(intent.expected_amount);
        if (!Number.isFinite(expectedTon) || expectedTon <= 0) {
            return { status: 400, body: { success: false, error: 'Monto esperado inválido en la orden.' } };
        }

        // 1. Reserva atómica del intent (pending -> processing)
        const { data: claimed, error: cError } = await supabase.rpc('claim_payment_intent', {
            p_intent_id: String(intent.id),
            p_user_id: id
        });
        if (cError) return { status: 500, body: { success: false, error: `Fallo BD (Reclamar): ${cError.message}` } };
        if (!claimed) return { status: 409, body: { success: false, error: 'Este pago ya se está procesando.' } };

        // 2. Comprobación del saldo real en la blockchain TON (con tolerancia mínima por precisión decimal)
        let blockchainData;
        let receivedTon = 0;
        try {
            const { tonClient, mnemonicToPrivateKey, WalletContractV4, internal } = await import('../utils/blockchain.js');
            const balanceNano = await tonClient.getBalance(intent.public_wallet);
            receivedTon = Number(balanceNano) / 1e9;

            if (receivedTon + 1e-6 < expectedTon) {
                await supabase.rpc('release_payment_intent', { p_intent_id: String(intent.id) });
                return {
                    status: 400,
                    body: {
                        success: false,
                        error: `Saldo insuficiente en blockchain (${receivedTon.toFixed(4)} / ${expectedTon.toFixed(4)} TON).`
                    }
                };
            }
            blockchainData = { tonClient, mnemonicToPrivateKey, WalletContractV4, internal };
        } catch (e) {
            await supabase.rpc('release_payment_intent', { p_intent_id: String(intent.id) });
            return { status: 502, body: { success: false, error: `Error de verificación en nodo TON: ${e.message}` } };
        }

        const creditAmount = round4(expectedTon);

        // 3. Acreditación atómica en BD ANTES de barrer los fondos
        const { data: done, error: fError } = await supabase.rpc('finish_payment_intent', {
            p_intent_id: String(intent.id),
            p_user_id: id,
            p_credit: creditAmount
        });

        if (fError || !done?.ok) {
            await supabase.rpc('release_payment_intent', { p_intent_id: String(intent.id) });
            return { status: 500, body: { success: false, error: `Error al acreditar fondos en BD: ${fError?.message || done?.error}` } };
        }

        // 4. Obtención de billetera maestra y barrido seguro hacia la bóveda principal
        const { data: config } = await supabase
            .from('system_settings')
            .select('master_wallet_gram, payment_channel_id')
            .eq('id', 1)
            .maybeSingle();

        const targetSweepAddress = config?.master_wallet_gram?.trim() || FALLBACK_SWEEP_ADDRESS;

        try {
            const { decryptText } = await import('../utils/security.js');
            const secretWords = decryptText(intent.encrypted_private_key);
            const keyPair = await blockchainData.mnemonicToPrivateKey(secretWords.trim().split(/\s+/));
            const contract = blockchainData.tonClient.open(
                blockchainData.WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
            );
            const seqno = await contract.getSeqno();
            await contract.sendTransfer({
                seqno: seqno || 0,
                secretKey: keyPair.secretKey,
                messages: [blockchainData.internal({ to: targetSweepAddress, value: 0n, bounce: false, body: 'Barrido' })],
                sendMode: 128
            });
        } catch (sweepError) {
            // 🔥 BLINDAJE 4: Si el barrido falla, avisa por Telegram al Admin para no dejar TON atrapados
            const errMsg = sweepError?.message || String(sweepError);
            console.error(`Pago acreditado a usuario ${id}, pero barrido falló:`, errMsg);
            notifyAdmin(
                `⚠️ <b>BARRIDO PENDIENTE EN DEPÓSITO</b>\n` +
                `Intent ID: <code>${intent.id}</code>\n` +
                `Usuario: <code>${id}</code>\n` +
                `Wallet temporal: <code>${intent.public_wallet}</code>\n` +
                `Monto: ${receivedTon.toFixed(4)} TON\n` +
                `Error: <code>${escapeHtml(errMsg)}</code>`
            );
        }

        // 5. Notificación al canal de pagos configurado en el panel
        try {
            const payChannel = config?.payment_channel_id?.trim();
            if (payChannel && BOT_TOKEN) {
                const { data: dbUser } = await supabase.from('users').select('username').eq('id', id).maybeSingle();
                const usernameDisplay = dbUser?.username && dbUser.username !== 'Usuario'
                    ? `@${escapeHtml(dbUser.username)}`
                    : `ID: ${escapeHtml(id)}`;

                const message =
                    `🚀 <b>NUEVA INYECCIÓN DE LIQUIDEZ TÁCTICA</b>\n\n` +
                    `👤 <b>Anunciante:</b> ${usernameDisplay}\n` +
                    `💰 <b>Suministro Bóveda:</b> +$${creditAmount.toFixed(2)} (${receivedTon.toFixed(4)} TON)\n` +
                    `🛡️ <b>Red:</b> Toncoin (TON)\n` +
                    `⚡ <b>Estado:</b> Bóveda Cargada y Operativa\n\n` +
                    `🔥 ¡La red publicitaria se expande! ¿Listo para dominar Telegram con tus propias campañas?`;

                const keyboard = { inline_keyboard: [[{ text: '🚀 ¡LANZAR MI CAMPAÑA AHORA!', url: 'https://t.me/TeleGemAds_bot/app' }]] };

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
                if (!tgReq.ok) console.error('Fallo enviando notificación a Telegram (Depósito):', await tgReq.text());
            }
        } catch (errLog) {
            console.error('Error crítico al notificar depósito:', errLog.message);
        }

        return { status: 200, body: { success: true, deposit_balance: done.deposit_balance } };
    }

    return null;
}
