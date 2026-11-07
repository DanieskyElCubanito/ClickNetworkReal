import { supabase } from '../utils/supabase.js';

export async function handlePublicDataActions(action, targetId, reqBody) {
    if (action === 'get-global-stats') {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('status', 'completed');
      const totalWithdrawnUsdt = withdrawals ? withdrawals.reduce((sum, w) => sum + Number(w.amount), 0) : 0;
      const { data: deposits } = await supabase.from('users').select('deposit_balance');
      const totalDeposited = deposits ? deposits.reduce((sum, u) => sum + Number(u.deposit_balance), 0) : 0;
      const { data: statsRow } = await supabase.from('platform_stats').select('total_global_clicks').eq('id', 1).maybeSingle();
      const daysOnline = Math.max(1, Math.floor((Date.now() - new Date("2026-10-25T00:00:00Z").getTime()) / 86400000));
      return { status: 200, body: { success: true, stats: { users: totalUsers || 0, withdrawn: totalWithdrawnUsdt * 1000, deposited: totalDeposited, globalClicks: statsRow?.total_global_clicks || 0, daysOnline } } };
    }

    if (action === 'get-leaderboard') {
      let completedRanking = [];
      const { data: allTasksDone } = await supabase.from('user_completed_tasks').select('user_id');
      if (allTasksDone) {
        const taskCounts = {};
        for (const t of allTasksDone) taskCounts[t.user_id] = (taskCounts[t.user_id] || 0) + 1;
        const sortedUsers = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        for (const [uid, count] of sortedUsers) {
          const { data: u } = await supabase.from('users').select('username').eq('id', uid).maybeSingle();
          completedRanking.push({ id: uid, username: u?.username || 'Usuario', score: count });
        }
      }

      let topReferrers = [];
      const { data: tr } = await supabase.from('users').select('id, username').order('referral_earnings', { ascending: false }).limit(10);
      if (tr) {
        for (const u of tr) {
          const { count: activosCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', u.id).gte('total_earnings', 0.005);
          topReferrers.push({ id: u.id, username: u.username || 'Usuario', score: activosCount || 0 });
        }
        topReferrers.sort((a, b) => b.score - a.score);
      }
      return { status: 200, body: { success: true, topTasks: completedRanking, topReferrals: topReferrers, pastEvents: [] } };
    }

    if (action === 'get-history') {
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', targetId).order('created_at', { ascending: false }); 
      return { status: 200, body: { success: true, history: history || [] } };
    }

    if (action === 'get-referrals') {
      let { data: lv1 } = await supabase.from('users').select('*').eq('referred_by', targetId);
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', targetId).maybeSingle();
      return { status: 200, body: { success: true, referrals: lv1 || [], earnings: dbUser?.referral_earnings || 0 } };
    }

    return null;
}
