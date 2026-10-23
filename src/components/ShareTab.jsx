import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

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
    cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.4)'
  },
  btnOutline: {
    width: '100%', padding: '14px', background: 'rgba(0, 240, 255, 0.1)',
    color: '#00f0ff', border: '2px solid #00f0ff', borderRadius: '16px', fontWeight: '900', fontSize: '14px',
    cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
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

  const totalEarned = parseFloat(earnings).toFixed(2);
  const inviteLink = `https://t.me/ClickNetworkbot/app?startapp=${userId}`;

  const handleCopy = () => {
    if (!userId) return toast.error("Error");
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast.success(t('ref_toast_copy_ok') || "¡Enlace copiado!"))
      .catch(() => toast.error(t('ref_toast_copy_fail') || "Error al copiar"));
  };

  const handleShare = () => {
    if (!userId) return toast.error("Error");
    const text = t('share_text') || "⚡ ¡Entra a la red y gana CLICK gratis! 🚀";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>

      <div style={neon.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ fontSize: '24px', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.4))' }}>👥</span>
          <h4 style={{ margin: 0, color: '#00f0ff', fontSize: '16px', fontWeight: '900', letterSpacing: '1px' }}>
            {t('ref_title') || "PROGRAMA DE AFILIADOS"}
          </h4>
        </div>

        {/* 🔥 CAJAS SEPARADAS PARA ACTIVOS Y PENDIENTES */}
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
            style={{ ...neon.statBox, background: loading ? '#555' : '#2b0b47', border: '1px solid #ff41b4', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <div style={{ fontSize: '18px', animation: loading ? 'spin 1s linear infinite' : 'none' }}>🔄</div>
            <div style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>{t('ref_update') || "ACTUALIZAR"}</div>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ ...neon.btnPrimary, flex: 1 }} onClick={handleShare}>
            {t('ref_btn_invite') || "🚀 INVITAR"}
          </button>
          <button style={{ ...neon.btnOutline, flex: 1 }} onClick={handleCopy}>
            {t('ref_btn_copy') || "📋 COPIAR"}
          </button>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#8a2be2' }}>
        <div style={neon.totalCard}>
          <div>
            <p style={{ fontSize: '11px', color: '#ff99dd', margin: '0 0 4px 0', fontWeight: '900' }}>{t('ref_earnings_title') || "GANANCIAS POR INVITADOS"}</p>
            <p style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: 0 }}>
              {totalEarned} <span style={{ fontSize: '14px', color: '#ffe600' }}>CLICK</span>
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(255,230,0,0.5))' }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        </div>
      </div>

      <div style={{ ...neon.card, borderColor: '#ff41b4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: '#00f0ff', fontSize: '15px', margin: 0, fontWeight: '900' }}>
            {t('ref_network_title') || "📊 Tu Red"} ({n1})
          </h4>
        </div>

        {loading && n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#00f0ff', fontSize: '13px', fontWeight: 'bold' }}>{t('ref_syncing') || "Sincronizando..."}</div>
        ) : n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', backgroundColor: 'rgba(255, 65, 180, 0.05)', borderRadius: '14px', border: '1px dashed #ff41b4' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '10px' }}>👻</span>
            <span style={{ color: '#ff99dd', fontSize: '13px', lineHeight: '1.5', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
              {t('ref_empty_desc') || "Aún no tienes afiliados registrados."}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {referralsList.map((ref, idx) => {
              const avatarLetter = ref.username ? ref.username.charAt(0).toUpperCase() : 'U';
              
              // 🔥 CÁLCULO DE CUÁNTO HA GENERADO ESTE USUARIO: 1 CLICK de registro + 20% de lo que ha ganado.
              const childTotal = Number(ref.total_earnings || 0);
              const generatedFromTasks = childTotal * 0.20;
              const generatedTotal = (ref.referral_reward_granted ? 1 : 0) + generatedFromTasks;

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
                    <div style={{ color: '#00f0ff', fontSize: '12px', fontWeight: 'bold', marginTop: '6px' }}>
                      Generado: +{generatedTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '12px', marginTop: '16px', border: '1px dashed #8a2be2' }}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#00f0ff', margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            {t('ref_footer_p1') || "Recibes"} <strong style={{color: '#ffe600'}}>1.0 CLICK</strong> {t('ref_footer_p2') || "por cada afiliado verificado"}<br/>+ <strong style={{color: '#00ffaa'}}>20%</strong> {t('ref_footer_p3') || "de cada tarea que ellos completen."}
          </p>
        </div>
      </div>
    </div>
  );
}
export default ShareTab;
