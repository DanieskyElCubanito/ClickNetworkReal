import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

// 50 $TGM = 0.05 USD (1 USD = 1,000 $TGM)
const MIN_REFERRAL_TGM = 50;
const MIN_REFERRAL_USD = MIN_REFERRAL_TGM / 1000;

const Icons = {
  token: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E2C290" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="rgba(212, 175, 122, 0.12)" />
      <path d="M8 9h8M12 9v7" />
    </svg>
  ),
  network: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  empty: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  shieldCross: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  )
};

const modernStyles = {
  card: {
    background: slateCard,
    border: goldBorder,
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '14px',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
  },
  btnPrimary: {
    width: '100%',
    padding: '13px 14px',
    background: champagneGrad,
    color: '#0E151C',
    border: '1px solid rgba(226, 194, 144, 0.65)',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '13px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  btnOutline: {
    width: '100%',
    padding: '13px 14px',
    background: '#0E151C',
    color: '#F3F4F6',
    border: goldBorder,
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '13px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  statBox: {
    background: '#0E151C',
    border: goldBorder,
    borderRadius: '14px',
    padding: '14px 8px',
    textAlign: 'center'
  },
  totalCard: {
    background: slateCard,
    padding: '20px',
    borderRadius: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: goldBorder,
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
  },
  refItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0E151C',
    padding: '14px',
    borderRadius: '14px',
    border: goldBorder,
    marginBottom: '10px'
  }
};

