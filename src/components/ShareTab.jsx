import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Sin Emojis) ---
const Icons = {
  redGem: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 20, 20, 0.8))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="url(#gemGradient)" stroke="#ff1414" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 9H22" stroke="#ff1414" strokeWidth="1.5"/>
      <path d="M6 2L12 22M18 2L12 22" stroke="#ff1414" strokeWidth="1.5" opacity="0.6"/>
      <defs>
        <linearGradient id="gemGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4b4b" />
          <stop offset="1" stopColor="#8b0000" />
        </linearGradient>
      </defs>
    </svg>
  ),
  network: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(0,240,255,0.5))' }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  empty: (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff41b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255,65,180,0.5))' }}>
      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
};

const neon = {
  card: {
    background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.85), rgba(20, 8, 38, 0.95))',
    border: '2px solid #00f0ff',
    borderRadius: '24px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 8px 24px rgba(0, 240, 255, 0.15)'
  },
  btnPrimary: {
    width: '100%', padding: '14px', background: 'linear-gradient(180deg, #ff66cc 0%, #ff1493 50%, #d80073 100%)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '14px',
    cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.4)', textTransform: 'uppercase'
  },
  btnOutline: {
    width: '100%', padding: '14px', background: 'rgba(0, 240, 255, 0.1)',
    color: '#00f0ff', border: '2px solid #00f0ff', borderRadius: '16px', fontWeight: '900', fontSize: '14px',
    cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)', textTransform: 'uppercase'
  },
  statBox: {
    background: 'rgba(15, 5, 28, 0.8)',
    border: '1px solid #8a2be2',
    borderRadius: '16px',
    padding: '14px 10px',
    textAlign: 'center',
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
  },
  totalCard: {
    background: 'linear-gradient(90deg, #ff1493 0%, #8a2be2 100%)',
    padding: '18px 20px',
    borderRadius: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 6px 20px rgba(255, 20, 147, 0.35)',
    border: '2px solid rgba(255,255,255,0.2)'
  },
  refItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#120822', padding: '12px 14px', borderRadius: '14px',
    border: '1px solid #3d1b63', marginBottom: '8px'
  }
};

function ShareTab({ stats, userId, totalReferralEarnings, t }) {
  const [referralsList, setReferralsList] = useState(stats?.referralsList || []);
  const [earnings, setEarnings] = useState(totalReferralEarnings || stats?.c1 || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const data = await botApi.getReferrals(userId);
      if (data && data.success) {
        setReferralsList(data.referrals || []);
        setEarnings(data.earnings || 0);
      }
    } catch (error) {
      console.error("Error fetching referrals.");
    } finally {
      setLoading(false);
    }
  };

  const n1 = referralsList.length;
  // Calculamos Activos y Pendientes
  const activeCount = referralsList.filter(r => r.referral_reward_granted).length;
  const pendingCount = n1 - activeCount;

  // 🔥 Transformamos las ganancias en USDT a Gemas (con hasta 2 decimales)
