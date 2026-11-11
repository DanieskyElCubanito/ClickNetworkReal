import { supabase } from '../utils/supabase.js';
import { extractTelegramUsername, checkMembership, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

// targetId llega de index.js y es SIEMPRE el id de la firma de Telegram (nunca del cuerpo).
const isAdminCaller = (uid) => ADMIN_IDS.includes(String(uid));

// Número > 0 o null: rechaza negativos, cero y basura.
const toPositive = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const round4 = (n) => Number(n.toFixed(4));

// Anuncios: NO dan recompensa. Solo cuentan para el objetivo diario de 5 (requisito de retiro).
const AD_DAILY_GOAL = 5;
const AD_TITLE = '📺 Anuncio Visto';
const AD_DESC = 'Visualización para retiro [AdView] | sin recompensa';

// Tipos de misión que el servidor SÍ comprueba (pertenencia a canal/grupo/socio).
const CHECKED_TYPES = ['group', 'channel', 'partner'];

const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

// Anuncios registrados hoy (UTC). Devuelve null si la base falla (no se adivina).
async function adViewsToday(userId) {
  const { count, error } = await supabase
    .from('history_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('title', AD_TITLE)
    .like('description', '%[AdView]%')
    .gte('created_at', startOfTodayUTC());
  if (error) return null;
  return count || 0;
}

// Mueve la bóveda (deposit_balance) con bloqueo optimista: solo escribe si el saldo
// sigue siendo el que se leyó. Así dos peticiones a la vez no gastan el mismo saldo dos veces.
async function moveVault(userId, expected, delta) {
  const current = Number(expected || 0);
  const next = round4(current + delta);
  if (!(next >= 0)) return { ok: false, error: 'Saldo de Bóveda insuficiente.' };
  const { data, error } = await supabase
    .from('users')
    .update({ deposit_balance: next })
    .eq('id', userId)
    .eq('deposit_balance', current)
    .select('id');
  if (error) return { ok: false, error: `Fallo BD: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Tu saldo cambió mientras se procesaba. Inténtalo de nuevo.' };
  return { ok: true, newBalance: next };
}

export async function handleTaskActions(action, targetId, reqBody) {
    if (action === 'get-tasks') {
        const { data: allTasks } = await supabase.from('tasks').select('*').or(`status.in.(active,paused),creator_id.eq.${targetId}`).order('created_at', { ascending: false });
        const { data: completedRows } = await supabase.from('user_completed_tasks').select('task_id').eq('user_id', targetId);
        const completedIds = new Set((completedRows || []).map(r => String(r.task_id)));

        const mappedTasks = (allTasks || []).map(t => {
            const checked = CHECKED_TYPES.includes(t.type);
            return {
                ...t,
                reward: (t.reward || 1),
                is_completed: completedIds.has(String(t.id)),
                // Honestidad: la app debe mostrar «Sin verificar» cuando verified es false.
                verified: checked,
                verification: checked ? 'membership_checked' : 'not_verified',
            };
        });
        return { status: 200, body: { success: true, tasks: mappedTasks } };
    }

    // COBRO: aquí se comprueba la misión; el cobro (cupo, registro único, saldo del usuario,
    // contador y comisión del referidor) lo hace la función complete_task de la base en UNA transacción.
    if (action === 'complete-task') {
        const { taskId, validation_code_input } = reqBody;

        const { data: task } = await supabase.from('tasks').select('id, type, url, status, creator_id, validation_code').eq('id', taskId).maybeSingle();
        if (!task || task.status !== 'active') return { status: 400, body: { success: false, error: 'Misión inactiva o finalizada.' } };
        if (String(task.creator_id) === targetId) return { status: 400, body: { success: false, error: 'No puedes cobrar tu propia misión.' } };

        if (task.validation_code && String(task.validation_code).trim() !== String(validation_code_input || '').trim()) {
            return { status: 400, body: { success: false, error: 'Código de validación incorrecto.' } };
        }

        if (CHECKED_TYPES.includes(task.type)) {
            const chatId = extractTelegramUsername(task.url || '');
            if (!chatId || !(await checkMembership(targetId, chatId))) {
                return { status: 400, body: { success: false, error: 'No detectamos tu membresía en el canal. Únete para reclamar.' } };
            }
        }

        const { data: result, error: rpcError } = await supabase.rpc('complete_task', { p_task_id: String(task.id), p_user_id: targetId });
        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD: ${rpcError.message}` } };
        if (!result || result.ok !== true) {
            return { status: 400, body: { success: false, error: (result && result.error) || 'No se pudo completar la misión.' } };
        }
        return { status: 200, body: { success: true, reward: result.reward, balance: result.balance } };
    }

    if (action === 'create-task') {
      const { type, title, url, bot_token, completions_total, reward, validation_code } = reqBody;
      const count = completions_total === undefined || completions_total === null ? 100 : Number(completions_total);
      if (!Number.isInteger(count) || count <= 0) return { status: 400, body: { success: false, error: 'Los cupos deben ser un número entero mayor que 0.' } };
      const rew = reward === undefined || reward === null ? 0.001 : toPositive(reward);
      if (rew === null) return { status: 400, body: { success: false, error: 'La recompensa debe ser mayor que 0.' } };
      const totalCost = round4(count * rew * 1.30);
      if (!(totalCost > 0)) return { status: 400, body: { success: false, error: 'Costo de campaña inválido.' } };

      const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).maybeSingle();
      if (!cUser || Number(cUser.deposit_balance) < totalCost) return { status: 400, body: { success: false, error: 'Bóveda insuficiente.' } };

      const debit = await moveVault(targetId, cUser.deposit_balance, -totalCost);
      if (!debit.ok) return { status: 409, body: { success: false, error: debit.error } };

      const { data: newTask, error } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active', validation_code: validation_code || null }]).select().single();
      if (error) {
        const back = await moveVault(targetId, debit.newBalance, totalCost);
        if (!back.ok) return { status: 500, body: { success: false, error: 'Fallo BD. No se pudo devolver el cobro a tu bóveda: avisa al soporte.' } };
        return { status: 400, body: { success: false, error: `Fallo BD.` } };
      }
      return { status: 200, body: { success: true, task: newTask, deposit_balance: debit.newBalance } };
    }

    // ANUNCIO: solo registra la visualización. NO toca el saldo. Máximo 5 al día (objetivo diario).
    if (action === 'watch-ad-progress') {
        const { data: dbUser } = await supabase.from('users').select('id').eq('id', targetId).maybeSingle();
        if (!dbUser) return { status: 404, body: { success: false, error: 'Usuario no encontrado. Vuelve a abrir la app.' } };

        const before = await adViewsToday(targetId);
        if (before === null) return { status: 500, body: { success: false, error: 'No se pudieron leer tus anuncios de hoy. Inténtalo de nuevo.' } };
        if (before >= AD_DAILY_GOAL) return { status: 400, body: { success: false, error: 'Ya registraste los 5 anuncios de hoy.', ads: before } };

        const { error } = await supabase.from('history_logs').insert([{ user_id: targetId, title: AD_TITLE, description: AD_DESC, amount: 0 }]);
        if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
        return { status: 200, body: { success: true, ads: before + 1, goal: AD_DAILY_GOAL } };
    }

    // PAUSAR / ACTIVAR: solo el creador (id verificado).
    if (action === 'toggle-task-status') {
      const { taskId } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task || String(task.creator_id) !== targetId) return { status: 400, body: { success: false, error: 'Sin permisos o tarea no encontrada.' } };
      if (!['active', 'paused'].includes(task.status)) return { status: 400, body: { success: false, error: 'Esta misión ya no se puede pausar.' } };
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
      return { status: 200, body: { success: true, status: newStatus } };
    }

    // ELIMINAR: el creador o un admin (id verificado). Primero borra la misión y después devuelve lo no usado,
    // así no se puede reembolsar dos veces si el borrado falla.
    if (action === 'delete-task') {
      const { taskId } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return { status: 400, body: { success: false, error: 'Misión no encontrada.' } };
      if (String(task.creator_id) !== targetId && !isAdminCaller(targetId)) return { status: 403, body: { success: false, error: 'Sin permisos.' } };

      const { data: deleted, error: delError } = await supabase.from('tasks').delete().eq('id', taskId).select('id');
      if (delError) return { status: 500, body: { success: false, error: `Fallo BD: ${delError.message}` } };
      if (!deleted || deleted.length === 0) return { status: 409, body: { success: false, error: 'La misión ya fue eliminada.' } };

      const remainingCompletions = Number(task.completions_total) - Number(task.completions_done || 0);
      if (remainingCompletions > 0) {
        const refundAmount = round4(remainingCompletions * Number(task.reward) * 1.30);
        const { data: user } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).maybeSingle();
        if (!user) return { status: 500, body: { success: false, error: 'Misión eliminada, pero el creador no existe: reembolso pendiente de revisión.' } };
        const back = await moveVault(task.creator_id, user.deposit_balance, refundAmount);
        if (!back.ok) return { status: 500, body: { success: false, error: `Misión eliminada, pero el reembolso falló: ${back.error}` } };
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: '💰 Reembolso', description: `Cancelación de campaña. +$${refundAmount.toFixed(2)} USDT`, amount: 0 }]);
      }
      return { status: 200, body: { success: true } };
    }

    // EDITAR: el creador o un admin (id verificado).
    if (action === 'edit-task') {
      const { taskId, newTitle, newUrl, addCompletions, newReward } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return { status: 400, body: { success: false, error: 'Misión no encontrada.' } };
      if (String(task.creator_id) !== targetId && !isAdminCaller(targetId)) return { status: 403, body: { success: false, error: 'Sin permisos.' } };

      const url = String(newUrl ?? task.url ?? '').trim();
      const title = String(newTitle ?? task.title ?? '').trim();

      if (task.type === 'bot' && !url.toLowerCase().includes('bot')) {
        return { status: 400, body: { success: false, error: 'Las URLs de Bots deben contener la palabra "bot".' } };
      }

      if (CHECKED_TYPES.includes(task.type) && url !== task.url) {
        const chatId = extractTelegramUsername(url);
        if (!chatId) return { status: 400, body: { success: false, error: 'Enlace de Telegram inválido.' } };
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (!adminCheck.isAdmin) return { status: 400, body: { success: false, error: adminCheck.error } };
      }

      const updates = { title, url };
      let netCost = 0;
      const remainingCompletions = Number(task.completions_total) - Number(task.completions_done || 0);

      if (newReward !== undefined && newReward !== null && newReward !== '') {
        const rew = toPositive(newReward);
        if (rew === null) return { status: 400, body: { success: false, error: 'La recompensa debe ser mayor que 0.' } };
        if (rew !== Number(task.reward) && remainingCompletions > 0) {
          netCost += (remainingCompletions * rew * 1.30) - (remainingCompletions * Number(task.reward) * 1.30);
          updates.reward = rew;
        }
      }

      if (addCompletions !== undefined && addCompletions !== null && addCompletions !== '') {
        const add = Number(addCompletions);
        if (!Number.isInteger(add) || add < 0) return { status: 400, body: { success: false, error: 'Los cupos a añadir deben ser un entero mayor o igual a 0.' } };
        if (add > 0) {
          netCost += add * Number(updates.reward ?? task.reward) * 1.30;
          updates.completions_total = Number(task.completions_total) + add;
          updates.status = 'active';
        }
      }
      netCost = round4(netCost);

      // 1) Primero se cobra (con comprobación de saldo y bloqueo optimista). Solo después cambia la misión.
      //    Antes la misión cambiaba antes de comprobar el saldo: cupos gratis si la bóveda no alcanzaba.
      let charged = null;
      if (netCost !== 0) {
        const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).maybeSingle();
        if (!cUser) return { status: 400, body: { success: false, error: 'Creador de la misión no encontrado.' } };
        if (netCost > 0 && Number(cUser.deposit_balance) < netCost) return { status: 400, body: { success: false, error: 'Saldo de Bóveda insuficiente para este ajuste.' } };
        charged = await moveVault(task.creator_id, cUser.deposit_balance, -netCost);
        if (!charged.ok) return { status: 409, body: { success: false, error: charged.error } };
      }

      // 2) Después cambia la misión; si falla, se devuelve el cobro.
      const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (updateError) {
        if (charged) {
          const back = await moveVault(task.creator_id, charged.newBalance, netCost);
          if (!back.ok) return { status: 500, body: { success: false, error: 'Fallo BD. No se pudo devolver el cobro del ajuste: avisa al soporte.' } };
        }
        return { status: 400, body: { success: false, error: `Error interno: ${updateError.message}` } };
      }

      if (netCost !== 0) {
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: netCost > 0 ? '🔋 Ajuste de Campaña' : '💰 Reembolso', description: `Edición táctica de la misión`, amount: -netCost }]);
      }

      return { status: 200, body: { success: true } };
    }

    return null;
}