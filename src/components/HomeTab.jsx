import React from 'react';

const Icons = {
  gem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(245, 158, 11, 0.4))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="rgba(245,158,11,0.2)"/>
      <path d="M2 9H22"/><path d="M6 2L12 22M18 2L12 22" opacity="0.6"/>
    </svg>
  ),
  vault: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.4))' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  earn: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
    </svg>
  ),
  rocket: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 3.82-10L14 3l3.5 3.5L18 10c-3.1 3-7 5.18-10 3.82z"/><line x1="9" y1="12" x2="12" y2="15"/>
    </svg>
  ),
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  target: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
};

const modernStyles = {
  card: { background: 'linear-gradient(145deg, #171923, #11131a)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  btnSecondary: { width: '100%', padding: '16px', background: 'transparent', color: '#9CA3AF', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' },
  progressBg: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }
};

export default function HomeTab({ userData, setActiveTab, t }) {
  const gemBalance = Number((Number(userData?.balance || 0) * 1000).toFixed(2));
  const gemEarned = Number((Number(userData?.total_earnings || 0) * 1000).toFixed(2));
  const usdtVault = Number(userData?.deposit_balance || 0).toFixed(2);

  // 🎮 GAMIFICACIÓN: Cálculos de Nivel
  const calculateLevel = (earned) => {
    if (earned < 1000) return { rank: "Novato (Nvl 1)", next: 1000, progress: (earned / 1000) * 100, color: "#9CA3AF" };
    if (earned < 5000) return { rank: "Cazador (Nvl 2)", next: 5000, progress: (earned / 5000) * 100, color: "#06B6D4" };
    if (earned < 20000) return { rank: "Élite (Nvl 3)", next: 20000, progress: (earned / 20000) * 100, color: "#10B981" };
    return { rank: "Leyenda (MAX)", next: earned, progress: 100, color: "#F59E0B" };
  };

  const userRank = calculateLevel(gemEarned);

  return (
    <div className="fade-in" style={{ color: '#F3F4F6', paddingBottom: '20px' }}>

      {/* 🎮 TARJETA DE RANGO MILITAR (Glassmorphism) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: userRank.color }}>
            {Icons.shield}
            <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{userRank.rank}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '700' }}>EXP: <span style={{color: '#D1D5DB'}}>{gemEarned}</span> / {userRank.next}</div>
        </div>
        <div style={modernStyles.progressBg}>
          <div style={{ height: '100%', width: `${userRank.progress}%`, background: `linear-gradient(90deg, transparent, ${userRank.color})`, borderRadius: '10px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
      </div>

      {/* BÓVEDA USDT */}
      <div style={{ ...modernStyles.card, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '80px', height: '80px', background: '#10B981', filter: 'blur(50px)', opacity: '0.15' }}></div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.vault}</div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{t('home_vault_title')}</h3>
        <div style={{ fontSize: '40px', fontWeight: '900', color: '#10B981', letterSpacing: '-1px', lineHeight: '1', textShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}>
          ${usdtVault} <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '700' }}>USDT</span>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#4B5563', fontWeight: '600' }}>
          {t('home_vault_desc')}
        </p>
      </div>

      {/* BALANCE GEMAS */}
      <div style={{ ...modernStyles.card, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '80px', height: '80px', background: '#F59E0B', filter: 'blur(50px)', opacity: '0.15' }}></div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.gem}</div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{t('home_gems_title')}</h3>
        <div style={{ fontSize: '40px', fontWeight: '900', color: '#F59E0B', letterSpacing: '-1px', lineHeight: '1', textShadow: '0 4px 15px rgba(245, 158, 11, 0.2)' }}>
          {gemBalance} <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '700' }}>💎</span>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>
          {t('home_gems_desc')} <span style={{color: '#9CA3AF'}}>{gemEarned} 💎</span>
        </p>
      </div>

      {/* ACCESOS DIRECTOS */}
      <h4 style={{ margin: '24px 0 16px 0', fontSize: '13px', color: '#D1D5DB', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icons.target} {t('home_quick')}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        <button onClick={() => setActiveTab('tasks')} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '20px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '16px' }}>{Icons.earn}</div>
          <div style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('home_earn')}</div>
          <div style={{ fontSize: '9px', color: '#06B6D4', background: 'rgba(6, 182, 212, 0.1)', padding: '4px 8px', borderRadius: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>MISIONES ACTIVAS</div>
        </button>

        <button onClick={() => setActiveTab('tasks')} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '20px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '16px' }}>{Icons.rocket}</div>
          <div style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('home_create')}</div>
           <div style={{ fontSize: '9px', color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 8px', borderRadius: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>DOMINAR RED</div>
        </button>

      </div>

      {/* INVITACIONES */}
      <div style={{...modernStyles.card, position: 'relative', overflow: 'hidden', border: '1px solid rgba(236, 72, 153, 0.2)'}}>
        <div style={{ position: 'absolute', right: '-30px', bottom: '-30px', width: '100px', height: '100px', background: '#EC4899', filter: 'blur(60px)', opacity: '0.15', zIndex: 0 }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.users}
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#F3F4F6', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('home_invite')}</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', lineHeight: '1.5', fontWeight: '500' }}>{t('home_invite_desc')}</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('referrals')} style={modernStyles.btnSecondary}>
            🚀 {t('home_btn_affiliates')}
          </button>
        </div>
      </div>

    </div>
  );
}
