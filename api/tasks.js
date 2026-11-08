import { supabase } from '../utils/supabase.js';
import { extractTelegramUsername, checkMembership, checkAdminStatusDetailed } from '../utils/telegram.js';

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

        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
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

        await supabase.from('user_completed_tasks').insert([{ task_id: taskId, user_id: targetId }]);
        const rewardAmount = Number(task.reward || 1);
        const { data: dbUser } = await supabase.from('users').select('balance, total_earnings, referred_by').eq('id', targetId).single();
        const newBalance = Number((Number(dbUser.balance || 0) + rewardAmount).toFixed(4));
        const newTotal = Number((Number(dbUser.total_earnings || 0) + rewardAmount).toFixed(4));
        
        await supabase.from('users').update({ balance: newBalance, total_earnings: newTotal }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '✅ Tarea Completada', description: `Campaña: "${task.title}" | +${(rewardAmount * 1000).toFixed(2)} Gemas`, amount: rewardAmount }]);

        if (dbUser.referred_by) {
            const { data: config } = await supabase.from('system_settings').select('ref_percent, ref_bonus_gemas').eq('id', 1).maybeSingle();
            const percent = config && config.ref_percent ? Number(config.ref_percent) / 100 : 0.10;
            const bonusUsdt = config && config.ref_bonus_gemas ? Number(config.ref_bonus_gemas) / 1000 : 0.005;

            const comm = Number((rewardAmount * percent).toFixed(4));
            
            let extraBonusUsdt = 0;
            if (Number(dbUser.total_earnings || 0) < 0.005 && newTotal >= 0.005) {
                extraBonusUsdt = bonusUsdt;
            }

            const totalToReferrer = comm + extraBonusUsdt;

            const { data: ref } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
            if (ref && totalToReferrer > 0) {
               await supabase.from('users').update({ balance: Number(ref.balance) + totalToReferrer, referral_earnings: Number(ref.referral_earnings) + totalToReferrer }).eq('id', ref.id);
               
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
      const count = Number(completions_total || 100); 
      const rew = Number(reward || 0.001); 
      const totalCost = Number((count * rew * 1.30).toFixed(4));

      const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', targetId).single();
      if (!cUser || Number(cUser.deposit_balance) < totalCost) return { status: 400, body: { success: false, error: 'Bóveda insuficiente.' } };
      
      const newVaultBalance = Number((Number(cUser.deposit_balance) - totalCost).toFixed(4));
      await supabase.from('users').update({ deposit_balance: newVaultBalance }).eq('id', targetId);

      const { data: newTask, error } = await supabase.from('tasks').insert([{ creator_id: targetId, type, title, url, bot_token: bot_token || null, completions_total: count, completions_done: 0, reward: rew, total_cost: totalCost, status: 'active', validation_code: validation_code || null }]).select().single();
      if (error) {
        await supabase.from('users').update({ deposit_balance: newVaultBalance + totalCost }).eq('id', targetId);
        return { status: 400, body: { success: false, error: `Fallo BD.` } };
      }
      return { status: 200, body: { success: true, task: newTask, deposit_balance: newVaultBalance } };
    }

    if (action === 'watch-ad-progress') {
        const { data: dbUser } = await supabase.from('users').select('balance, total_earnings').eq('id', targetId).single();
        const newBalance = Number((Number(dbUser.balance || 0) + 0.0005).toFixed(4));
        await supabase.from('users').update({ balance: newBalance, total_earnings: Number((Number(dbUser.total_earnings || 0) + 0.0005).toFixed(4)) }).eq('id', targetId);
        await supabase.from('history_logs').insert([{ user_id: targetId, title: '📺 Anuncio Visto', description: `Visualización para retiro [AdView] | +0.50 Gemas`, amount: 0.0005 }]);
        return { status: 200, body: { success: true, balance: newBalance } };
    }

    // 🔥 RESTAURADO: PAUSAR / ACTIVAR TAREAS
    if (action === 'toggle-task-status') {
      const { taskId, requestingUserId } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('creator_id', String(requestingUserId)).single();
      if (!task) return { status: 400, body: { success: false, error: 'Sin permisos o tarea no encontrada.' } };
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      return { status: 200, body: { success: true, status: newStatus } };
    }

    // 🔥 RESTAURADO: ELIMINAR TAREAS
    if (action === 'delete-task') {
      const { taskId, requestingUserId, isAdminAction } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return { status: 400, body: { success: false, error: 'Misión no encontrada.' } };
      if (task.creator_id !== String(requestingUserId) && !isAdminAction) return { status: 403, body: { success: false, error: 'Sin permisos.' } };

      const remainingCompletions = task.completions_total - (task.completions_done || 0);
      if (remainingCompletions > 0) {
        const refundAmount = Number((remainingCompletions * task.reward * 1.30).toFixed(4));
        const { data: user } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).single();
        if (user) {
          await supabase.from('users').update({ deposit_balance: Number((Number(user.deposit_balance) + refundAmount).toFixed(4)) }).eq('id', task.creator_id);
          await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: '💰 Reembolso', description: `Cancelación de campaña. +$${refundAmount.toFixed(2)} USDT`, amount: 0 }]);
        }
      }
      await supabase.from('tasks').delete().eq('id', taskId);
      return { status: 200, body: { success: true } };
    }

    // 🔥 RESTAURADO: EDITAR TAREAS (TÍTULO, URL Y CUPOS)
    if (action === 'edit-task') {
      const { taskId, requestingUserId, newTitle, newUrl, addCompletions, newReward, isAdminAction } = reqBody;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (!task) return { status: 400, body: { success: false, error: 'Misión no encontrada.' } };
      if (task.creator_id !== String(requestingUserId) && !isAdminAction) return { status: 403, body: { success: false, error: 'Sin permisos.' } };

      if (task.type === 'bot' && !newUrl.toLowerCase().includes('bot')) {
        return { status: 400, body: { success: false, error: 'Las URLs de Bots deben contener la palabra "bot".' } };
      }

      // Verificamos si cambió el canal y si el bot sigue siendo Admin allí
      if ((task.type === 'group' || task.type === 'channel' || task.type === 'partner') && newUrl !== task.url) {
        const chatId = extractTelegramUsername(newUrl);
        if (!chatId) return { status: 400, body: { success: false, error: 'Enlace de Telegram inválido.' } };
        const adminCheck = await checkAdminStatusDetailed(chatId);
        if (!adminCheck.isAdmin) return { status: 400, body: { success: false, error: adminCheck.error } };
      }

      const updates = { title: newTitle, url: newUrl };
      let netCost = 0;
      const remainingCompletions = task.completions_total - (task.completions_done || 0);

      // Si subió la recompensa
      if (newReward && Number(newReward) !== Number(task.reward) && remainingCompletions > 0) {
        netCost += (remainingCompletions * Number(newReward) * 1.30) - (remainingCompletions * task.reward * 1.30);
        updates.reward = Number(newReward);
      }

      // Si agregó más cupos
      if (addCompletions && Number(addCompletions) > 0) {
        netCost += Number(addCompletions) * (updates.reward || task.reward) * 1.30;
        updates.completions_total = task.completions_total + Number(addCompletions);
        updates.status = 'active'; 
      }

      // Cobrar a la bóveda si el costo aumentó
      if (netCost !== 0) {
        const { data: cUser } = await supabase.from('users').select('deposit_balance').eq('id', task.creator_id).single();
        if (netCost > 0 && (!cUser || Number(cUser.deposit_balance) < netCost)) return { status: 400, body: { success: false, error: `Saldo de Bóveda insuficiente para este ajuste.` } };
        
        await supabase.from('users').update({ deposit_balance: Number((Number(cUser.deposit_balance) - netCost).toFixed(4)) }).eq('id', task.creator_id);
        await supabase.from('history_logs').insert([{ user_id: task.creator_id, title: netCost > 0 ? '🔋 Ajuste de Campaña' : '💰 Reembolso', description: `Edición táctica de la misión`, amount: -netCost }]);
      }

      const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (updateError) return { status: 400, body: { success: false, error: `Error interno: ${updateError.message}` } };
      
      return { status: 200, body: { success: true } };
    }

    return null;
}
