import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { encryptText } from '../../../utils/security.js'; // Ajustado al archivo de seguridad que usas

// 🔥 BLINDAJE: Usa SUPABASE_SERVICE_ROLE_KEY (la que de verdad tiene Vercel)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función utilitaria para evitar "Timing Attacks" comparando contraseñas/APIKeys.
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function handler(req, res) {
    // 1. Configuración CORS universal
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const apiKey = req.headers['x-api-key'] || body.apiKey;
    const { currency, network, orderId } = body;
    const webhookUrl = body.webhookUrl;
    const amount = Number(body.amount);

    if (!apiKey) return res.status(401).json({ success: false, error: 'API Key requerida' });

    if (
        typeof currency !== 'string' || !currency ||
        typeof network !== 'string' || !network ||
        !orderId ||
        !Number.isFinite(amount) || amount <= 0
    ) {
        return res.status(400).json({ success: false, error: 'Parámetros inválidos' });
    }

    if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== '') {
        let validUrl = false;
        try { validUrl = new URL(webhookUrl).protocol === 'https:'; } catch { validUrl = false; }
        if (!validUrl) return res.status(400).json({ success: false, error: 'webhookUrl debe ser https' });
    }

    try {
        // 3. Autenticar al Merchant
        const { data: merchant, error: authError } = await supabase
            .from('merchants')
            .select('id, api_key')
            .eq('api_key', apiKey)
            .single();

        if (authError || !merchant || !safeCompare(merchant.api_key, apiKey)) {
            return res.status(401).json({ success: false, error: 'API Key inválida' });
        }

        // 4. Generación de Wallet por red
        let address = '';
        let rawPrivateKey = '';
        const net = network.toUpperCase();

        if (net === 'BSC' || net === 'BEP20') {
            const wallet = ethers.Wallet.createRandom();
            address = wallet.address;
            rawPrivateKey = wallet.privateKey;
        }
        else if (net === 'TON' || net === 'GRAM') {
            const { WalletContractV4 } = await import('@ton/ton');
            const mnemonic = await mnemonicNew();
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
            address = wallet.address.toString({ bounceable: false });
            rawPrivateKey = mnemonic.join(" ");
        }
        else if (net === 'TRON' || net === 'TRC20') {
             try {
                const { default: TronWeb } = await import('tronweb');
                const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
                const account = await tronWeb.createAccount();
                address = account.address.base58;
                rawPrivateKey = account.privateKey;
             } catch (e) {
                 return res.status(501).json({ success: false, error: 'Módulo tronweb no instalado en servidor' });
             }
        }
        else if (net === 'DOGE' || net === 'DOGECOIN') {
             try {
                const doge = await import('bitcore-lib-doge');
                const privateKey = new doge.PrivateKey();
                address = privateKey.toAddress().toString();
                rawPrivateKey = privateKey.toString();
             } catch (e) {
                 return res.status(501).json({ success: false, error: 'Módulo bitcore-lib-doge no instalado' });
             }
        }
        else {
            return res.status(400).json({ success: false, error: 'Red blockchain no soportada' });
        }

        // 5. Cifrado
        const encryptedKey = encryptText(rawPrivateKey);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); 

        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert([{
                merchant_id: merchant.id,
                order_id: orderId,
                network: net,
                currency: currency.toUpperCase(),
                expected_amount: amount,
                deposit_address: address,
                encrypted_private_key: encryptedKey, 
                status: 'PENDING',
                webhook_url: webhookUrl || null,
                expires_at: expiresAt.toISOString()
            }])
            .select('id')
            .single();

        if (insertError) throw insertError;

        return res.status(200).json({
            success: true,
            result: {
                invoice_id: invoice.id,
                order_id: orderId,
                network: net,
                currency: currency.toUpperCase(),
                amount: amount,
                address: address,
                status: 'PENDING',
                expires_at: expiresAt.toISOString()
            }
        });
    } catch (error) {
        console.error("Error en invoice/create:", error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
}
