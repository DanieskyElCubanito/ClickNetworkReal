import { supabase } from '../utils/supabase.js';

// Canje de códigos promo. La lógica atómica (validar, sumar, registrar) vive en la función SQL redeem_promo_code.
export async function handlePromoActions(action, targetId, reqBody) {
  if (action !== 'redeem-promo') return null;

  const code = String(reqBody?.code || '').trim().toUpperCase().slice(0, 40);
  if (!code) return { status: 400, body: { success: false, error: 'Escribe un código.' } };

  const { data, error } = await supabase.rpc('redeem_promo_code', { p_user_id: String(targetId), p_code: code });
  if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
  if (!data || data.ok !== true) {
    return { status: 400, body: { success: false, error: (data && data.error) || 'No se pudo canjear el código.' } };
  }
  return { status: 200, body: { success: true, reward: Number(data.reward) } };
}