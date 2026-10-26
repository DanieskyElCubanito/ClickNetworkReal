import React from 'react';

const Icons = {
  gem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff1414" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 20, 20, 0.8))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="#ff4b4b" opacity="0.8"/>
      <path d="M2 9H22"/><path d="M6 2L12 22M18 2L12 22" opacity="0.6"/>
    </svg>
  ),
  vault: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 170, 0.8))' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  earn: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(0,240,255,0.5))' }}>
      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
    </svg>
  ),
  rocket: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff41b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(255,65,180,0.5))' }}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 3.82-10L14 3l3.5 3.5L18 10c-3.1 3-7 5.18-10 3.82z"/><line x1="9" y1="12" x2="12" y2="15"/>
    </svg>
  ),
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a2be2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(138,43,226,0.5))' }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
};

const neon = {
  card: { background: 'linear-gradient(145deg, #18052a, #0d0217)', border: '2px solid #8a2be2', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(138, 43, 226, 0.15)' },
  btnSecondary: { width: '100%', padding: '14px', background: 'transparent', color: '#ff99dd', border: '2px dashed #ff41b4', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 65, 180, 0.2)', textTransform: 'uppercase' },
};

export default function HomeTab({ userData, setActiveTab, t }) {
  const gemBalance = Number((Number(userData?.balance || 0) * 1000).toFixed(2));
  const gemEarned = Number((Number(userData?.total_earnings || 0) * 1000).toFixed(2));
  const usdtVault = Number(userData?.deposit_balance || 0).toFixed(2);

  return (
    <div className="fade-in" style={{ color: '#fff', paddingBottom: '20px' }}>

      <div style={{ ...neon.card, borderColor: '#00ffaa', textAlign: 'center', background: 'linear-gradient(145deg, rgba(0,255,170,0.1), rgba(13,2,23,0.95))', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{Icons.vault}</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#00ffaa', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('home_vault_title')}</h3>
        <div style={{ fontSize: '38px', fontWeight: '900', color: '#ffffff', textShadow: '0 0 20px rgba(0, 255, 170, 0.5)', lineHeight: '1' }}>
          ${usdtVault} <span style={{ fontSize: '14px', color: '#00ffaa' }}>USDT</span>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>
          {t('home_vault_desc')}
        </p>
      </div>

      <div style={{ ...neon.card, borderColor: '#ff1414', textAlign: 'center', background: 'linear-gradient(145deg, rgba(255,20,20,0.1), rgba(13,2,23,0.95))', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{Icons.gem}</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ff9999', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('home_gems_title')}</h3>
        <div style={{ fontSize: '38px', fontWeight: '900', color: '#ffffff', textShadow: '0 0 20px rgba(255, 20, 20, 0.5)', lineHeight: '1' }}>
          {gemBalance} <span style={{ fontSize: '14px', color: '#ff4b4b' }}>💎</span>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#ff99dd', fontWeight: 'bold' }}>
          {t('home_gems_desc')} {gemEarned} 💎
        </p>
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#ffe600', fontWeight: '900', textTransform: 'uppercase' }}>{t('home_quick')}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>

        <button onClick={() => setActiveTab('tasks')} style={{ background: 'linear-gradient(135deg, rgba(38,14,66,0.9), rgba(18,7,36,0.9))', border: '2px solid #00f0ff', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)' }}>
          <div>{Icons.earn}</div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '900' }}>{t('home_earn')}</div>
        </button>

        <button onClick={() => setActiveTab('tasks')} style={{ background: 'linear-gradient(135deg, rgba(38,14,66,0.9), rgba(18,7,36,0.9))', border: '2px solid #ff41b4', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 65, 180, 0.2)' }}>
          <div>{Icons.rocket}</div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '900' }}>{t('home_create')}</div>
        </button>

      </div>

      <div style={neon.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(138, 43, 226, 0.2)', border: '1px solid #8a2be2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.users}
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff', fontWeight: '900' }}>{t('home_invite')}</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#ff99dd', lineHeight: '1.4' }}>{t('home_invite_desc')}</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('referrals')} style={neon.btnSecondary}>{t('home_btn_affiliates')}</button>
      </div>

    </div>
  );
}
