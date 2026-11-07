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
            const comm = Number((rewardAmount * 0.10).toFixed(4));
            const { data: ref } = await supabase.from('users').select('*').eq('id', dbUser.referred_by).maybeSingle();
            if (ref) {
               await supabase.from('users').update({ balance: Number(ref.balance) + comm, referral_earnings: Number(ref.referral_earnings) + comm }).eq('id', ref.id);
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

    return null;
}
