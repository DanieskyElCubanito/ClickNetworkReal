import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateSurface = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const Icons = {
  verify: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E2C290" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  gear: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(11, 17, 23, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 100000,
    backdropFilter: 'blur(8px)'
  },
  card: {
    background: slateSurface,
    border: goldBorder,
    borderRadius: '18px',
    padding: '20px',
    width: '100%',
    maxWidth: '370px',
    color: '#F3F4F6',
    maxHeight: '82vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 40px rgba(11, 17, 23, 0.6), inset 0 1px 0 rgba(226, 194, 144, 0.16)'
  },
  content: {
    overflowY: 'auto',
    paddingRight: '4px',
    fontSize: '13px',
    lineHeight: '1.55',
    color: '#94A3B8'
  },
  logBox: {
    backgroundColor: '#0E151C',
    padding: '12px',
    borderRadius: '12px',
    border: goldBorder,
    marginBottom: '10px'
  }
};

export default function ProfileHeader({ userData, t, lang, setLang }) {
  const [modalMode, setModalMode] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  if (!userData) return null;

  const photoUrl = WebApp.initDataUnsafe?.user?.photo_url;
  const displayName =
    userData?.username && userData.username !== 'Usuario'
      ? userData.username
      : WebApp.initDataUnsafe?.user?.first_name || 'User123';
  const avatarLetter = String(displayName).charAt(0).toUpperCase() || 'U';
  const currentLang = String(lang || 'es').toLowerCase();

  const apiHeaders = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': WebApp.initData || ''
  };

  const handleToggleLanguage = () => {
    const nextLang = currentLang === 'es' ? 'en' : 'es';
    if (typeof setLang === 'function') setLang(nextLang);
    try {
      localStorage.setItem('click_lang', nextLang);
    } catch {}
  };

  const openSupport = () => {
    try {
      WebApp.openTelegramLink('https://t.me/TheDannyWeb3');
    } catch {
      window.open('https://t.me/TheDannyWeb3', '_blank');
    }
  };

  const openHistory = async () => {
    setModalMode('history');
    setLoadingHistory(true);
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ action: 'get-history' })
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.history)) {
        setHistoryLogs(data.history);
      }
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 2px 10px 2px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Avatar"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: goldBorder,
                objectFit: 'cover'
              }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: slateSurface,
                border: goldBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '800',
                color: '#E2C290'
              }}
            >
              {avatarLetter}
            </div>
          )}

          <span
            style={{
              color: '#F3F4F6',
              fontSize: '15px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {displayName}
            {userData.is_human && Icons.verify}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleLanguage}
          style={{
            background: '#141D26',
            border: goldBorder,
            borderRadius: '10px',
            padding: '6px 10px',
            color: '#F3F4F6',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          {Icons.gear}
          <span>Idioma: {currentLang.toUpperCase()}</span>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 2px 14px 2px',
          borderBottom: '1px solid rgba(212, 175, 122, 0.2)',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={openSupport}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            padding: '2px',
            textTransform: 'uppercase'
          }}
        >
          {t?.('support_tab') || 'SOPORTE'}
        </button>

        <button
          type="button"
          onClick={() => setModalMode('about')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            padding: '2px',
            textTransform: 'uppercase'
          }}
        >
          {t?.('about_tab') || 'ACERCA'}
        </button>

        <button
          type="button"
          onClick={() => setModalMode('terms')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            padding: '2px',
            textTransform: 'uppercase'
          }}
        >
          {t?.('terms_tab') || 'TÉRMINOS'}
        </button>

        <button
          type="button"
          onClick={openHistory}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {Icons.clock}
          <span>{t?.('home_history') || 'Historial'}</span>
        </button>
      </div>

      {modalMode && (
        <div style={modalStyles.overlay} onClick={() => setModalMode(null)}>
          <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#F3F4F6' }}>
                {modalMode === 'about' && (t?.('about_title') || 'Acerca de la Plataforma')}
                {modalMode === 'terms' && (t?.('terms_title') || 'Términos y Condiciones')}
                {modalMode === 'history' && (t?.('home_history') || 'Historial de Actividad')}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  background: '#0E151C',
                  border: goldBorder,
                  borderRadius: '9px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {Icons.close}
              </button>
            </div>

            <div style={modalStyles.content}>
              {modalMode === 'about' && (
                <div>
                  <p style={{ marginTop: 0, color: '#F3F4F6' }}>
                    {t?.('about_p1') || 'Plataforma de campañas, tráfico y recompensas en Telegram.'}
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    {t?.('about_p2') || 'Conversión fija: 1 USD = 1,000 Créditos / $TGM.'}
                  </p>
                </div>
              )}

              {modalMode === 'terms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    t?.('terms_1') || 'Una sola cuenta por dispositivo y usuario.',
                    t?.('terms_2') || 'Prohibido el uso de scripts o bots automatizados.',
                    t?.('terms_3') || 'Los fondos de campaña se destinan exclusivamente a anuncios.',
                    t?.('terms_4') || 'El abandono prematuro de canales puede aplicar sanciones.'
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        ...modalStyles.logBox,
                        borderLeft: '3px solid #D4AF7A',
                        color: '#F3F4F6'
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {modalMode === 'history' && (
                loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#D4AF7A' }}>
                    Cargando registros...
                  </div>
                ) : historyLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                    Sin movimientos registrados.
                  </div>
                ) : (
                  historyLogs.map((log, idx) => {
                    const usdAmt = Number(log.amount || 0);
                    const tgmAmt = Math.abs(usdAmt * 1000).toFixed(0);
                    const isPositive = usdAmt >= 0;
                    return (
                      <div key={log.id || idx} style={modalStyles.logBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ color: '#F3F4F6', fontSize: '12px' }}>{log.title}</strong>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '800',
                              color: isPositive ? '#E2C290' : '#94A3B8',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isPositive ? '+' : '-'}{tgmAmt} $TGM
                          </span>
                        </div>
                        {log.description && (
                          <div
                            style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}
                            dangerouslySetInnerHTML={{ __html: log.description }}
                          />
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalMode(null)}
              style={{
                marginTop: '14px',
                width: '100%',
                padding: '10px',
                background: champagneGrad,
                color: '#0E151C',
                border: '1px solid rgba(226, 194, 144, 0.65)',
                borderRadius: '11px',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
