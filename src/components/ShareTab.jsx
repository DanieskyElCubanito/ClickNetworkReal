import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Trazo Fino 1.8) ---
const Icons = {
  gem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(6, 182, 212, 0.3))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="rgba(6, 182, 212, 0.2)" stroke="#06B6D4" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M2 9H22" stroke="#06B6D4" strokeWidth="1.8"/>
      <path d="M6 2L12 22M18 2L12 22" stroke="#06B6D4" strokeWidth="1.8" opacity="0.6"/>
    </svg>
  ),
  network: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  empty: (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  shieldCross: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  )
};

const modernStyles = {
  card: {
    background: 'linear-gradient(145deg, #171923, #11131a)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)'
  },
  btnPrimary: {
    width: '100%', padding: '16px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px',
    cursor: 'pointer', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  btnOutline: {
    width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.02)',
    color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.4)', 
    borderRadius: '16px', fontWeight: '800', fontSize: '14px',
    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'background 0.2s'
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '16px 10px',
    textAlign: 'center'
  },
  totalCard: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
    padding: '24px',
    borderRadius: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(6, 182, 212, 0.3)'
  },
  refItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '12px'
  }
};

function ShareTab({ stats, userId, totalReferralEarnings, t }) {
  const [referralsList, setReferralsList] = useState(stats?.referralsList || []);
  const [earnings, setEarnings] = useState(totalReferralEarnings || stats?.c1 || 0);
  const [loading, setLoading] = useState(false);

  // ESTADOS PARA PORCENTAJES DINÁMICOS
  const [sysPercent, setSysPercent] = useState(10);
  const [sysBonus, setSysBonus] = useState(5);

  useEffect(() => {
    if (userId) fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const data = await botApi.getReferrals(); // El backend ya no necesita userId en el body
      if (data && data.success) {
        setReferralsList(data.referrals || []);
        setEarnings(data.earnings || 0);

        if (data.sys_percent !== undefined) setSysPercent(Number(data.sys_percent));
        if (data.sys_bonus !== undefined) setSysBonus(Number(data.sys_bonus));
      }
    } catch (error) {
      console.error("Error fetching referrals.");
    } finally {
      setLoading(false);
    }
  };

  const n1 = referralsList.length;

  const activeCount = referralsList.filter(r => r.is_human && Number(r.total_earnings || 0) >= 0.005).length;
  const fraudCount = referralsList.filter(r => !r.is_human).length;
  const pendingCount = n1 - activeCount - fraudCount;

  const gemEarnings = Number((Number(earnings) * 1000).toFixed(2));
  const inviteLink = `https://t.me/TeleGemAds_bot/app?startapp=${userId}`;

  const handleCopy = () => {
    if (!userId) return toast.error("Error al identificar la cuenta");
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast.success(t('ref_toast_copy_ok') || "¡Enlace copiado al portapapeles!"))
      .catch(() => toast.error(t('ref_toast_copy_fail') || "Error al copiar"));
  };

  const handleShare = () => {
    if (!userId) return toast.error("Error al identificar la cuenta");
    const text = t('share_text') || "💎 ¡Entra a mi red, completa misiones y gana recompensas cripto gratis! 🚀";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />

      <div style={modernStyles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          {Icons.network}
          <h4 style={{ margin: 0, color: '#F9FAFB', fontSize: '16px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {t('ref_title') || "RED DE AFILIADOS"}
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          <div style={{ ...modernStyles.statBox, borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ color: '#10B981', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '6px' }}>{t('ref_status_active') || "ACTIVOS"}</div>
            <div style={{ color: '#F3F4F6', fontSize: '24px', fontWeight: '900' }}>{activeCount}</div>
          </div>

          <div style={{ ...modernStyles.statBox, borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ color: '#F59E0B', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '6px' }}>{t('ref_status_pending') || "PENDIENTES"}</div>
            <div style={{ color: '#F3F4F6', fontSize: '24px', fontWeight: '900' }}>{pendingCount}</div>
          </div>

          <div style={{ ...modernStyles.statBox, borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ color: '#EF4444', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '6px' }}>BLOQUEADOS</div>
            <div style={{ color: '#F3F4F6', fontSize: '24px', fontWeight: '900' }}>{fraudCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ ...modernStyles.btnPrimary, flex: 1 }} onClick={handleShare}>
            {t('ref_btn_invite') || "🚀 INVITAR"}
          </button>
          <button style={{ ...modernStyles.btnOutline, flex: 1 }} onClick={handleCopy}>
            {t('ref_btn_copy') || "📋 COPIAR LINK"}
          </button>
        </div>
      </div>

      <div style={{ ...modernStyles.card, padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' }}>
        <div style={modernStyles.totalCard}>
          <div>
            <p style={{ fontSize: '11px', color: '#06B6D4', margin: '0 0 8px 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('ref_earnings_title') || "Comisiones Generadas"}
            </p>
            <p style={{ fontSize: '38px', fontWeight: '900', color: '#F9FAFB', margin: 0 }}>
              {gemEarnings} <span style={{ fontSize: '16px', color: '#9CA3AF' }}>💎</span>
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            {Icons.gem}
          </div>
        </div>
      </div>

      <div style={modernStyles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ color: '#D1D5DB', fontSize: '14px', margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('ref_network_title') || "🛰️ TU RED DE AFILIADOS"} ({n1})
          </h4>
          <button onClick={fetchReferrals} disabled={loading} style={{ background: 'transparent', border: 'none', color: '#06B6D4', cursor: loading ? 'not-allowed' : 'pointer', animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            {Icons.refresh}
          </button>
        </div>

        {loading && n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#06B6D4', fontSize: '13px', fontWeight: '800', letterSpacing: '1px' }}>{t('ref_syncing') || "SINCRONIZANDO NODOS..."}</div>
        ) : n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>{Icons.empty}</div>
            <span style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: '1.5', fontWeight: '600' }}>
              {t('ref_empty_desc') || "AÚN NO HAS INVITADO A NINGÚN USUARIO A TU RED."}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {referralsList.map((ref, idx) => {
              const avatarLetter = ref.username ? ref.username.charAt(0).toUpperCase() : 'U';

              // LÓGICA DINÁMICA DE CÁLCULO DE COMISIONES PARA LA VISTA
              const childTotalUSDT = Number(ref.total_earnings || 0);

              let generatedTotalUSDT = childTotalUSDT * (sysPercent / 100); 
              if (childTotalUSDT >= 0.005) {
                 generatedTotalUSDT += (sysBonus / 1000); 
              }
              const generatedGemas = Number((generatedTotalUSDT * 1000).toFixed(2));

              const isHuman = ref.is_human;
              const isActive = isHuman && childTotalUSDT >= 0.005;

              return (
                <div key={ref.id || idx} style={{ ...modernStyles.refItem, borderColor: isHuman ? (isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)') : 'rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '42px', height: '42px', borderRadius: '12px', 
                      background: isHuman ? (isActive ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(245, 158, 11, 0.1)') : 'rgba(239, 68, 68, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isHuman && isActive ? '#ffffff' : (isHuman ? '#F59E0B' : '#EF4444'), 
                      fontWeight: '800', fontSize: '16px',
                      border: isHuman && isActive ? 'none' : `1px solid ${isHuman ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      {avatarLetter}
                    </div>
                    <div>
                      <div style={{ color: '#F9FAFB', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>{ref.username || t('operator') || "Recluta"}</div>
                      <div style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', marginTop: '2px' }}>ID: {ref.id}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isHuman ? (
                      isActive ? (
                        <span style={{ color: '#10B981', fontSize: '10px', fontWeight: '800', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          ACTIVO
                        </span>
                      ) : (
                        <span style={{ color: '#F59E0B', fontSize: '10px', fontWeight: '800', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                          PENDIENTE
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#EF4444', fontSize: '10px', fontWeight: '800', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {Icons.shieldCross} CLON
                      </span>
                    )}

                    {isHuman && isActive && (
                       <div style={{ color: '#06B6D4', fontSize: '13px', fontWeight: '900', marginTop: '8px' }}>
                         +{generatedGemas} 💎
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', marginTop: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', margin: 0, lineHeight: '1.6', fontWeight: '600' }}>
            RENDIMIENTO CONTRACTUAL:<br/>
            <strong style={{color: '#10B981', fontSize: '12px', display: 'inline-block', margin: '4px 0'}}>{sysPercent}% POR MISIÓN + {sysBonus} GEMAS (BONO ÚNICO)</strong><br/>
            <span style={{ color: '#D1D5DB' }}>AL VALIDAR CADA REFERIDO EN TU RED.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
export default ShareTab;
