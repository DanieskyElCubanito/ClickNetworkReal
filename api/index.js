const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');
const { TonClient, WalletContractV5R1, toNano, internal } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");

const app = express();

// Configuración de CORS para evitar bloqueos del navegador
app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DE VARIABLES
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TON_RPC = "https://toncenter.com/api/v2/jsonRPC";
const TON_API_KEY = "f8c2008d8ba557465e49df5bdd98eb987ef639a5ffabca82203c6d6f6b802fb5";

const REWARDS = { level1: 0.003, level2: 0.002, level3: 0.001 };

// --- RUTA: VERIFICACIÓN Y MULTINIVEL ---
app.post('/api/verify', async (req, res) => {
  try {
    const { user, start_param } = req.body;
    if (!user || !user.id) return res.status(400).json({ success: false, error: 'No user data' });

    // A. Verificar Membresía
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${user.id}`;
    const tgRes = await axios.get(tgUrl);
    const status = tgRes.data.result?.status;
    const isMember = ['member', 'administrator', 'creator'].includes(status);

    if (!isMember) return res.json({ success: false, error: 'NOT_MEMBER' });

    // B. Registro / Multinivel
    const { data: existingUser } = await supabase.from('users').select('*').eq('id', user.id).single();

    if (!existingUser) {
      const referrerId = start_param ? parseInt(start_param) : null;
      await supabase.from('users').insert([{
        id: user.id,
        username: user.username || 'user',
        referred_by: referrerId,
        balance: 0,
        is_verified: true
      }]);

      if (referrerId) {
        await supabase.rpc('increment_balance', { user_id: referrerId, amount: REWARDS.level1 });
        const { data: p1 } = await supabase.from('users').select('referred_by').eq('id', referrerId).single();
        if (p1?.referred_by) {
          await supabase.rpc('increment_balance', { user_id: p1.referred_by, amount: REWARDS.level2 });
          const { data: p2 } = await supabase.from('users').select('referred_by').eq('id', p1.referred_by).single();
          if (p2?.referred_by) await supabase.rpc('increment_balance', { user_id: p2.referred_by, amount: REWARDS.level3 });
        }
      }
    }
    
    const { data: finalUser } = await supabase.from('users').select('*').eq('id', user.id).single();
    return res.json({ success: true, user: finalUser });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- RUTA: RETIRO AUTOMÁTICO ---
app.post('/api/withdraw', async (req, res) => {
  try {
    const { userId, address } = req.body;
    const MNEMONIC = process.env.ADMIN_MNEMONIC;

    if (!MNEMONIC) throw new Error("Falta ADMIN_MNEMONIC en Vercel");

    const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (!user || user.balance < 0.1) return res.json({ success: false, error: 'Balance insuficiente' });

    // Lógica TON
    const client = new TonClient({ endpoint: TON_RPC, apiKey: TON_API_KEY });
    const keyPair = await mnemonicToPrivateKey(MNEMONIC.trim().split(/\s+/));
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);
    
    const seqno = await contract.getSeqno();
    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      sendMode: 3,
      messages: [internal({ to: address, value: toNano("0.1"), bounce: false, body: "IA Profit Payout" })]
    });

    await supabase.rpc('decrement_balance', { user_id: userId, amount: 0.1 });
    await supabase.from('withdrawals').insert([{ user_id: userId, amount: 0.1, status: 'completed' }]);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// IMPORTANTE PARA VERCEL
module.exports = app;
