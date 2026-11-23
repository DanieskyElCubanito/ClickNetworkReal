import React from 'react';

const Icons = {
  token: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(245, 158, 11, 0.4))' }}>
      <circle cx="12" cy="12" r="10" fill="rgba(245,158,11,0.15)"/>
      <path d="M8 9h8M12 9v7"/>
    </svg>
  ),
  vault: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.4))' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  earn: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
    </svg>
  ),
  rocket: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 3.82-10L14 3l3.5 3.5L18 10c-3.1 3-7 5.18-10 3.82z"/><line x1="9" y1="12" x2="12" y2="15"/>
    </svg>
  ),
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  target: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
};

const modernStyles = {
  card: { background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' },
  btnAffiliates: { width: '100%', padding: '16px', background: 'rgba(236, 72, 153, 0.18)', color: '#FFFFFF', border: '1px solid #EC4899', borderRadius: '16px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)' },
  progressBg: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' },
  bigNumber: { fontSize: 'clamp(28px, 9vw, 40px)', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1', overflowWrap: 'anywhere' },
  unit: { fontSize: '15px', color: '#CBD5E1', fontWeight: '800' }
};

// Una sola unidad ($TGM) y abreviaturas: 415002000.7 → 415M, 20542.7 → 20.5K
const fmtAmount = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${parseFloat((n / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `${parseFloat((n / 1e3).toFixed(1))}K`;
  return `${parseFloat(n.toFixed(2))}`;
};

// Textos con clave de idioma; si la clave no existe, se usa el texto por defecto
const tx = (t, key, fallback) => {
  const v = typeof t === 'function' ? t(key) : undefined;
  return v && v !== key ? v : fallback;
};

const LEVELS = [
  { rank: 'Novato (Nvl 1)', next: 1000, color: '#CBD5E1' },
  { rank: 'Cazador (Nvl 2)', next: 5000, color: '#22D3EE' },
  { rank: 'Élite (Nvl 3)', next: 20000, color: '#34D399' }
];

const calculateLevel = (earned) => {
  const lvl = LEVELS.find((l) => earned < l.next);
  if (!lvl) return { rank: 'Leyenda (MAX)', next: null, progress: 100, color: '#FBBF24' };
  return { rank: lvl.rank, next: lvl.next, progress: Math.min(100, (earned / lvl.next) * 100), color: lvl.color };
};

export default function HomeTab({ userData, setActiveTab, t }) {
  // 1 USDT en la base de datos = 1000 $TGM visibles
  const tgmBalance = Number(userData?.balance || 0) * 1000;
  const tgmEarned = Number(userData?.total_earnings || 0) * 1000;
  const campaignFunds = Number(userData?.deposit_balance || 0) * 1000;

  const userRank = calculateLevel(tgmEarned);

  return (
    <div className="fade-in" style={{ color: '#F3F4F6', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>

      {/* NIVEL / EXP */}
      <div style={{ background: '#0F172A', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: userRank.color }}>
            {Icons.shield}
            <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{userRank.rank}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: '700', whiteSpace: 'nowrap' }}>
            EXP: <span style={{ color: '#FFFFFF' }}>{fmtAmount(tgmEarned)}</span>
            {userRank.next ? <> / {fmtAmount(userRank.next)}</> : <> · MAX</>}
          </div>
        </div>
        <div style={modernStyles.progressBg}>
          <div style={{ height: '100%', width: `${userRank.progress}%`, background: `linear-gradient(90deg, ${userRank.color}66, ${userRank.color})`, borderRadius: '10px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
      </div>

      {/* FONDOS DE CAMPAÑA (anunciantes) */}
      <div style={{ ...modernStyles.card, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.vault}</div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#E2E8F0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          {tx(t, 'home_vault_title', 'FONDOS DE CAMPAÑA')}
        </h3>
        <div style={{ ...modernStyles.bigNumber, color: '#34D399', textShadow: '0 4px 15px rgba(52, 211, 153, 0.25)' }}>
          {fmtAmount(campaignFunds)} <span style={modernStyles.unit}>$TGM</span>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#CBD5E1', fontWeight: '600' }}>
          {tx(t, 'home_vault_desc', 'Para creación de anuncios y tráfico')}
        </p>
      </div>

      {/* SALDO DISPONIBLE (usuarios) */}
      <div style={{ ...modernStyles.card, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.token}</div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#E2E8F0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          {tx(t, 'home_gems_title', 'SALDO DISPONIBLE')}
        </h3>
        <div style={{ ...modernStyles.bigNumber, color: '#FBBF24', textShadow: '0 4px 15px rgba(251, 191, 36, 0.25)' }}>
          {fmtAmount(tgmBalance)} <span style={modernStyles.unit}>$TGM</span>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#CBD5E1', fontWeight: '600' }}>
          {tx(t, 'home_gems_desc', 'Generado en red:')} <span style={{ color: '#FFFFFF', fontWeight: '800' }}>{fmtAmount(tgmEarned)} $TGM</span>
        </p>
      </div>

      {/* ACCESOS DIRECTOS */}
      <h4 style={{ margin: '24px 0 16px 0', fontSize: '13px', color: '#F1F5F9', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icons.target} {tx(t, 'home_quick', 'Acceso rápido')}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        <button onClick={() => setActiveTab('tasks')} style={{ background: '#0F172A', border: '1px solid rgba(34, 211, 238, 0.5)', borderRadius: '20px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'rgba(34, 211, 238, 0.15)', padding: '12px', borderRadius: '16px' }}>{Icons.earn}</div>
          <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tx(t, 'home_earn', 'Ganar $TGM')}</div>
          <div style={{ fontSize: '11px', color: '#67E8F9', background: 'rgba(34, 211, 238, 0.18)', padding: '4px 8px', borderRadius: '10px', fontWeight: '800', letterSpacing: '0.4px' }}>{tx(t, 'home_earn_sub', 'MISIONES ACTIVAS')}</div>
        </button>

        <button onClick={() => setActiveTab('tasks')} style={{ background: '#0F172A', border: '1px solid rgba(167, 139, 250, 0.5)', borderRadius: '20px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'rgba(167, 139, 250, 0.15)', padding: '12px', borderRadius: '16px' }}>{Icons.rocket}</div>
          <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tx(t, 'home_create', 'Crear campaña')}</div>
          <div style={{ fontSize: '11px', color: '#C4B5FD', background: 'rgba(167, 139, 250, 0.2)', padding: '4px 8px', borderRadius: '10px', fontWeight: '800', letterSpacing: '0.4px' }}>{tx(t, 'home_create_sub', 'DOMINAR RED')}</div>
        </button>

      </div>

      {/* INVITACIONES */}
      <div style={{ ...modernStyles.card, border: '1px solid rgba(244, 114, 182, 0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '54px', height: '54px', flexShrink: 0, borderRadius: '16px', background: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.users}
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#FFFFFF', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tx(t, 'home_invite', 'Expande tu red')}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#CBD5E1', lineHeight: '1.5', fontWeight: '500' }}>{tx(t, 'home_invite_desc', '')}</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('referrals')} style={modernStyles.btnAffiliates}>
          🚀 {tx(t, 'home_btn_affiliates', 'Panel de afiliados')}
        </button>
      </div>

    </div>
  );
}