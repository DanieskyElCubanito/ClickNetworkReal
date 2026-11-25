import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import toast from 'react-hot-toast';

const formatCompactNumber = (num) => {
  const n = Number(num || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const formatCompactUsd = (num) => {
  const n = Number(num || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const styles = {
  wrapper: {
    color: '#F3F4F6',
    paddingBottom: '24px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 4px',
    marginBottom: '8px'
  },
  userGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatarBox: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#E5E7EB',
    fontWeight: '800',
    fontSize: '14px'
  },
  userName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: '0.2px'
  },
  langBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '6px 10px',
    color: '#E5E7EB',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  subLinksBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 4px 14px 4px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  subLinkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.6px',
    cursor: 'pointer',
    padding: '4px 2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    textTransform: 'uppercase'
  },
  panelCard: {
    background: 'linear-gradient(180deg, rgba(22, 28, 38, 0.92) 0%, rgba(12, 16, 23, 0.96) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '14px',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  },
  panelTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#F3F4F6',
    margin: '0 0 14px 0',
    letterSpacing: '0.2px'
  },
  sectionHeading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#F3F4F6',
    margin: '18px 2px 10px 2px',
    letterSpacing: '0.2px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px 18px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: '2px'
  },
  statValue: {
    fontSize: '21px',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '-0.3px'
  },
  balanceSubLabel: {
    fontSize: '13px',
    color: '#D1D5DB',
    fontWeight: '600',
    marginBottom: '4px'
  },
  balanceBig: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '-0.5px',
    marginBottom: '4px'
  },
  balanceEquiv: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '14px'
  },
  actionBtn: {
    width: '100%',
    padding: '11px 16px',
    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '10px',
    color: '#F9FAFB',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    transition: 'all 0.2s ease'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 8, 13, 0.82)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px',
    zIndex: 100000
  },
  modalBox: {
    width: '100%',
    maxWidth: '380px',
    background: '#111620',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '18px',
    padding: '20px',
    color: '#F3F4F6',
    maxHeight: '75vh',
    overflowY: 'auto'
  }
};

