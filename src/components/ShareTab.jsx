import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Estilo Gamer) ---
const Icons = {
  redGem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 20, 20, 0.8))' }}>
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.8))' }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  empty: (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff1493" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255,20,147,0.5))' }}>
      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  shieldCross: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  )
};

const neon = {
  card: {
    background: 'linear-gradient(145deg, rgba(40, 10, 70, 0.9), rgba(15, 5, 30, 0.95))',
    border: '2px solid #8a2be2',
    borderTop: '2px solid #ff1493',
    borderRadius: '24px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6), inset 0 2px 10px rgba(138, 43, 226, 0.2)'
  },
  btnPrimary: {
    width: '100%', padding: '16px', background: 'linear-gradient(180deg, #ff1493 0%, #d80073 100%)',
    color: '#ffffff', border: 'none', borderRadius: '18px', fontWeight: '900', fontSize: '15px',
    cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.4)', textTransform: 'uppercase'
  },
  btnOutline: {
    width: '100%', padding: '16px', background: 'rgba(0, 240, 255, 0.1)',
    color: '#00f0ff', border: '2px solid #00f0ff', borderBottom: '4px solid #0088ff', 
    borderRadius: '18px', fontWeight: '900', fontSize: '15px',
    cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)', textTransform: 'uppercase'
  },
  statBox: {
    background: 'linear-gradient(145deg, rgba(20, 5, 35, 0.9), rgba(10, 2, 15, 0.95))',
    border: '2px solid #8a2be2',
    borderBottom: '4px solid #4a0080',
    borderRadius: '18px',
    padding: '14px 10px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  },
  totalCard: {
    background: 'linear-gradient(135deg, #ff1493 0%, #8a2be2 50%, #00f0ff 100%)',
    padding: '20px 24px',
    borderRadius: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 30px rgba(255, 20, 147, 0.4), inset 0 2px 10px rgba(255,255,255,0.4)',
    border: '2px solid rgba(255,255,255,0.5)'
  },
  refItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(10, 2, 20, 0.8)', padding: '14px', borderRadius: '18px',
    border: '1px solid #8a2be2', marginBottom: '10px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
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

  // 🔥 NUEVA LÓGICA DE CLASIFICACIÓN DE REFERIDOS
  const activeCount = referralsList.filter(r => r.is_human && Number(r.total_earnings || 0) >= 0.005).length;
  const fraudCount = referralsList.filter(r => !r.is_human).length;
  const pendingCount = n1 - activeCount - fraudCount;

  // Transformamos las ganancias en USDT a Gemas (con hasta 2 decimales)
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
    const text = t('share_text') || "💎 ¡Entra a mi escuadrón y gana Gemas gratis reclamando tu Bono Diario! 🚀";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>

      <div style={neon.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          {Icons.network}
          <h4 style={{ margin: 0, color: '#00f0ff', fontSize: '18px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {t('ref_title') || "ESCUADRÓN DE AFILIADOS"}
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ ...neon.statBox, borderColor: '#00ffaa', background: 'rgba(0, 255, 170, 0.05)' }}>
            <div style={{ color: '#00ffaa', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', marginBottom: '6px' }}>{t('ref_status_active') || "ACTIVOS"}</div>
            <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '900', textShadow: '0 0 10px rgba(0, 255, 170, 0.5)' }}>{activeCount}</div>
          </div>
          
          <div style={{ ...neon.statBox, borderColor: '#ffe600', background: 'rgba(255, 230, 0, 0.05)' }}>
            <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', marginBottom: '6px' }}>{t('ref_status_pending') || "PENDIENTES"}</div>
            <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '900', textShadow: '0 0 10px rgba(255, 230, 0, 0.5)' }}>{pendingCount}</div>
          </div>

          <div style={{ ...neon.statBox, borderColor: '#ff4b4b', background: 'rgba(255, 75, 75, 0.05)' }}>
            <div style={{ color: '#ff4b4b', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', marginBottom: '6px' }}>BLOQUEADOS</div>
            <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '900', textShadow: '0 0 10px rgba(255, 75, 75, 0.5)' }}>{fraudCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ ...neon.btnPrimary, flex: 1 }} onClick={handleShare}>
            {t('ref_btn_invite') || "🚀 RECLUTAR"}
          </button>
          <button style={{ ...neon.btnOutline, flex: 1 }} onClick={handleCopy}>
            {t('ref_btn_copy') || "📋 COPIAR LINK"}
          </button>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#00f0ff', padding: 0, background: 'transparent', boxShadow: 'none' }}>
        <div style={neon.totalCard}>
          <div>
            <p style={{ fontSize: '12px', color: '#050214', margin: '0 0 4px 0', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('ref_earnings_title') || "Comisiones Generadas"}
            </p>
            <p style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: 0, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
              {gemEarnings} <span style={{ fontSize: '20px', color: '#050214' }}>💎</span>
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)' }}>
            {Icons.redGem}
          </div>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#ff1493' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h4 style={{ color: '#ff99dd', fontSize: '16px', margin: 0, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('ref_network_title') || "🛰️ TU RED DE RECLUTAS"} ({n1})
          </h4>
          <button onClick={fetchReferrals} disabled={loading} style={{ background: 'transparent', border: 'none', color: '#00f0ff', cursor: loading ? 'not-allowed' : 'pointer', animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            {Icons.refresh}
          </button>
        </div>

        {loading && n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#00f0ff', fontSize: '14px', fontWeight: '900' }}>{t('ref_syncing') || "SINCRONIZANDO RADARES..."}</div>
        ) : n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: 'rgba(255, 20, 147, 0.05)', borderRadius: '18px', border: '2px dashed #ff1493' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>{Icons.empty}</div>
            <span style={{ color: '#ff99dd', fontSize: '14px', lineHeight: '1.5', fontWeight: '900', whiteSpace: 'pre-wrap', textTransform: 'uppercase' }}>
              {t('ref_empty_desc') || "AÚN NO TIENES RECLUTAS EN TU ESCUADRÓN."}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {referralsList.map((ref, idx) => {
              const avatarLetter = ref.username ? ref.username.charAt(0).toUpperCase() : 'U';

              // Calculamos el valor generado por este afiliado (10% + 5 Gemas por tarea, visual aproximado)
              const childTotalUSDT = Number(ref.total_earnings || 0);
              const generatedTotalUSDT = childTotalUSDT * 0.10; // Visualización aproximada base
              const generatedGemas = Number((Number(generatedTotalUSDT) * 1000).toFixed(0));

              const isHuman = ref.is_human;
              const isActive = isHuman && childTotalUSDT >= 0.005;

              return (
                <div key={ref.id || idx} style={{ ...neon.refItem, borderColor: isHuman ? (isActive ? '#00ffaa' : '#ffe600') : '#ff4b4b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '42px', height: '42px', borderRadius: '12px', 
                      background: isHuman ? (isActive ? 'linear-gradient(135deg, #00ffaa, #008855)' : 'linear-gradient(135deg, #ffe600, #cc8800)') : 'linear-gradient(135deg, #ff4b4b, #8b0000)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: '#050214', fontWeight: '900', fontSize: '18px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: isHuman ? (isActive ? '0 0 10px rgba(0,255,170,0.5)' : 'none') : 'none'
                    }}>
                      {avatarLetter}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>{ref.username || t('operator') || "Recluta"}</div>
                      <div style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>ID: {ref.id}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isHuman ? (
                      isActive ? (
                        <span style={{ color: '#00ffaa', fontSize: '10px', fontWeight: '900', background: 'rgba(0, 255, 170, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #00ffaa' }}>
                          ACTIVO
                        </span>
                      ) : (
                        <span style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', background: 'rgba(255, 230, 0, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px dashed #ffe600' }}>
                          PENDIENTE
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#ff4b4b', fontSize: '10px', fontWeight: '900', background: 'rgba(255, 75, 75, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ff4b4b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {Icons.shieldCross} CLON
                      </span>
                    )}
                    
                    {isHuman && isActive && (
                       <div style={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900', marginTop: '8px' }}>
                         +{generatedGemas} 💎
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '16px', padding: '16px', marginTop: '20px', border: '1px dashed #00f0ff', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)' }}>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#ffffff', margin: 0, lineHeight: '1.6', fontWeight: '900', textTransform: 'uppercase' }}>
            {t('ref_footer_p1') || "Recibes el"} <strong style={{color: '#00ffaa'}}>10% + 5 GEMAS</strong> {t('ref_footer_p2') || "de comisión automática"}<br/>
            <span style={{ color: '#00f0ff' }}>{t('ref_footer_p3') || "por cada misión que tus reclutas activos completen."}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
export default ShareTab;
