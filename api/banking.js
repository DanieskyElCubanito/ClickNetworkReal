import { supabase } from '../utils/supabase.js';

// Paquetes de depósito: precio en TON que paga el usuario -> crédito que recibe.
// El crédito SIEMPRE sale de esta tabla, nunca de lo que envíe el cliente.
// Clave = precio con 4 decimales. Ejemplo: '1.0000': { credit: 1.5 },
// Rellénala con tus precios reales. Mientras esté vacía, los depósitos se rechazan.
const DEPOSIT_PACKAGES = {};

// Destino del barrido de la wallet de depósito (la dirección que ya usabas).
const SWEEP_ADDRESS = 'UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk';

const priceKey = (n) => Number(n).toFixed(4);

export async function handleBankingActions(action, targetId, reqBody) {
    const id = String(targetId);

    if (action === 'request-withdrawal') {
        const { address } = reqBody;
        const withdrawAmount = Number(reqBody.amount);

        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle();
        const dynamicMin = Number(config?.min_withdrawal || 0.05);
        if (!address || !Number.isFinite(withdrawAmount) || withdrawAmount < dynamicMin) {
            return { status: 400, body: { success: false, error: `Mínimo de retiro: ${dynamicMin * 1000} Gemas.` } };
        }

        const todayDate = new Date(); todayDate.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', id).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', id).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString());

        if ((refCount || 0) < 5 && (adsCount || 0) < 5) {
            return { status: 400, body: { success: false, error: 'Requisito: 5 referidos activos O ver 5 anuncios web.' } };
        }

        const { data: wUser, error: wError } = await supabase.from('users').select('id, saved_wallet').eq('id', id).maybeSingle();
        if (wError) return { status: 500, body: { success: false, error: `Fallo BD (Users): ${wError.message}` } };
        if (!wUser) return { status: 400, body: { success: false, error: 'Usuario no encontrado.' } };

        if (!wUser.saved_wallet) {
            const { data: existingWallet, error: exError } = await supabase.from('users').select('id').eq('saved_wallet', address).maybeSingle();
            if (exError) return { status: 500, body: { success: false, error: `Fallo BD (Wallet): ${exError.message}` } };
            if (existingWallet && String(existingWallet.id) !== id) {
                await supabase.from('users').update({ is_banned: true }).eq('id', id);
                return { status: 403, body: { success: false, error: 'Wallet usada en otra cuenta. Multi-cuentas detectado.' } };
            }
        }

        // Saldo, baneo, billetera, descuento, registro y log: todo en una sola transacción en la base de datos.
        const { data: result, error: rpcError } = await supabase.rpc('request_withdrawal', {
            p_user_id: id, p_amount: withdrawAmount, p_address: address,
        });
        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD (Retiro): ${rpcError.message}` } };
        if (!result?.ok) return { status: result?.status || 400, body: { success: false, error: result?.error || 'No se pudo registrar el retiro.' } };

        return { status: 200, body: { success: true, balance: result.balance, saved_wallet: address, message: 'Retiro en revisión administrativa.' } };
    }

    if (action === 'get-withdrawal-reqs') {
        const todayStr = new Date(); todayStr.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', id).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', id).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString());

        const { data: u } = await supabase.from('users').select('saved_wallet').eq('id', id).maybeSingle();
        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle();

        return { status: 200, body: { success: true, referrals: refCount || 0, ads: adsCount || 0, saved_wallet: u?.saved_wallet || null, min_withdrawal: config?.min_withdrawal || 0.05 } };
    }

    if (action === 'generate-payment-wallet') {
        const pkg = DEPOSIT_PACKAGES[priceKey(reqBody.price)];
        if (!pkg) return { status: 400, body: { success: false, error: 'Paquete de depósito no válido.' } };

        const { mnemonicNew, mnemonicToPrivateKey, WalletContractV4 } = await import('../utils/blockchain.js');
        const mnemonics = await mnemonicNew();
        const keyPair = await mnemonicToPrivateKey(mnemonics);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
        const encryptedKey = (await import('../utils/security.js')).encryptText(mnemonics.join(' '));

        const { data: newIntent, error } = await supabase.from('payment_intents').insert([{
            user_id: id, expected_amount: Number(reqBody.price), public_wallet: publicAddress,
            encrypted_private_key: encryptedKey, status: 'pending',
        }]).select().single();
        if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
        return { status: 200, body: { success: true, wallet: publicAddress, intentId: newIntent.id } };
    }

    if (action === 'verify-crypto-payment') {
        const { intentId } = reqBody;
        const { data: intent, error: iError } = await supabase.from('payment_intents').select('*')
            .eq('id', intentId).eq('user_id', id).eq('status', 'pending').maybeSingle();
        if (iError) return { status: 500, body: { success: false, error: `Fallo BD (Pago): ${iError.message}` } };
        if (!intent) return { status: 400, body: { success: false, error: 'No procesado.' } };

        const pkg = DEPOSIT_PACKAGES[priceKey(intent.expected_amount)];
        if (!pkg) return { status: 400, body: { success: false, error: 'Paquete de depósito no válido.' } };
        const credit = Number(pkg.credit);

        // 1. Reclamar el pago: solo una petición puede procesarlo a la vez.
        const { data: claimed, error: cError } = await supabase.rpc('claim_payment_intent', { p_intent_id: String(intent.id), p_user_id: id });
        if (cError) return { status: 500, body: { success: false, error: `Fallo BD (Reclamar): ${cError.message}` } };
        if (!claimed) return { status: 400, body: { success: false, error: 'Este pago ya se está procesando.' } };

        // 2. Comprobar la blockchain y barrer los fondos. Si algo falla, el pago vuelve a pendiente y NO se acredita.
        try {
            const { tonClient, mnemonicToPrivateKey, WalletContractV4, internal } = await import('../utils/blockchain.js');
            const balanceNano = await tonClient.getBalance(intent.public_wallet);
            if (Number(balanceNano) / 1e9 < Number(intent.expected_amount)) {
                await supabase.rpc('release_payment_intent', { p_intent_id: String(intent.id) });
                return { status: 400, body: { success: false, error: 'Saldo insuficiente en blockchain.' } };
            }

            const { decryptText } = await import('../utils/security.js');
            const secretWords = decryptText(intent.encrypted_private_key);
            const keyPair = await mnemonicToPrivateKey(secretWords.split(' '));
            const contract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
            const seqno = await contract.getSeqno();
            await contract.sendTransfer({
                seqno: seqno || 0, secretKey: keyPair.secretKey,
                messages: [internal({ to: SWEEP_ADDRESS, value: 0n, bounce: false, body: 'Barrido' })],
                sendMode: 128,
            });
        } catch (e) {
            await supabase.rpc('release_payment_intent', { p_intent_id: String(intent.id) });
            return { status: 500, body: { success: false, error: `No se pudo verificar o barrer el pago: ${e.message}` } };
        }

        // 3. Acreditar el crédito de la tabla (no el del cliente), una sola vez.
        const { data: done, error: fError } = await supabase.rpc('finish_payment_intent', {
            p_intent_id: String(intent.id), p_user_id: id, p_credit: credit,
        });
        if (fError || !done?.ok) {
            // El pago ya está en la blockchain y no acreditado: queda 'processing' para revisarlo a mano.
            return { status: 500, body: { success: false, error: `Pago ${intent.id} recibido pero no acreditado: ${fError?.message || done?.error}` } };
        }

        // 4. Aviso al canal de pagos (un fallo aquí no afecta al saldo, pero se registra).
        try {
            const { data: dbUser } = await supabase.from('users').select('username').eq('id', id).maybeSingle();
            const { data: config } = await supabase.from('system_settings').select('payment_channel_id').eq('id', 1).maybeSingle();
            const payChannel = config?.payment_channel_id;

            if (payChannel) {
                const usernameDisplay = dbUser?.username && dbUser.username !== 'Usuario' ? `@${dbUser.username}` : `ID: ${id}`;
                const message = `🚀 <b>NUEVA INYECCIÓN DE LIQUIDEZ TÁCTICA</b>\n\n` +
                    `👤 <b>Anunciante:</b> ${usernameDisplay}\n` +
                    `💰 <b>Suministro:</b> $${credit.toFixed(2)} USDT\n` +
                    `🛡️ <b>Blockchain:</b> GRAM (TON)\n` +
                    `⚡ <b>Estado:</b> Bóveda Cargada y Operativa\n\n` +
                    `🔥 ¡La red publicitaria se expande! ¿Listo para dominar Telegram con tus propias campañas?`;
                const keyboard = { inline_keyboard: [[{ text: '🚀 ¡LANZAR MI CAMPAÑA AHORA!', url: 'https://t.me/TeleGemAds_bot/app', style: 'primary' }]] };

                const tgReq = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: payChannel, text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true }),
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