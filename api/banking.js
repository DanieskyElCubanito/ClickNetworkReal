import { supabase } from '../utils/supabase.js';
import { getDerivedUsdtWallet, sweepUsdtAutomated } from '../utils/blockchain.js';

export async function handleBankingActions(action, targetId, reqBody) {
    if (action === 'request-withdrawal') {
        const { address, amount } = reqBody;
        let withdrawAmount = Number(amount);

        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).single();
        const dynamicMin = Number(config?.min_withdrawal || 0.05); 
        if (!address || withdrawAmount < dynamicMin) return { status: 400, body: { success: false, error: `Mínimo de retiro: ${dynamicMin * 1000} Gemas.` } };

        const todayDate = new Date(); todayDate.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayDate.toISOString());

        if ((refCount || 0) < 5 && (adsCount || 0) < 5) return { status: 400, body: { success: false, error: `Requisito: 5 referidos activos O ver 5 anuncios web.` } };

        const { data: wUser } = await supabase.from('users').select('balance, saved_wallet').eq('id', targetId).single();
        if (!wUser) return { status: 400, body: { success: false, error: 'Usuario no encontrado.' } };

        if (wUser.saved_wallet && wUser.saved_wallet !== address) {
             return { status: 400, body: { success: false, error: 'No puedes cambiar la billetera vinculada a esta cuenta.' } };
        }
        
        if (!wUser.saved_wallet) {
            const { data: existingWallet } = await supabase.from('users').select('id').eq('saved_wallet', address).single();
            if (existingWallet && existingWallet.id !== targetId) {
                 await supabase.from('users').update({ is_banned: true }).eq('id', targetId);
                 return { status: 403, body: { success: false, error: 'Wallet usada en otra cuenta. Multi-cuentas detectado.' } };
            }
        }

        if (Number(wUser.balance) < withdrawAmount) return { status: 400, body: { success: false, error: 'Saldo insuficiente.' } };

        const newBalance = Number((Number(wUser.balance) - withdrawAmount).toFixed(4));
        await supabase.from('users').update({ balance: newBalance, saved_wallet: address }).eq('id', targetId);

        const { data: withdrawal, error: withdrawError } = await supabase.from('withdrawals').insert([{ user_id: targetId, wallet_address: address, amount: withdrawAmount, status: 'pending' }]).select().single();
        if (withdrawError) return { status: 400, body: { success: false, error: `Error en BD.` } };

        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📤 Retiro En Revisión', description: `Destino: ${address.substring(0,8)}... | -${(withdrawAmount * 1000).toFixed(2)} Gemas`, amount: -withdrawAmount }]);
        return { status: 200, body: { success: true, balance: newBalance, saved_wallet: address, message: 'Retiro en revisión administrativa.' } };
    }

        if (action === 'get-withdrawal-reqs') {
        const todayStr = new Date(); todayStr.setUTCHours(0, 0, 0, 0);
        const { count: refCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', targetId).gte('total_earnings', 0.005);
        const { count: adsCount } = await supabase.from('history_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetId).like('description', '%[AdView]%').gte('created_at', todayStr.toISOString());
        
        const { data: u } = await supabase.from('users').select('saved_wallet').eq('id', targetId).single();
        const { data: config } = await supabase.from('system_settings').select('min_withdrawal').eq('id', 1).single();
        
        return { status: 200, body: { success: true, referrals: refCount || 0, ads: adsCount || 0, saved_wallet: u?.saved_wallet || null, min_withdrawal: config?.min_withdrawal || 0.05 } };
    }


    if (action === 'generate-payment-wallet') {
      const { mnemonicNew, mnemonicToPrivateKey, WalletContractV4 } = await import('../utils/blockchain.js');
      const mnemonics = await mnemonicNew(); 
      const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const publicAddress = wallet.address.toString({ urlSafe: true, bounceable: false });
      const encryptedKey = (await import('../utils/security.js')).encryptText(mnemonics.join(" "));
      
      const { data: newIntent } = await supabase.from('payment_intents').insert([{ user_id: targetId, expected_amount: Number(reqBody.price), public_wallet: publicAddress, encrypted_private_key: encryptedKey, status: 'pending' }]).select().single();
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

      const { data: dbUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      const newDepositBalance = Number((Number(dbUser.deposit_balance || 0) + clicks).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newDepositBalance }).eq('id', targetId);
      await supabase.from('payment_intents').update({ status: 'completed' }).eq('id', intentId);
      
      return { status: 200, body: { success: true, deposit_balance: newDepositBalance } };
    }

    return null;
}
