import crypto from 'crypto';
import { ethers } from 'ethers';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { supabase } from '../../../utils/supabase.js';
import { encryptText } from '../../../utils/security.js';

// Redes y monedas permitidas (Evita combinaciones inválidas como DOGE en red TON)
const ALLOWED_PAIRS = {
    BSC: ['USDT', 'BNB', 'BUSD'],
    BEP20: ['USDT', 'BNB', 'BUSD'],
    TON: ['TON', 'GRAM', 'USDT'],
    GRAM: ['GRAM', 'TON'],
    TRON: ['USDT', 'TRX'],
    TRC20: ['USDT', 'TRX'],
    DOGE: ['DOGE'],
    DOGECOIN: ['DOGE']
};

// Comparación en tiempo constante real a nivel de bytes (Previene Timing Attacks)
function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// Hash SHA-256 para comparar API Keys sin exponerlas
function sha256(str) {
    return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// Protección contra SSRF: Bloquea localhost e IPs privadas en los webhooks
function isSafeWebhookUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        if (u.protocol !== 'https:') return false;
        const host = u.hostname.toLowerCase();
        if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '0.0.0.0' ||
            host === '[::1]' ||
            host.endsWith('.local') ||
            host.endsWith('.internal') ||
            /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(host)
        ) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawApiKey = req.headers['x-api-key'] || body.apiKey;
    const { currency, network, orderId, webhookUrl } = body;
    const amount = Number(body.amount);

    if (typeof rawApiKey !== 'string' || rawApiKey.trim().length < 16) {
        return res.status(401).json({ success: false, error: 'API Key requerida o formato inválido' });
    }
    const apiKey = rawApiKey.trim();

    // Validación estricta de tipos y límites
    const cleanOrderId = String(orderId ?? '').trim();
    if (
        typeof currency !== 'string' || !currency.trim() ||
        typeof network !== 'string' || !network.trim() ||
        !cleanOrderId || cleanOrderId.length > 128 ||
        !Number.isFinite(amount) || amount <= 0 || amount > 1000000
    ) {
        return res.status(400).json({ success: false, error: 'Parámetros inválidos (currency, network, orderId, amount)' });
    }

    const net = network.trim().toUpperCase();
    const cur = currency.trim().toUpperCase();

    if (!ALLOWED_PAIRS[net] || !ALLOWED_PAIRS[net].includes(cur)) {
        return res.status(400).json({ success: false, error: `Par ${cur} en red ${net} no soportado` });
    }

    if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== '') {
        if (typeof webhookUrl !== 'string' || !isSafeWebhookUrl(webhookUrl)) {
            return res.status(400).json({ success: false, error: 'webhookUrl debe ser una URL HTTPS pública válida' });
        }
    }

    try {
        // 1. Autenticar al Merchant (Soporta api_key_hash SHA-256 o api_key clásica verificada en memoria)
        const keyHash = sha256(apiKey);
        const { data: merchant, error: authError } = await supabase
            .from('merchants')
            .select('id, api_key')
            .or(`api_key.eq.${keyHash},api_key.eq.${apiKey}`)
            .maybeSingle();

        if (authError || !merchant) {
            return res.status(401).json({ success: false, error: 'API Key inválida' });
        }

        // Verificación en tiempo constante (contra texto plano o contra hash guardado)
        const isValidPlain = timingSafeCompare(merchant.api_key, apiKey);
        const isValidHash = timingSafeCompare(merchant.api_key, keyHash);
        if (!isValidPlain && !isValidHash) {
            return res.status(401).json({ success: false, error: 'API Key inválida' });
        }

        // 2. Idempotencia: Si ya existe una factura PENDING y no expirada para este merchant + orderId, devolverla
        const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id, order_id, network, currency, expected_amount, deposit_address, status, expires_at')
            .eq('merchant_id', merchant.id)
            .eq('order_id', cleanOrderId)
            .eq('status', 'PENDING')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (existingInvoice) {
            return res.status(200).json({
                success: true,
                result: {
                    invoice_id: existingInvoice.id,
                    order_id: existingInvoice.order_id,
                    network: existingInvoice.network,
                    currency: existingInvoice.currency,
                    amount: Number(existingInvoice.expected_amount),
                    address: existingInvoice.deposit_address,
                    status: existingInvoice.status,
                    expires_at: existingInvoice.expires_at
                }
            });
        }

        // 3. Generación de Wallet por red
        let address = '';
        let rawPrivateKey = '';

        if (net === 'BSC' || net === 'BEP20') {
            const wallet = ethers.Wallet.createRandom();
            address = wallet.address;
            rawPrivateKey = wallet.privateKey;
        } else if (net === 'TON' || net === 'GRAM') {
            const { WalletContractV4 } = await import('@ton/ton');
            const mnemonic = await mnemonicNew();
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
            address = wallet.address.toString({ urlSafe: true, bounceable: false });
            rawPrivateKey = mnemonic.join(' ');
        } else if (net === 'TRON' || net === 'TRC20') {
            try {
                const { default: TronWeb } = await import('tronweb');
                const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
                const account = await tronWeb.createAccount();
                address = account.address.base58;
                rawPrivateKey = account.privateKey;
            } catch {
                return res.status(501).json({ success: false, error: 'Red TRON temporalmente deshabilitada en este nodo' });
            }
        } else if (net === 'DOGE' || net === 'DOGECOIN') {
            try {
                const doge = await import('bitcore-lib-doge');
                const PrivateKey = doge.PrivateKey || doge.default?.PrivateKey;
                const privateKey = new PrivateKey();
                address = privateKey.toAddress().toString();
                rawPrivateKey = privateKey.toString();
            } catch {
                return res.status(501).json({ success: false, error: 'Red DOGE temporalmente deshabilitada en este nodo' });
            }
        }

        // 4. Cifrado (Si ENCRYPTION_KEY no está configurada en Vercel, encryptText debe fallar cerrado)
        const encryptedKey = encryptText(rawPrivateKey);
        if (!encryptedKey) {
            throw new Error('Fallo crítico en el módulo de cifrado.');
        }

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // 5. Guardar la Factura en Supabase
        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert([{
                merchant_id: merchant.id,
                order_id: cleanOrderId,
                network: net,
                currency: cur,
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
                order_id: cleanOrderId,
                network: net,
                currency: cur,
                amount: amount,
                address: address,
                status: 'PENDING',
                expires_at: expiresAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Error en invoice/create:', error.message);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
}
