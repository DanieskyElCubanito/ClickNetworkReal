const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const { TonClient, WalletContractV5R1, toNano, internal } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");

const app = express();
app.use(cors());
app.use(express.json());

/* --- CONFIGURACIÓN --- */
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID; 
const ADMIN_ID = "7517815832"; // Tu ID personal para alertas privadas
const PAYMENTS_CHANNEL = "-1002352835078"; // Solo para comprobantes de pago públicos
const TON_RPC = "https://toncenter.com/api/v2/jsonRPC";
const TON_API_KEY = "f8c2008d8ba557465e49df5bdd98eb987ef639a5ffabca82203c6d6f6b802fb5";
const CLOUDFLARE_SECRET = process.env.CLOUDFLARE_SECRET;

const REWARDS = { level1: 0.03, level2: 0.02, level3: 0.01 };
const WITHDRAW_FIXED = 0.1; 
const COOLDOWN_MS = 60 * 60 * 1000; 

/* --- FUNCIONES AUXILIARES --- */
async function verifyTurnstile(token) {
  try {
    if (!CLOUDFLARE_SECRET) return false;
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      `secret=${CLOUDFLARE_SECRET}&response=${token}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.success;
  } catch (e) { return false; }
}

// Modificado para enviarte los baneos a tu chat privado
async function notifyAdmin(adminMsg) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: ADMIN_ID, // Enviado a tu ID directamente
      text: adminMsg,
      parse_mode: 'HTML'
    });
  } catch (e) { console.error("Error notifyAdmin"); }
}

/* --- [ENDPOINT VERIFY: SOLO SEGURIDAD TÉCNICA] --- */
app.post('/api/verify', async (req, res) => {
  try {
    const { user, start_param } = req.body;
    if (!user || !user.id) return res.status(400).json({ success: false });

    // 1. Identificación de dispositivo (IP + Navegador)
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers['user-agent'] || "unknown";
    const deviceHash = crypto.createHash('md5').update(userIp + userAgent).digest('hex');

    // 2. Verificar existencia y baneo
    let { data: dbUser } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    if (dbUser?.is_banned) return res.json({ success: false, error: 'USER_BANNED' });

    // 3. Verificación de Canal (Obligatorio)
    let isMember = false;
    try {
        const tgRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${user.id}`);
        const status = tgRes.data.result?.status;
        isMember = ['member', 'administrator', 'creator'].includes(status);
    } catch (e) { isMember = false; }

    if (!isMember) return res.json({ success: false, error: 'NOT_MEMBER' });

    // 4. Lógica de Bloqueo y Registro
    if (!dbUser) {
      // Bloqueo Multicuenta (Mismo Dispositivo)
      const { data: hashExists } = await supabase.from('users').select('id').eq('device_hash', deviceHash).maybeSingle();
      if (hashExists) {
        await notifyAdmin(`🚫 <b>ALERTA MULTICUENTA</b>\n\n<b>Infractor:</b> <code>${user.id}</code>\n<b>Cuenta Original:</b> <code>${hashExists.id}</code>\n<b>Hash:</b> <code>${deviceHash}</code>`);
        return res.json({ success: false, error: 'USER_BANNED' });
      }

      // Filtro ProxyCheck (VPN/Bots)
      try {
          const pCheck = await axios.get(`https://proxycheck.io/v2/${userIp}?vpn=1`);
          if (pCheck.data[userIp]?.proxy === "yes") {
              await notifyAdmin(`🛡️ <b>VPN DETECTADA</b>\nID: <code>${user.id}</code> bloqueado por usar Proxy.`);
              return res.json({ success: false, error: 'USER_BANNED' });
          }
      } catch (e) { }

      // Registro nuevo
      const referrerId = start_param ? parseInt(start_param) : null;
      const validReferrer = (referrerId && referrerId !== user.id) ? referrerId : null;

      const { data: newUser, error: insErr } = await supabase.from('users').insert([{
        id: user.id,
        username: user.username || 'user',
        referred_by: validReferrer,
        balance: 0,
        device_hash: deviceHash,
        is_verified: true,
        is_banned: false
      }]).select().single();

      if (insErr) throw insErr;
      dbUser = newUser;

      // Pago de Referidos (3 Niveles)
      if (validReferrer) {
        await supabase.rpc('increment_balance', { user_id: validReferrer, amount: REWARDS.level1 });
        const { data: p1 } = await supabase.from('users').select('referred_by').eq('id', validReferrer).maybeSingle();
        if (p1?.referred_by) {
          await supabase.rpc('increment_balance', { user_id: p1.referred_by, amount: REWARDS.level2 });
          const { data: p2 } = await supabase.from('users').select('referred_by').eq('id', p1.referred_by).maybeSingle();
          if (p2?.referred_by) {
            await supabase.rpc('increment_balance', { user_id: p2.referred_by, amount: REWARDS.level3 });
          }
        }
      }
    } else if (!dbUser.device_hash) {
      // Actualizar hash a usuarios antiguos que no lo tengan
      await supabase.from('users').update({ device_hash: deviceHash }).eq('id', user.id);
    }

    // 5. Estadísticas de Referidos para el UI
    const { data: lvl1 } = await supabase.from('users').select('id').eq('referred_by', user.id);
    const idsL1 = lvl1 ? lvl1.map(u => u.id) : [];
    let idsL2 = []; if (idsL1.length > 0) {
      const { data: lvl2 } = await supabase.from('users').select('id').in('referred_by', idsL1);
      idsL2 = lvl2 ? lvl2.map(u => u.id) : [];
    }
    let idsL3 = []; if (idsL2.length > 0) {
      const { data: lvl3 } = await supabase.from('users').select('id').in('referred_by', idsL2);
      idsL3 = lvl3 ? lvl3.map(u => u.id) : [];
    }

    return res.json({ 
      success: true, 
      user: dbUser, 
      stats: { 
        n1: idsL1.length, n2: idsL2.length, n3: idsL3.length,
        c1: (idsL1.length * REWARDS.level1).toFixed(2),
        c2: (idsL2.length * REWARDS.level2).toFixed(2),
        c3: (idsL3.length * REWARDS.level3).toFixed(2)
      } 
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

/* --- [ENDPOINT WITHDRAW: ANTI-MULTICUENTA WALLET] --- */
app.post('/api/withdraw', async (req, res) => {
  try {
    const { userId, address, captchaToken } = req.body;
    const MNEMONIC = process.env.ADMIN_MNEMONIC;
    const cleanAddress = address.trim();

    if (!captchaToken || !(await verifyTurnstile(captchaToken))) {
        return res.json({ success: false, error: "Captcha inválido." });
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!user || user.is_banned || user.balance < WITHDRAW_FIXED) {
        return res.json({ success: false, error: "Acceso denegado." });
    }

    // Bloqueo de Wallet Duplicada
    const { data: walletDup } = await supabase.from('withdrawals').select('user_id').eq('address', cleanAddress).neq('user_id', userId).limit(1).maybeSingle();
    if (walletDup) {
      await supabase.from('users').update({ is_banned: true }).in('id', [userId, walletDup.user_id]);
      await notifyAdmin(`🚫 <b>FRAUDE WALLET</b>\nID: <code>${userId}</code> intentó usar la billetera de <code>${walletDup.user_id}</code>. Ambas cuentas baneadas.`);
      return res.json({ success: false, error: "Billetera vinculada a otra cuenta. Acceso revocado." });
    }

    // Lógica de Pago TON
    const client = new TonClient({ endpoint: TON_RPC, apiKey: TON_API_KEY });
    const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(/\s+/));
    const wallet = client.open(WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey }));
    
    const transfer = wallet.createTransfer({
      seqno: await wallet.getSeqno(),
      secretKey: keyPair.secretKey,
      sendMode: 3,
      messages: [internal({ to: cleanAddress, value: toNano(WITHDRAW_FIXED.toString()), bounce: false, body: "IA Profit Payout" })]
    });

    await wallet.send(transfer);
    const txHash = transfer.hash().toString('hex');

    await supabase.rpc('decrement_balance', { user_id: userId, amount: WITHDRAW_FIXED });
    await supabase.from('withdrawals').insert([{ user_id: userId, amount: WITHDRAW_FIXED, status: 'completed', tx_hash: txHash, address: cleanAddress }]);

    // Mensaje público de pago (solo este va al canal)
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: PAYMENTS_CHANNEL,
      text: `💎 <b>PAGO COMPLETADO</b>\n\nBeneficiario: <a href="tg://user?id=${user.id}">${user.username}</a>\nMonto: ${WITHDRAW_FIXED} TON\n\n<a href="https://tonscan.org/tx/${txHash}">Ver en Blockchain</a>`,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    return res.json({ success: true, txHash });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Error en red TON." });
  }
});

app.get('/api/history', async (req, res) => {
  const { userId } = req.query;
  const { data: history } = await supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  res.json({ success: true, history });
});

module.exports = app;
