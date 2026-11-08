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

      let pastEventsPublic = [];
      const { data: allEventsData } = await supabase.from('events').select('*').order('end_date', { ascending: false });
      const pastEventsData = (allEventsData || []).filter(ev => ev.status === 'completed' || (ev.status === 'active' && new Date(ev.end_date).getTime() <= Date.now())).slice(0, 5);
      
      for (const ev of pastEventsData) {
        const { data: participants } = await supabase.from('event_participants').select('user_id, score').eq('event_id', ev.id).order('score', { ascending: false }).limit(3);
        const winners = [];
        if (participants) {
          for (const p of participants) {
            const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).maybeSingle();
            winners.push({ userId: p.user_id, username: u?.username || 'Usuario', score: p.score });
          }
        }
        pastEventsPublic.push({ ...ev, winners });
      }

      return { status: 200, body: { success: true, topTasks: completedRanking, topReferrals: topReferrers, pastEvents: pastEventsPublic } };
    }

    if (action === 'get-active-event') {
      const { data: activeEvent } = await supabase.from('events').select('*').eq('status', 'active').maybeSingle();
      if (!activeEvent) return { status: 200, body: { success: true, activeEvent: null, leaderboard: [] } };
      
      if (new Date().getTime() >= new Date(activeEvent.end_date).getTime()) {
        await supabase.from('events').update({ status: 'completed' }).eq('id', activeEvent.id);
        return { status: 200, body: { success: true, activeEvent: null, leaderboard: [] } };
      }
      
      const { data: participants } = await supabase.from('event_participants').select('user_id, score').eq('event_id', activeEvent.id).order('score', { ascending: false }).limit(10);
      const leaderboard = [];
      if (participants) {
        for (const p of participants) {
          const { data: u } = await supabase.from('users').select('username').eq('id', p.user_id).single();
          leaderboard.push({ userId: p.user_id, username: u?.username || 'Usuario', score: p.score });
        }
      }
      return { status: 200, body: { success: true, activeEvent, leaderboard } };
    }

    if (action === 'get-history') {
      const { data: history } = await supabase.from('history_logs').select('*').eq('user_id', targetId).order('created_at', { ascending: false }); 
      return { status: 200, body: { success: true, history: history || [] } };
    }

    // 🔥 MODIFICADO: Ahora envía los porcentajes y bonos configurados
    if (action === 'get-referrals') {
      let { data: lv1 } = await supabase.from('users').select('*').eq('referred_by', targetId);
      const { data: dbUser } = await supabase.from('users').select('referral_earnings').eq('id', targetId).maybeSingle();
      const { data: config } = await supabase.from('system_settings').select('ref_percent, ref_bonus_gemas').eq('id', 1).maybeSingle();
      
      return { 
          status: 200, 
          body: { 
              success: true, 
              referrals: lv1 || [], 
              earnings: dbUser?.referral_earnings || 0,
              sys_percent: config?.ref_percent || 10,
              sys_bonus: config?.ref_bonus_gemas || 5
          } 
      };
    }

    return null;
}