export default function HomeTab({ userData, setUserData, setActiveTab, t, lang, setLang }) {
  const [globalStats, setGlobalStats] = useState({
    users: 0,
    withdrawn: 0,
    deposited: 0,
    daysOnline: 1
  });
  const [infoModal, setInfoModal] = useState(null); // 'about' | 'terms' | 'history' | null
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const apiHeaders = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': WebApp.initData || ''
  };

  useEffect(() => {
    let active = true;
    fetch('/api', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ action: 'get-global-stats' })
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.success && data.stats) {
          setGlobalStats({
            users: Number(data.stats.users || 0),
            withdrawn: Number(data.stats.withdrawn || 0),
            deposited: Number(data.stats.deposited || 0),
            daysOnline: Number(data.stats.daysOnline || 1)
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const openHistoryModal = async () => {
    setInfoModal('history');
    setLoadingHistory(true);
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ action: 'get-history' })
      });
      const data = await res.json();
      if (data?.success) setHistoryItems(data.history || []);
    } catch {
      toast.error('No se pudo cargar el historial.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleLanguage = () => {
    if (typeof setLang === 'function') {
      setLang((prev) => (prev === 'es' ? 'en' : 'es'));
    } else {
      toast('Configuración de idioma disponible desde el selector principal.');
    }
  };

  const openSupport = () => {
    try {
      WebApp.openTelegramLink('https://t.me/TheDannyWeb3');
    } catch {
      window.open('https://t.me/TheDannyWeb3', '_blank');
    }
  };

  const goToWallet = (mode) => {
    try {
      localStorage.setItem('preferred_wallet_tab', mode);
    } catch {}
    if (typeof setActiveTab === 'function') setActiveTab('wallet');
  };

  const displayName =
    userData?.username && userData.username !== 'Usuario'
      ? userData.username
      : WebApp.initDataUnsafe?.user?.first_name || 'User123';

  const initialLetter = String(displayName).charAt(0).toUpperCase() || 'U';
  const currentLangLabel = String(lang || 'es').toUpperCase();

  // deposit_balance en USD -> Créditos (1 USD = 1000 Créditos)
  const vaultUsd = Number(userData?.deposit_balance || 0);
  const creditsEquiv = Math.floor(vaultUsd * 1000);

  // balance en USD -> $TGM (1 USD = 1000 $TGM)
  const withdrawableUsd = Number(userData?.balance || 0);
  const tgmBalance = Number((withdrawableUsd * 1000).toFixed(0));

  return (
    <div style={styles.wrapper} className="fade-in">
      {/* Cabecera superior */}
      <div style={styles.topBar}>
        <div style={styles.userGroup}>
          <div style={styles.avatarBox}>{initialLetter}</div>
          <span style={styles.userName}>{displayName}</span>
        </div>

        <button type="button" onClick={toggleLanguage} style={styles.langBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>{t?.('home_lang_label') || `Idioma: ${currentLangLabel}`}</span>
        </button>
      </div>

      {/* Enlaces secundarios */}
      <div style={styles.subLinksBar}>
        <button type="button" onClick={openSupport} style={styles.subLinkBtn}>
          {t?.('home_support') || 'SOPORTE'}
        </button>
        <button type="button" onClick={() => setInfoModal('about')} style={styles.subLinkBtn}>
          {t?.('home_about') || 'ACERCA'}
        </button>
        <button type="button" onClick={() => setInfoModal('terms')} style={styles.subLinkBtn}>
          {t?.('home_terms') || 'TÉRMINOS'}
        </button>
        <button type="button" onClick={openHistoryModal} style={styles.subLinkBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          <span>{t?.('home_history') || 'Historial'}</span>
        </button>
      </div>

      {/* Datos Globales */}
      <div style={styles.panelCard}>
        <h3 style={styles.panelTitle}>{t?.('home_global_data') || 'Datos Globales'}</h3>
        <div style={styles.statsGrid}>
          <div>
            <div style={styles.statLabel}>{t?.('home_stat_users') || 'Usuarios:'}</div>
            <div style={styles.statValue}>{globalStats.users}</div>
          </div>
          <div>
            <div style={styles.statLabel}>{t?.('home_stat_withdrawn') || 'Retirado:'}</div>
            <div style={styles.statValue}>{formatCompactNumber(globalStats.withdrawn)}</div>
          </div>
          <div>
            <div style={styles.statLabel}>{t?.('home_stat_vault') || 'Fondos Bóveda:'}</div>
            <div style={styles.statValue}>{formatCompactUsd(globalStats.deposited)}</div>
          </div>
          <div>
            <div style={styles.statLabel}>{t?.('home_stat_days') || 'Días en Línea:'}</div>
            <div style={styles.statValue}>{globalStats.daysOnline}</div>
          </div>
        </div>
      </div>

      {/* Fondo de Campaña */}
      <h3 style={styles.sectionHeading}>{t?.('home_campaign_fund') || 'Fondo de Campaña'}</h3>

      <div style={styles.panelCard}>
        <div style={styles.balanceSubLabel}>
          {t?.('home_vault_usd_label') || 'USD (Fondos para Campañas)'}
        </div>
        <div style={styles.balanceBig}>{vaultUsd.toFixed(2)} USD</div>
        <div style={styles.balanceEquiv}>
          {(t?.('home_credits_equiv') || 'Equivale a {credits} CRÉDITOS').replace(
            '{credits}',
            creditsEquiv.toFixed(2)
          )}
        </div>
        <button type="button" onClick={() => goToWallet('deposit')} style={styles.actionBtn}>
          {t?.('home_btn_deposit') || 'Depositar'}
        </button>
      </div>

      <div style={styles.panelCard}>
        <div style={styles.balanceSubLabel}>
          {t?.('home_withdrawable_label') || 'Saldo Retirable ($TGM)'}
        </div>
        <div style={styles.balanceBig}>{tgmBalance.toLocaleString('en-US')} $TGM</div>
        <div style={styles.balanceEquiv}>
          {t?.('home_rate_info') || '1000 $TGM = 1 USD'}
        </div>
        <button type="button" onClick={() => goToWallet('withdraw')} style={styles.actionBtn}>
          {t?.('home_btn_withdraw') || 'Retirar'}
        </button>
      </div>

      {/* Modal informativo / historial */}
      {infoModal && (
        <div style={styles.modalOverlay} onClick={() => setInfoModal(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                {infoModal === 'about' && 'Acerca de la Plataforma'}
                {infoModal === 'terms' && 'Términos de Uso'}
                {infoModal === 'history' && 'Historial Reciente'}
              </h4>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {infoModal === 'about' && (
              <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5, margin: 0 }}>
                Red publicitaria y de misiones en Telegram con conversión fija de 1,000 $TGM / Créditos = 1 USD.
              </p>
            )}

            {infoModal === 'terms' && (
              <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5, margin: 0 }}>
                Se prohíben las cuentas múltiples, el uso de bots automatizados y el abandono prematuro de canales verificados.
              </p>
            )}

            {infoModal === 'history' && (
              loadingHistory ? (
                <div style={{ fontSize: '12px', color: '#9CA3AF', padding: '12px 0' }}>Cargando movimientos...</div>
              ) : historyItems.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9CA3AF', padding: '12px 0' }}>Sin movimientos registrados aún.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historyItems.slice(0, 15).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px',
                        padding: '10px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#F9FAFB' }}>{item.title || 'Movimiento'}</div>
                      {item.description && (
                        <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '2px' }}>{item.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
