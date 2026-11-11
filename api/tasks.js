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

export async function handleTaskActions(action, targetId, reqBody) {
    if (action === 'get-tasks') {
        const { data: allTasks } = await supabase.from('tasks').select('*').or(`status.in.(active,paused),creator_id.eq.${targetId}`).order('created_at', { ascending: false });
        const { data: completedRows } = await supabase.from('user_completed_tasks').select('task_id').eq('user_id', targetId);
        const completedIds = new Set((completedRows || []).map(r => String(r.task_id)));

        const mappedTasks = (allTasks || []).map(t => {
            return { ...t, reward: (t.reward || 1), is_completed: completedIds.has(String(t.id)) };
        });
        return { status: 200, body: { success: true, tasks: mappedTasks } };
    }

    if (action === 'complete-task') {
        const { taskId, validation_code_input } = reqBody;

        const { data: lastLog } = await supabase.from('history_logs').select('created_at').eq('user_id', targetId).eq('title', '✅ Tarea Completada').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastLog && (Date.now() - new Date(lastLog.created_at).getTime() < 1000)) {
            return { status: 400, body: { success: false, error: 'Procesando. Espera 1 segundo entre cada cobro.' } };
        }

        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
        if (!task || task.status !== 'active') return { status: 400, body: { success: false, error: 'Misión inactiva o finalizada.' } };
        if (String(task.creator_id) === targetId) return { status: 400, body: { success: false, error: 'No puedes cobrar tu propia misión.' } };

        if (task.validation_code && String(task.validation_code).trim() !== String(validation_code_input || '').trim()) {
            return { status: 400, body: { success: false, error: 'Código de validación incorrecto.' } };
        }

        const { data: alreadyDone } = await supabase.from('user_completed_tasks').select('id').eq('task_id', taskId).eq('user_id', targetId).maybeSingle();
        if (alreadyDone) return { status: 400, body: { success: false, error: 'Ya has completado esta misión.' } };

        if (['group', 'channel', 'partner'].includes(task.type)) {
            const chatId = extractTelegramUsername(task.url);
            if (!chatId || !(await checkMembership(targetId, chatId))) {
                return { status: 400, body: { success: false, error: 'No detectamos tu membresía en el canal. Únete para reclamar.' } };
            }
        }

        const { data: dbUser } = await supabase.from('users').select('balance, total_earnings, referred_by').eq('id', targetId).maybeSingle();
        if (!dbUser) return { status: 404, body: { success: false, error: 'Usuario no encontrado. Vuelve a abrir la app.' } };

        // Reclamo atómico: la fila (task_id, user_id) debe tener clave única en la base.
        // Si otra petición ya cobró, el insert choca (23505) y aquí no se paga nada.
        const { error: claimError } = await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);
        if (claimError) {
            if (claimError.code === '23505') return { status: 400, body: { success: false, error: 'Ya has completado esta misión.' } };
            return { status: 500, body: { success: false, error: `Fallo BD: ${claimError.message}` } };
        }

        const rewardAmount = Number(task.reward || 1);
        const newBalance = round4(Number(dbUser.balance || 0) + rewardAmount);
        const newTotal = round4(Number(dbUser.total_earnings || 0) + rewardAmount);

        const { error: creditError } = await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
        if (creditError) {
            await supabase.from('user_completed_tasks').delete().eq('task_id', taskId).eq('user_id', targetId);
            return { status: 500, body: { success: false, error: `Fallo BD al acreditar: ${creditError.message}` } };
        }
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '✅ Tarea Completada', description: `Campaña: "${task.title}" | +${(rewardAmount * 1000).toFixed(2)} Gemas`, amount: rewardAmount }]);

        if (dbUser.referred_by) {
            const { data: config } = await supabase.from('system_settings').select('ref_percent, ref_bonus_gemas').eq('id', 1).maybeSingle();
            const percent = config && config.ref_percent ? Number(config.ref_percent) / 100 : 0.10;
            const bonusUsdt = config && config.ref_bonus_gemas ? Number(config.ref_bonus_gemas) / 1000 : 0.005;

            const comm = round4(rewardAmount * percent);

            let extraBonusUsdt = 0;
            if (Number(dbUser.total_earnings || 0) < 0.005 && newTotal >= 0.005) {
                extraBonusUsdt = bonusUsdt;
            }

            const totalToReferrer = comm + extraBonusUsdt;

            const { data: ref } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
            if (ref && totalToReferrer > 0) {
               await supabase.from('users').update({ balance: round4(Number(ref.balance) + totalToReferrer), referral_earnings: round4(Number(ref.referral_earnings) + totalToReferrer) }).eq('id', ref.id);

               if (extraBonusUsdt > 0) {
                   await supabase.from('history_logs').insert([{ user_id: ref.id, title: '🎯 Recluta Validado', description: `Tu recluta se activó. Bono único pagado.`, amount: extraBonusUsdt }]);
               }
               if (comm > 0) {
                   await supabase.from('history_logs').insert([{ user_id: ref.id, title: '👥 Comisión de Red', description: `Misión de recluta (ID: ${targetId})`, amount: comm }]);
               }
            }
        }

        const newDoneCount = Number(task.completions_done || 0) + 1;
        await supabase.from('tasks').update({ completions_done: newDoneCount, status: (newDoneCount >= Number(task.completions_total)) ? 'completed' : 'active' }).eq('id', taskId);

        return { status: 200, body: { success: true, reward: rewardAmount, balance: newBalance } };
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

      const newVaultBalance = round4(Number(cUser.deposit_balance) - totalCost);
      const { error: vaultError } = await supabase.from('users').update({ deposit_balance: newVaultBalance }).eq('id', targetId);
      if (vaultError) return { status: 500, body: { success: false, error: `Fallo BD: ${vaultError.message}` } };

      const { data: newTask, error } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active', validation_code: validation_code || null }]).select().single();
      if (error) {
        await supabase.from('users').update({ deposit_balance: round4(newVaultBalance + totalCost) }).eq('id', targetId);
        return { status: 400, body: { success: false, error: `Fallo BD.` } };
      }
      return { status: 200, body: { success: true, task: newTask, deposit_balance: newVaultBalance } };
    }

    if (action === 'watch-ad-progress') {
        const { data: dbUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).maybeSingle();
        if (!dbUser) return { status: 404, body: { success: false, error: 'Usuario no encontrado. Vuelve a abrir la app.' } };
        const newBalance = round4(Number(dbUser.balance || 0) + 0.0005);
        await supabase.from('users').update({ balance: newBalance, total_earnings: round4(Number(dbUser.total_earnings || 0) + 0.0005) }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📺 Anuncio Visto', description: `Visualización para retiro [AdView] | +0.50 Gemas`, amount: 0.0005 }]);
        return { status: 200, body: { success: true, balance: newBalance } };
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

    // ELIMINAR: el creador o un admin (id verificado). Reembolsa lo no usado al creador.
    if (action === 'delete-task') {
      const { taskId } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return { status: 400, body: { success: false, error: 'Misión no encontrada.' } };
      if (String(task.creator_id) !== targetId && !isAdminCaller(targetId)) return { status: 403, body: { success: false, error: 'Sin permisos.' } };

      const remainingCompletions = Number(task.completions_total) - Number(task.completions_done || 0);
      if (remainingCompletions > 0) {
        const refundAmount = round4(remainingCompletions * Number(task.reward) * 1.30);
        const { data: user } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).maybeSingle();
        if (!user) return { status: 400, body: { success: false, error: 'Creador de la misión no encontrado.' } };
        const { error: refundError } = await supabase.from('users').update({ deposit_balance: round4(Number(user.deposit_balance) + refundAmount) }).eq('id', task.creator_id);
        if (refundError) return { status: 500, body: { success: false, error: `Fallo BD: ${refundError.message}` } };
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: '💰 Reembolso', description: `Cancelación de campaña. +$${refundAmount.toFixed(2)} USDT`, amount: 0 }]);
      }
      const { error: delError } = await supabase.from('tasks').delete().eq('id', taskId);
      if (delError) return { status: 500, body: { success: false, error: `Fallo BD: ${delError.message}` } };
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

      if (['group', 'channel', 'partner'].includes(task.type) && url !== task.url) {
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

      const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (updateError) return { status: 400, body: { success: false, error: `Error interno: ${updateError.message}` } };

      if (netCost !== 0) {
        const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).maybeSingle();
        if (!cUser) return { status: 400, body: { success: false, error: 'Creador de la misión no encontrado.' } };
        if (netCost > 0 && Number(cUser.deposit_balance) < netCost) return { status: 400, body: { success: false, error: 'Saldo de Bóveda insuficiente para este ajuste.' } };
        const { error: chargeError } = await supabase.from('users').update({ deposit_balance: round4(Number(cUser.deposit_balance) - netCost) }).eq('id', task.creator_id);
        if (chargeError) return { status: 500, body: { success: false, error: `Fallo BD: ${chargeError.message}` } };
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: netCost > 0 ? '🔋 Ajuste de Campaña' : '💰 Reembolso', description: `Edición táctica de la misión`, amount: -netCost }]);
      }

      return { status: 200, body: { success: true } };
    }

    return null;
}