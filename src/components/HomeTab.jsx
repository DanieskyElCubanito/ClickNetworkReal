import React from 'react';

const neon = {
  card: { background: 'linear-gradient(145deg, #18052a, #0d0217)', border: '2px solid #8a2be2', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(138, 43, 226, 0.15)' },
  btnSecondary: { width: '100%', padding: '14px', background: 'transparent', color: '#ff99dd', border: '2px dashed #ff41b4', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 65, 180, 0.2)', textTransform: 'uppercase' },
};

export default function HomeTab({ userData, setActiveTab, t }) {
  const balance = Number(userData?.balance || 0).toFixed(2);
  const totalEarned = Number(userData?.total_earnings || 0).toFixed(2);

  return (
    <div className="fade-in" style={{ color: '#fff', paddingBottom: '20px' }}>
      
      <div style={{ ...neon.card, borderColor: '#00f0ff', textAlign: 'center', background: 'linear-gradient(145deg, rgba(0,240,255,0.1), rgba(13,2,23,0.95))' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#00f0ff', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('home_balance')}</h3>
        <div style={{ fontSize: '48px', fontWeight: '900', color: '#ffffff', textShadow: '0 0 20px rgba(0, 240, 255, 0.5)', lineHeight: '1' }}>
          {balance} <span style={{ fontSize: '16px', color: '#00f0ff' }}>CLICK</span>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#ff99dd', fontWeight: 'bold' }}>
          {t('home_history')}: {totalEarned} CLICK
        </p>
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#ffe600', fontWeight: '900', textTransform: 'uppercase' }}>{t('home_quick')}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('tasks')} style={{ background: 'linear-gradient(135deg, rgba(38,14,66,0.9), rgba(18,7,36,0.9))', border: '2px solid #00ffaa', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 255, 170, 0.2)' }}>
          <div style={{ fontSize: '28px' }}>💰</div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '900' }}>{t('home_earn')}</div>
        </button>
        <button onClick={() => setActiveTab('publish')} style={{ background: 'linear-gradient(135deg, rgba(38,14,66,0.9), rgba(18,7,36,0.9))', border: '2px solid #ff41b4', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 65, 180, 0.2)' }}>
          <div style={{ fontSize: '28px' }}>🚀</div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '900' }}>{t('home_create')}</div>
        </button>
      </div>

      <div style={neon.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(138, 43, 226, 0.2)', border: '1px solid #8a2be2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👥</div>
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
