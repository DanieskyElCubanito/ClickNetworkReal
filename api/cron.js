import { createClient } from '@supabase/supabase-js';

// Conexión segura a Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAIN_ADMIN_ID = '8968109534'; // ID de la cuenta que recibirá los reenvíos de auditoría silenciosa

export default async function handler(req, res) {
  // 1. Seguridad: Verificar que la petición viene del sistema Cron de Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  try {
    // 2. Buscar contratos activos cuyo tiempo haya expirado
    const { data: expiredContracts, error } = await supabase
      .from('ad_contracts')
      .select('*')
      .eq('status', 'active')
      .lte('end_time', new Date().toISOString());

    if (error || !expiredContracts || expiredContracts.length === 0) {
      return res.status(200).json({ success: true, message: 'No hay contratos por procesar.' });
    }

    let processedCount = 0;
    let fraudCount = 0;

    // 3. Evaluar cada contrato uno por uno
    for (const contract of expiredContracts) {
      const { id, channel_owner_id, advertiser_id, chat_id, message_id, price } = contract;
      
      // Costo original que pagó el anunciante (Precio + 20% comisión de la plataforma)
      const refundAmount = Number((Number(price) * 1.20).toFixed(4));
      
      // Auditoría: Intentar reenviar el mensaje a tu chat de admin para ver si aún existe
      const verifyRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: MAIN_ADMIN_ID,
          from_chat_id: chat_id,
          message_id: message_id,
          disable_notification: true // Para que no te suene el celular a cada rato
        })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.ok) {
        // ✅ CUMPLIÓ: El mensaje sigue ahí tras 24 horas. Pagamos al dueño del canal.
        const { data: owner } = await supabase.from('users').select('balance, total_earnings').eq('id', channel_owner_id).single();
        if (owner) {
          const newBal = Number((Number(owner.balance || 0) + Number(price)).toFixed(4));
          const newTot = Number((Number(owner.total_earnings || 0) + Number(price)).toFixed(4));
          await supabase.from('users').update({ balance: newBal, total_earnings: newTot }).eq('id', channel_owner_id);
          await supabase.from('history_logs').insert([{ 
            user_id: channel_owner_id, 
            title: '💸 Contrato Completado', 
            description: `Pago liberado por publicación en ${chat_id}.`, 
            amount: Number(price) 
          }]);
        }
        await supabase.from('ad_contracts').update({ status: 'completed' }).eq('id', id);
        processedCount++;

      } else {
        // ❌ FRAUDE: El mensaje fue borrado antes de tiempo. Reembolsamos al anunciante.
        const { data: advertiser } = await supabase.from('users').select('balance').eq('id', advertiser_id).single();
        if (advertiser) {
          const refundBal = Number((Number(advertiser.balance || 0) + refundAmount).toFixed(4));
          await supabase.from('users').update({ balance: refundBal }).eq('id', advertiser_id);
          await supabase.from('history_logs').insert([{ 
            user_id: advertiser_id, 
            title: '🛡️ Reembolso por Fraude', 
            description: `El canal ${chat_id} borró el anuncio. Se te ha devuelto el dinero.`, 
            amount: refundAmount 
          }]);
        }
        
        // Penalización al canal (Bajar el rating)
        const { data: canal } = await supabase.from('marketplace_canales').select('rating').eq('chat_id', chat_id).single();
        if (canal) {
          const newRating = Math.max(0, Number(canal.rating) - 1.5); // Le quita 1.5 estrellas por borrar el anuncio
          await supabase.from('marketplace_canales').update({ rating: newRating }).eq('chat_id', chat_id);
        }

        await supabase.from('ad_contracts').update({ status: 'refunded' }).eq('id', id);
        fraudCount++;
      }
    }

    return res.status(200).json({ success: true, processed: processedCount, frauds: fraudCount });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
