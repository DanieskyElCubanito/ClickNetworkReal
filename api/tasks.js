import { supabase } from '../utils/supabase.js';
import { extractTelegramUsername, checkMembership, checkAdminStatusDetailed, ADMIN_IDS } from '../utils/telegram.js';

const isAdminCaller = (uid) => ADMIN_IDS.includes(String(uid));

const toPositive = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const round4 = (n) => Number(n.toFixed(4));

const AD_DAILY_GOAL = 5;
const AD_TITLE = '📺 Anuncio Visto';
const AD_DESC = 'Visualización para retiro [AdView] | sin recompensa';

const CHECKED_TYPES = ['group', 'channel', 'partner'];

const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

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
                verified: checked,
                verification: checked ? 'membership_checked' : 'not_verified',
            };
        });
        return { status: 200, body: { success: true, tasks: mappedTasks } };
    }

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
      const cleanUrl = String(url || '').trim();
      
      const count = completions_total === undefined || completions_total === null ? 100 : Number(completions_total);
      if (!Number.isInteger(count) || count <= 0) return { status: 400, body: { success: false, error: 'Los cupos deben ser un entero mayor que 0.' } };
      
      const rew = reward === undefined || reward === null ? 0.001 : toPositive(reward);
      if (rew === null) return { status: 400, body: { success: false, error: 'La recompensa debe ser mayor que 0.' } };
      
      const totalCost = round4(count * rew * 1.30);
      if (!(totalCost > 0)) return { status: 400, body: { success: false, error: 'Costo de campaña inválido.' } };

      // 🔥 BLINDAJE: Validación estricta de bots
      if (type === 'bot' && !cleanUrl.toLowerCase().includes('bot')) {
        return { status: 400, body: { success: false, error: 'Las URLs de Bots deben contener la palabra "bot".' } };
      }

      // 🔥 BLINDAJE: Validación de permisos administrativos para canales y grupos
      if (CHECKED_TYPES.includes(type)) {
        const chatId = extractTelegramUsername(cleanUrl);
        if (!chatId) return { status: 400, body: { success: false, error: 'Enlace de Telegram inválido.' } };
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (!adminCheck.isAdmin) return { status: 400, body: { success: false, error: adminCheck.error } };
      }

      const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).maybeSingle();
      if (!cUser || Number(cUser.deposit_balance) < totalCost) return { status: 400, body: { success: false, error: 'Bóveda insuficiente.' } };

      const debit = await moveVault(targetId, cUser.deposit_balance, -totalCost);
      if (!debit.ok) return { status: 409, body: { success: false, error: debit.error } };

      const { data: newTask, error } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url: cleanUrl, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active', validation_code: validation_code || null }]).select().single();
      if (error) {
        const back = await moveVault(targetId, debit.newBalance, totalCost);
        if (!back.ok) return { status: 500, body: { success: false, error: 'Fallo BD. No se pudo devolver el cobro a tu bóveda: avisa al soporte.' } };
        return { status: 400, body: { success: false, error: `Fallo BD.` } };
      }
      return { status: 200, body: { success: true, task: newTask, deposit_balance: debit.newBalance } };
    }

    if (action === 'watch-ad-progress') {
        // 🔥 BLINDAJE: Delegamos a la transacción atómica
        const { data: result, error: rpcError } = await supabase.rpc('register_ad_view', {
            p_user_id: targetId,
            p_max_ads: AD_DAILY_GOAL,
            p_title: AD_TITLE,
            p_desc: AD_DESC,
            p_date_start: startOfTodayUTC()
        });

        if (rpcError) return { status: 500, body: { success: false, error: `Fallo BD: ${rpcError.message}` } };
        if (!result || result.ok !== true) {
            return { status: 400, body: { success: false, error: result?.error || 'No se pudo registrar la visita.', ads: result?.ads } };
        }
        
        return { status: 200, body: { success: true, ads: result.ads, goal: result.goal } };
    }

    if (action === 'toggle-task-status') {
      const { taskId } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task || (String(task.creator_id) !== targetId && !isAdminCaller(targetId))) return { status: 400, body: { success: false, error: 'Sin permisos o tarea no encontrada.' } };
      if (!['active', 'paused'].includes(task.status)) return { status: 400, body: { success: false, error: 'Esta misión ya no se puede pausar.' } };
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) return { status: 500, body: { success: false, error: `Fallo BD: ${error.message}` } };
      return { status: 200, body: { success: true, status: newStatus } };
    }

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

      let charged = null;
      if (netCost !== 0) {
        const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).maybeSingle();
        if (!cUser) return { status: 400, body: { success: false, error: 'Creador de la misión no encontrado.' } };
        if (netCost > 0 && Number(cUser.deposit_balance) < netCost) return { status: 400, body: { success: false, error: 'Saldo de Bóveda insuficiente para este ajuste.' } };
        charged = await moveVault(task.creator_id, cUser.deposit_balance, -netCost);
        if (!charged.ok) return { status: 409, body: { success: false, error: charged.error } };
      }

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