function ShareTab({ stats, userId, totalReferralEarnings, t }) {
  const [referralsList, setReferralsList] = useState(stats?.referralsList || []);
  const [earnings, setEarnings] = useState(totalReferralEarnings || stats?.c1 || 0);
  const [loading, setLoading] = useState(false);

  const [sysPercent, setSysPercent] = useState(20);
  const [sysBonus, setSysBonus] = useState(5);

  useEffect(() => {
    if (userId) fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const data = await botApi.getReferrals();
      if (data && data.success) {
        setReferralsList(data.referrals || []);
        setEarnings(data.earnings || 0);

        if (data.sys_percent !== undefined) setSysPercent(Number(data.sys_percent));
        if (data.sys_bonus !== undefined) setSysBonus(Number(data.sys_bonus));
      }
    } catch {
      console.error('Error fetching referrals.');
    } finally {
      setLoading(false);
    }
  };

  const n1 = referralsList.length;

  const activeCount = referralsList.filter(
    r => r.is_human && Number(r.total_earnings || 0) >= MIN_REFERRAL_USD
  ).length;
  const fraudCount = referralsList.filter(r => !r.is_human).length;
  const pendingCount = n1 - activeCount - fraudCount;

  const tgmEarnings = Number((Number(earnings) * 1000).toFixed(2));
  const inviteLink = `https://t.me/TeleGemAds_bot/app?startapp=${userId}`;

  const handleCopy = () => {
    if (!userId) return toast.error('Error al identificar la cuenta');
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast.success(t('ref_toast_copy_ok') || '¡Enlace copiado al portapapeles!'))
      .catch(() => toast.error(t('ref_toast_copy_fail') || 'Error al copiar'));
  };

  const handleShare = () => {
    if (!userId) return toast.error('Error al identificar la cuenta');
    const text = t('share_text') || '¡Entra a mi red, completa misiones y gana recompensas cripto gratis!';
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '24px', color: '#F3F4F6' }}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#141D26',
            color: '#F3F4F6',
            border: goldBorder
          }
        }}
      />

      <div style={modernStyles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          {Icons.network}
          <h4 style={{ margin: 0, color: '#F3F4F6', fontSize: '15px', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {t('ref_title') || 'RED DE AFILIADOS'}
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '18px' }}>
          <div style={modernStyles.statBox}>
            <div style={{ color: '#E2C290', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {t('ref_status_active') || 'ACTIVOS'}
            </div>
            <div style={{ color: '#F3F4F6', fontSize: '22px', fontWeight: '900' }}>{activeCount}</div>
          </div>

          <div style={modernStyles.statBox}>
            <div style={{ color: '#D4AF7A', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {t('ref_status_pending') || 'PENDIENTES'}
            </div>
            <div style={{ color: '#F3F4F6', fontSize: '22px', fontWeight: '900' }}>{pendingCount}</div>
          </div>

          <div style={modernStyles.statBox}>
            <div style={{ color: '#94A3B8', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
              BLOQUEADOS
            </div>
            <div style={{ color: '#F3F4F6', fontSize: '22px', fontWeight: '900' }}>{fraudCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" style={{ ...modernStyles.btnPrimary, flex: 1 }} onClick={handleShare}>
            {t('ref_btn_invite') || 'INVITAR'}
          </button>
          <button type="button" style={{ ...modernStyles.btnOutline, flex: 1 }} onClick={handleCopy}>
            {t('ref_btn_copy') || 'COPIAR LINK'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <div style={modernStyles.totalCard}>
          <div>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 6px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              {t('ref_earnings_title') || 'Comisiones Generadas'}
            </p>
            <p style={{ fontSize: '32px', fontWeight: '900', color: '#E2C290', margin: 0 }}>
              {tgmEarnings} <span style={{ fontSize: '13px', color: '#94A3B8' }}>$TGM</span>
            </p>
          </div>
          <div
            style={{
              backgroundColor: '#0E151C',
              padding: '14px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: goldBorder
            }}
          >
            {Icons.token}
          </div>
        </div>
      </div>

      <div style={modernStyles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: '#F3F4F6', fontSize: '13px', margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('ref_network_title') || 'TU RED DE AFILIADOS'} ({n1})
          </h4>
          <button
            type="button"
            onClick={fetchReferrals}
            disabled={loading}
            style={{
              background: '#0E151C',
              border: goldBorder,
              borderRadius: '9px',
              padding: '6px 8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {Icons.refresh}
          </button>
        </div>

        {loading && n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#D4AF7A', fontSize: '12px', fontWeight: '800', letterSpacing: '0.8px' }}>
            {t('ref_syncing') || 'SINCRONIZANDO NODOS...'}
          </div>
        ) : n1 === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', backgroundColor: '#0E151C', borderRadius: '14px', border: goldBorder }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{Icons.empty}</div>
            <span style={{ color: '#94A3B8', fontSize: '12px', lineHeight: '1.5', fontWeight: '600' }}>
              {t('ref_empty_desc') || 'AÚN NO HAS INVITADO A NINGÚN USUARIO A TU RED.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
            {referralsList.map((ref, idx) => {
              const avatarLetter = ref.username ? ref.username.charAt(0).toUpperCase() : 'U';
              const childTotalUSDT = Number(ref.total_earnings || 0);

              let generatedTotalUSDT = childTotalUSDT * (sysPercent / 100);
              if (childTotalUSDT >= MIN_REFERRAL_USD) {
                generatedTotalUSDT += sysBonus / 1000;
              }
              const generatedTGM = Number((generatedTotalUSDT * 1000).toFixed(2));

              const isHuman = ref.is_human;
              const isActive = isHuman && childTotalUSDT >= MIN_REFERRAL_USD;

              return (
                <div key={ref.id || idx} style={modernStyles.refItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '11px',
                        background: isHuman && isActive ? champagneGrad : '#141D26',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isHuman && isActive ? '#0E151C' : '#E2C290',
                        fontWeight: '800',
                        fontSize: '15px',
                        border: goldBorder,
                        flexShrink: 0
                      }}
                    >
                      {avatarLetter}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ref.username || t('operator') || 'Recluta'}
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', marginTop: '2px' }}>
                        ID: {ref.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isHuman ? (
                      isActive ? (
                        <span style={{ color: '#0E151C', fontSize: '10px', fontWeight: '800', background: champagneGrad, padding: '4px 8px', borderRadius: '7px' }}>
                          ACTIVO
                        </span>
                      ) : (
                        <span style={{ color: '#D4AF7A', fontSize: '10px', fontWeight: '800', background: '#141D26', padding: '4px 8px', borderRadius: '7px', border: goldBorder }}>
                          PENDIENTE
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '10px', fontWeight: '800', background: '#141D26', padding: '4px 8px', borderRadius: '7px', border: goldBorder, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {Icons.shieldCross} CLON
                      </span>
                    )}

                    {isHuman && isActive && (
                      <div style={{ color: '#E2C290', fontSize: '12px', fontWeight: '900', marginTop: '6px' }}>
                        +{generatedTGM} $TGM
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: '#0E151C', borderRadius: '14px', padding: '14px', marginTop: '16px', border: goldBorder }}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: '1.55', fontWeight: '600' }}>
            RENDIMIENTO CONTRACTUAL:
            <br />
            <strong style={{ color: '#E2C290', fontSize: '12px', display: 'inline-block', margin: '4px 0' }}>
              {sysPercent}% POR MISIÓN + {sysBonus} $TGM (BONO ÚNICO)
            </strong>
            <br />
            <span style={{ color: '#F3F4F6' }}>
              AL ALCANZAR {MIN_REFERRAL_TGM} $TGM VALIDADO EN TU RED.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShareTab;
