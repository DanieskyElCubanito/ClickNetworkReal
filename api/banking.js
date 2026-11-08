import { supabase } from '../utils/supabase.js';

export async function handleBankingActions(action, targetId, reqBody) {
    if (action === 'request-withdrawal') {
        const { address, amount } = reqBody;
        let withdrawAmount = Number(amount);

        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle();
        const dynamicMin = Number(config?.min_withdrawal || 0.05); 
        if (!address || withdrawAmount < dynamicMin) return { status: 400, body: { success: false, error: `Mínimo de retiro: ${dynamicMin * 1000} Gemas.` } };

        const todayDate = new Date(); todayDate.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString());

        if ((refCount || 0) < 5 && (adsCount || 0) < 5) return { status: 400, body: { success: false, error: `Requisito: 5 referidos activos O ver 5 anuncios web.` } };

        const { data: wUser, error: wError } = await supabase.from('users').select('balance, saved_wallet').eq('id', targetId).maybeSingle();
        if (wError) return { status: 400, body: { success: false, error: `Fallo BD (Users): ${wError.message}` } };
        if (!wUser) return { status: 400, body: { success: false, error: 'Usuario no encontrado.' } };

        if (wUser.saved_wallet && wUser.saved_wallet !== address) {
             return { status: 400, body: { success: false, error: 'Por seguridad, no puedes cambiar la billetera vinculada a esta cuenta.' } };
        }
        
        if (!wUser.saved_wallet) {
            const { data: existingWallet, error: exError } = await supabase.from('users').select('id').eq('saved_wallet', address).maybeSingle();
            if (exError) return { status: 400, body: { success: false, error: `Fallo BD (Wallet): ${exError.message}` } };
            
            if (existingWallet && String(existingWallet.id) !== String(targetId)) {
                 await supabase.from('users').update({ is_banned: true }).eq('id', targetId);
                 return { status: 403, body: { success: false, error: 'Wallet usada en otra cuenta. Multi-cuentas detectado.' } };
            }
        }

        if (Number(wUser.balance) < withdrawAmount) return { status: 400, body: { success: false, error: 'Saldo insuficiente.' } };

        const newBalance = Number((Number(wUser.balance) - withdrawAmount).toFixed(4));
        await supabase.from('users').update({ balance: newBalance, saved_wallet: address }).eq('id', targetId);

        const { data: withdrawal, error: withdrawError } = await supabase.from('withdrawals').insert([{ user_id: targetId, wallet_address: address, amount: withdrawAmount, status: 'pending' }]).select().single();
        if (withdrawError) return { status: 400, body: { success: false, error: `Fallo BD (Retiro): ${withdrawError.message}` } };

        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📤 Retiro En Revisión', description: `Destino: ${address.substring(0,8)}... | -${(withdrawAmount * 1000).toFixed(2)} Gemas`, amount: -withdrawAmount }]);
        return { status: 200, body: { success: true, balance: newBalance, saved_wallet: address, message: 'Retiro en revisión administrativa.' } };
    }

    if (action === 'get-withdrawal-reqs') {
        const todayStr = new Date(); todayStr.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString());
        
        const { data: u } = await supabase.from('users').select('saved_wallet').eq('id', targetId).maybeSingle();
        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).maybeSingle();

        return { status: 200, body: { success: true, referrals: refCount || 0, ads: adsCount || 0, saved_wallet: u?.saved_wallet || null, min_withdrawal: config?.min_withdrawal || 0.05 } };
    }

    if (action === 'generate-payment-wallet') {
      const { mnemonicNew, mnemonicToPrivateKey, WalletContractV4 } = await import('../utils/blockchain.js');
      const mnemonics = await mnemonicNew(); 
      const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
      const encryptedKey = (await import('../utils/security.js')).encryptText(mnemonics.join(" "));
      
      const { data: newIntent, error } = await supabase.from('payment_intents').insert([{ user_id: targetId, expected_amount: Number(reqBody.price), public_wallet: publicAddress, encrypted_private_key: encryptedKey, status: 'pending' }]).select().single();
      if (error) return { status: 400, body: { success: false, error: `Fallo BD: ${error.message}` } };
      return { status: 200, body: { success: true, wallet: publicAddress, intentId: newIntent.id } };
    }

    if (action === 'verify-crypto-payment') {
      const { intentId, clicks } = reqBody; 
      const { data: intent } = await supabase.from('payment_intents').select('*').eq('id', intentId).eq('user_id', targetId).eq('status', 'pending').single();
      if (!intent) return { status: 400, body: { success: false, error: 'No procesado.' } };

      const { tonClient, mnemonicToPrivateKey, WalletContractV4, internal } = await import('../utils/blockchain.js');
      const balanceNano = await tonClient.getBalance(intent.public_wallet);
      if (Number(balanceNano) / 1e9 < intent.expected_amount) return { status: 400, body: { success: false, error: `Saldo insuficiente en blockchain.` } };
        
      try {
          const { decryptText } = await import('../utils/security.js');
          const secretWords = decryptText(intent.encrypted_private_key);
          const keyPair = await mnemonicToPrivateKey(secretWords.split(" "));
          const contract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
          const seqno = await contract.getSeqno();
          await contract.sendTransfer({ seqno: seqno || 0, secretKey: keyPair.secretKey, messages: [ internal({ to: "UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk", value: 0n, bounce: false, body: "Barrido" }) ], sendMode: 128 });
      } catch (e) {}

      const { data: dbUser } = await supabase.from('users').select('username, deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);
      
      // 🔥 NOTIFICACIÓN AL CANAL DE PAGOS (Depósitos)
      try {
          const { data: config } = await supabase.from('system_settings').select('payment_channel_id').eq('id', 1).maybeSingle();
          const payChannel = config?.payment_channel_id;

          if (payChannel) {
              const usernameDisplay = dbUser?.username && dbUser.username !== 'Usuario' ? `@${dbUser.username}` : `ID: ${targetId}`;
              const message = `🚀 <b>NUEVA INYECCIÓN DE LIQUIDEZ TÁCTICA</b>\n\n` +
                              `👤 <b>Anunciante:</b> ${usernameDisplay}\n` +
                              `💰 <b>Suministro:</b> $${Number(clicks).toFixed(2)} USDT\n` +
                              `🛡️ <b>Blockchain:</b> GRAM (TON)\n` +
                              `⚡ <b>Estado:</b> Bóveda Cargada y Operativa\n\n` +
                              `🔥 ¡La red publicitaria se expande! ¿Listo para dominar Telegram con tus propias campañas?`;

              const keyboard = { inline_keyboard: [[{ text: "🚀 ¡LANZAR MI CAMPAÑA AHORA!", url: "https://t.me/TeleGemAds_bot/app", style: "primary" }]] };
              
              const tgReq = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: payChannel, text: message, parse_mode: 'HTML', reply_markup: keyboard, disable_web_page_preview: true })
              });
              
              if(!tgReq.ok) {
                  const tgErr = await tgReq.text();
                  console.error("Fallo enviando notificación a Telegram (Depósito):", tgErr);
              }
          }
      } catch (errLog) {
          console.error("Error crítico al notificar depósito:", errLog.message);
      }
      
      return { status: 200, body: { success: true, deposit_balance: newDepositBalance } };
    }

    return null;
}