const gemEarnings = Number((Number(earnings) * 1000).toFixed(2));

  
  const inviteLink = `https://t.me/TeleGemAds_bot/app?startapp=${userId}`;

  const handleCopy = () => {
    if (!userId) return toast.error("Error");
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast.success(t('ref_toast_copy_ok') || "¡Enlace copiado!"))
      .catch(() => toast.error(t('ref_toast_copy_fail') || "Error al copiar"));
  };

  const handleShare = () => {
    if (!userId) return toast.error("Error");
    const text = t('share_text') || "💎 ¡Entra a la red y gana Gemas gratis completando tareas! 🚀";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>

      <div style={neon.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          {Icons.network}
          <h4 style={{ margin: 0, color: '#00f0ff', fontSize: '16px', fontWeight: '900', letterSpacing: '1px' }}>
            {t('ref_title') || "PROGRAMA DE AFILIADOS"}
          </h4>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <div style={{ ...neon.statBox, flex: 1, borderColor: '#00ffaa', background: 'rgba(0, 255, 170, 0.05)' }}>
            <div style={{ color: '#00ffaa', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '4px' }}>ACTIVOS</div>
            <div style={{ color: '#ffffff', fontSize: '22px', fontWeight: '900' }}>{activeCount}</div>
          </div>
          <div style={{ ...neon.statBox, flex: 1, borderColor: '#ffe600', background: 'rgba(255, 230, 0, 0.05)' }}>
            <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '4px' }}>PENDIENTES</div>
            <div style={{ color: '#ffffff', fontSize: '22px', fontWeight: '900' }}>{pendingCount}</div>
          </div>
          <button 
            onClick={fetchReferrals} 
            disabled={loading}
            style={{ ...neon.statBox, background: loading ? '#555' : '#2b0b47', border: '1px solid #ff41b4', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ animation: loading ? 'spin 1s linear infinite' : 'none', display: 'flex' }}>
              {Icons.refresh}
            </div>
            <div style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', marginTop: '6px' }}>{t('ref_update') || "ACTUALIZAR"}</div>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ ...neon.btnPrimary, flex: 1 }} onClick={handleShare}>
            🚀 INVITAR
          </button>
          <button style={{ ...neon.btnOutline, flex: 1 }} onClick={handleCopy}>
            📋 COPIAR
          </button>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#8a2be2' }}>
        <div style={neon.totalCard}>
          <div>
            <p style={{ fontSize: '11px', color: '#ff99dd', margin: '0 0 4px 0', fontWeight: '900', textTransform: 'uppercase' }}>
              {t('ref_earnings_title') || "Ganancias por Invitados"}
            </p>
            <p style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', margin: 0, textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
              {gemEarnings} <span style={{ fontSize: '16px', color: '#ff4b4b' }}>💎</span>
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.redGem}
          </div>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#ff41b4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: '#00f0ff', fontSize: '15px', margin: 0, fontWeight: '900', textTransform: 'uppercase' }}>
            {t('ref_network_title') || "📊 Tu Red"} ({n1})
          </h4>
        </div>

        {loading && n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#00f0ff', fontSize: '13px', fontWeight: 'bold' }}>{t('ref_syncing') || "Sincronizando..."}</div>
        ) : n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', backgroundColor: 'rgba(255, 65, 180, 0.05)', borderRadius: '14px', border: '1px dashed #ff41b4' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.empty}</div>
            <span style={{ color: '#ff99dd', fontSize: '13px', lineHeight: '1.5', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
              {t('ref_empty_desc') || "Aún no tienes afiliados registrados."}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {referralsList.map((ref, idx) => {
              const avatarLetter = ref.username ? ref.username.charAt(0).toUpperCase() : 'U';

              // 🔥 Solo calcula el 20% real de las tareas completadas por el afiliado
              const childTotalUSDT = Number(ref.total_earnings || 0);
              const generatedTotalUSDT = childTotalUSDT * 0.20;
              const generatedGemas = Number((Number(generatedTotalUSDT) * 1000).toFixed(2));


              return (
                <div key={ref.id || idx} style={neon.refItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #00f0ff, #ff1493)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: '#fff', fontWeight: '900', fontSize: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {avatarLetter}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}>{ref.username || t('operator') || "Usuario"}</div>
                      <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>ID: {ref.id}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {ref.referral_reward_granted ? (
                      <span style={{ color: '#00ffaa', fontSize: '10px', fontWeight: '900', background: 'rgba(0, 255, 170, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid #00ffaa' }}>
                        {t('ref_status_active') || "ACTIVO"}
                      </span>
                    ) : (
                      <span style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', background: 'rgba(255, 230, 0, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px dashed #ffe600' }}>
                        {t('ref_status_pending') || "PENDIENTE"}
                      </span>
                    )}
                    <div style={{ color: '#ff4b4b', fontSize: '12px', fontWeight: '900', marginTop: '6px' }}>
                      +{generatedGemas} 💎
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '12px', marginTop: '16px', border: '1px dashed #8a2be2' }}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#00f0ff', margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            {t('ref_footer_p1') || "Recibes el"} <strong style={{color: '#00ffaa'}}>20%</strong> {t('ref_footer_p2') || "de comisiones de por vida"}<br/>{t('ref_footer_p3') || "por cada tarea que tus afiliados completen."}
          </p>
        </div>
      </div>
    </div>
  );
}
export default ShareTab;
