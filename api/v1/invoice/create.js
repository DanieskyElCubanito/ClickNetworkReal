import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
const TronWeb = require('tronweb');
const doge = require('bitcore-lib-doge');
import { encryptKey } from '../../../utils/encryption'; // Ajusta la ruta a donde guardaste encryption.js

// Inicializar Supabase con tu Service Role Key para tener permisos de escritura segura
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // 1. Configuración CORS universal para Mini Apps y Bots
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    // 2. Leer el cuerpo con seguridad (puede venir vacío o no ser un objeto)
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Soporta recibir la API Key en los headers (más seguro) o en el body
    const apiKey = req.headers['x-api-key'] || body.apiKey;
    const { currency, network, orderId } = body;
    const webhookUrl = body.webhookUrl;
    const amount = Number(body.amount);

    if (!apiKey) return res.status(401).json({ success: false, error: 'API Key de Kuba Pay requerida' });

    // Validar parámetros: amount debe ser un número finito y mayor que 0
    if (
        typeof currency !== 'string' || !currency ||
        typeof network !== 'string' || !network ||
        !orderId ||
        !Number.isFinite(amount) || amount <= 0
    ) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros o amount no válido: currency, network, amount (mayor que 0), orderId' });
    }

    // Validar webhookUrl: si viene, debe ser una URL https válida
    if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== '') {
        let validUrl = false;
        try {
            validUrl = typeof webhookUrl === 'string' && new URL(webhookUrl).protocol === 'https:';
        } catch {
            validUrl = false;
        }
        if (!validUrl) {
            return res.status(400).json({ success: false, error: 'webhookUrl debe ser una URL https válida' });
        }
    }

    try {
        // 3. Autenticar al Merchant (Cliente)
        const { data: merchant, error: authError } = await supabase
            .from('merchants')
            .select('id')
            .eq('api_key', apiKey)
            .single();

        if (authError || !merchant) {
            return res.status(401).json({ success: false, error: 'API Key inválida o no registrada' });
        }

        // 4. Generación dinámica de la Wallet según la Red
        let address = '';
        let rawPrivateKey = '';
        const net = network.toUpperCase();

        if (net === 'BSC' || net === 'BEP20') {
            const wallet = ethers.Wallet.createRandom();
            address = wallet.address;
            rawPrivateKey = wallet.privateKey;
        }
        else if (net === 'TRON' || net === 'TRC20') {
            const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
            const account = await tronWeb.createAccount();
            address = account.address.base58;
            rawPrivateKey = account.privateKey;
        }
        else if (net === 'TON' || net === 'GRAM') {
            const mnemonic = await mnemonicNew();
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
            address = wallet.address.toString({ bounceable: false }); // Fundamental para depósitos
            rawPrivateKey = mnemonic.join(" ");
        }
        else if (net === 'DOGE' || net === 'DOGECOIN') {
            const privateKey = new doge.PrivateKey();
            address = privateKey.toAddress().toString();
            rawPrivateKey = privateKey.toString();
        }
        else {
            return res.status(400).json({ success: false, error: 'Red blockchain no soportada' });
        }

        // 5. Cifrado de la Clave Privada
        const encryptedKey = encryptKey(rawPrivateKey);

        // 6. Guardar la Factura (Invoice) en Supabase
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Expira en 1 hora

        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert([{
                merchant_id: merchant.id,
                order_id: orderId,
                network: net,
                currency: currency.toUpperCase(),
                expected_amount: amount,
                deposit_address: address,
                encrypted_private_key: encryptedKey, // Se guarda cifrada, nunca en texto plano
                status: 'PENDING',
                webhook_url: webhookUrl || null,
                expires_at: expiresAt.toISOString()
            }])
            .select('id')
            .single();

        if (insertError) throw insertError;

        // 7. Respuesta exitosa
        return res.status(200).json({
            success: true,
            result: {
                invoice_id: invoice.id,        // ID interno de Kuba Pay
                order_id: orderId,             // El ID que mandó el desarrollador
                network: net,
                currency: currency.toUpperCase(),
                amount: amount,
                address: address,              // La dirección pública para depositar
                status: 'PENDING',
                expires_at: expiresAt.toISOString()
            }
        });

    } catch (error) {
        console.error("Error interno en Kuba Pay /invoice/create:", error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al procesar la orden.' });
    }
}