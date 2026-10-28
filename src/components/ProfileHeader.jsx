import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Sin Emojis) ---
const Icons = {
  verify: <svg width="14" height="14" viewBox="0 0 24 24" fill="#00ffaa" stroke="#000" strokeWidth="1" style={{ marginLeft: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  lightning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  gem: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  gear: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff99dd" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff41b4" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 6 8c0 1 .25 1.99.72 2.87l.2.35c.75.98 1.08 2.05 1.08 2.78"/></svg>,
  bug: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff1493" strokeWidth="2"><path d="M22.32 10.25l-2.43-2.43"/><path d="M1.68 10.25l2.43-2.43"/><path d="M16 18l3 3"/><path d="M8 18l-3 3"/><path d="M12 2v4"/><path d="M20 14H4"/><path d="M8 14v4a4 4 0 0 0 8 0v-4"/><path d="M6 10h12a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2z"/></svg>
};

export default function ProfileHeader({ userData, t, lang, setLang }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [infoTab, setInfoTab] = useState('support'); 
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // 🛠️ NUEVO ESTADO: Estadísticas Globales
  const [globalStats, setGlobalStats] = useState({ users: 0, withdrawn: 0, deposited: 0, daysOnline: 1 });

  const photoUrl = WebApp.initDataUnsafe?.user?.photo_url;
  const avatarLetter = userData?.username ? userData.username.charAt(0).toUpperCase() : 'U';
  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const res = await fetch('/api', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ action: 'get-global-stats' })
        });
        const data = await res.json();
        if (data.success && data.stats) {
          setGlobalStats(data.stats);
        }
      } catch (e) {
        console.error("Error cargando stats globales");
      }
    };
    fetchGlobalStats();
  }, []);

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('click_lang', newLang);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-history', userId: userData.id })
      });
      const data = await res.json();
      if (data.success && data.history) {
        setHistoryLogs(data.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistory = () => {
    setShowHistoryModal(true);
    fetchHistory();
  };

  const renderDescription = (desc) => {
    if (!desc) return desc;
    const parts = desc.split(/([UuEe][Qq][a-zA-Z0-9_-]{6,}(?:\.\.\.)?)/g);

    if (parts.length > 1) {
      return (
        <>
          {parts.map((part, index) => {
            if (part && part.match(/^[UuEe][Qq]/)) {
              return (
                <span key={index} onClick={(e) => {
                  e.stopPropagation();
                  WebApp.openLink('https://tonviewer.com');
                }} style={{ color: '#00f0ff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
                  {part}
                </span>
              );
            }
            return part;
          })}
        </>
      );
    }
    return desc;
  };

  // 🛠️ FUNCIÓN PARA FORMATEAR NÚMEROS GRANDES (Ej. 1500 -> 1.5K)
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const modalStyles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(5px)' },
    card: { background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.95), rgba(20, 8, 38, 0.95))', border: '1px solid #00f0ff', borderRadius: '24px', padding: '20px', width: '100%', maxWidth: '360px', boxShadow: '0 8px 30px rgba(0, 240, 255, 0.2)', color: '#fff', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title: { margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' },
    closeBtn: { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 65, 180, 0.5)', borderRadius: '10px', padding: '6px 6px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
    tabContainer: { display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(138, 43, 226, 0.5)' },
    tab: (active) => ({ flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: '900', textAlign: 'center', cursor: 'pointer', borderRadius: '10px', background: active ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: active ? '#fff' : '#aaa', border: 'none', transition: '0.2s' }),
    contentArea: { overflowY: 'auto', paddingRight: '4px', fontSize: '13px', lineHeight: '1.6', color: '#ddd' },
    linkBox: { background: 'rgba(0, 240, 255, 0.05)', border: '1px solid #00f0ff', padding: '16px', borderRadius: '16px', marginBottom: '12px', display: 'flex', gap: '14px', alignItems: 'center', textDecoration: 'none', color: '#fff' },
    langBtn: (active, color) => ({ padding: '10px 16px', borderRadius: '12px', background: active ? `${color}22` : 'transparent', border: `1px solid ${color}`, color: active ? color : '#888', fontWeight: '900', fontSize: '12px', cursor: 'pointer', flex: 1, textTransform: 'uppercase' }),
    historyItem: { backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(138, 43, 226, 0.3)', marginBottom: '8px' }
  };

  if (!userData) return null;

  return (
    <>
      {/* 🛡️ PERFIL PRINCIPAL */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px', marginBottom: '12px',
        background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))', border: '1.5px solid #8a2be2',
        borderRadius: '24px', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.2)', position: 'relative'
      }}>
        {photoUrl ? (
          <img src={photoUrl} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', marginRight: '14px', border: '2px solid #00f0ff', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f0ff, #ff1493)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#ffffff', marginRight: '14px', border: '2px solid #00f0ff', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
            {avatarLetter}
          </div>
        )}

        <div>
          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
            {userData.username || t('operator')}
            {userData.is_human && Icons.verify}
          </h3>
          <p style={{ margin: '2px 0 0 0', color: '#00f0ff', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>ID: {userData.id}</p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={openHistory} style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
            {Icons.history}
          </button>
          <button onClick={() => setShowInfoModal(true)} style={{ background: 'rgba(255, 153, 221, 0.1)', border: '1px solid rgba(255, 153, 221, 0.3)', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
            {Icons.gear}
          </button>
        </div>
      </div>

      {/* 🚀 NUEVO: MINI DASHBOARD DE ESTADÍSTICAS GLOBALES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        
        {/* Tarjeta 1: Usuarios */}
        <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', padding: '6px', borderRadius: '10px' }}>{Icons.users}</div>
          <div>
            <div style={{ color: '#aaa', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Usuarios</div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}>{formatNumber(globalStats.users)}</div>
          </div>
        </div>

        {/* Tarjeta 2: Retiros */}
        <div style={{ background: 'rgba(0, 255, 170, 0.05)', border: '1px solid rgba(0, 255, 170, 0.3)', borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(0, 255, 170, 0.15)', color: '#00ffaa', padding: '6px', borderRadius: '10px' }}>{Icons.gem}</div>
          <div>
            <div style={{ color: '#aaa', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Retirado</div>
            <div style={{ color: '#00ffaa', fontSize: '14px', fontWeight: '900' }}>{formatNumber(globalStats.withdrawn)}</div>
          </div>
        </div>

        {/* Tarjeta 3: Depósitos USDT */}
        <div style={{ background: 'rgba(255, 20, 147, 0.05)', border: '1px solid rgba(255, 20, 147, 0.3)', borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 20, 147, 0.15)', color: '#ff1493', padding: '6px', borderRadius: '10px' }}>{Icons.lightning}</div>
          <div>
            <div style={{ color: '#aaa', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Fondos Bóveda</div>
            <div style={{ color: '#ff99dd', fontSize: '14px', fontWeight: '900' }}>${formatNumber(globalStats.deposited)}</div>
          </div>
        </div>

        {/* Tarjeta 4: Días en línea */}
        <div style={{ background: 'rgba(255, 230, 0, 0.05)', border: '1px solid rgba(255, 230, 0, 0.3)', borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 230, 0, 0.15)', color: '#ffe600', padding: '6px', borderRadius: '10px' }}>{Icons.calendar}</div>
          <div>
            <div style={{ color: '#aaa', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Días en Línea</div>
            <div style={{ color: '#ffe600', fontSize: '14px', fontWeight: '900' }}>{globalStats.daysOnline}</div>
          </div>
        </div>

      </div>

      {showHistoryModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={{...modalStyles.card, borderColor: '#ffe600'}}>
            <div style={modalStyles.header}>
              <h3 style={{...modalStyles.title, color: '#ffe600'}}>{Icons.history} Historial Global</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{...modalStyles.closeBtn, borderColor: '#ffe600'}}>{Icons.close}</button>
            </div>

            <div style={modalStyles.contentArea}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#ffe600', fontWeight: 'bold' }}>Cargando datos...</div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#ffe600', opacity: 0.7 }}>No hay registros recientes.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historyLogs.map((log) => {
                    const usdtAmount = Number(log.amount);
                    const gemAmount = Math.abs(usdtAmount * 1000).toFixed(2);
                    const isPositive = usdtAmount >= 0;

                    return (
                      <div key={log.id} style={{...modalStyles.historyItem, borderColor: isPositive ? 'rgba(0, 255, 170, 0.3)' : 'rgba(255, 75, 75, 0.3)'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff', flex: 1, paddingRight: '8px' }}>{log.title}</strong>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: isPositive ? '#00ffaa' : '#ff4b4b', whiteSpace: 'nowrap' }}>
                            {isPositive ? '+' : '-'}{gemAmount} 💎
                          </span>
                        </div>

// 🔥 CÓDIGO NUEVO (Arregla el enlace de Tonscan y el error visual)
<div 
  style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.4' }} 
  dangerouslySetInnerHTML={{ __html: log.description }} 
/>


                        <div style={{ fontSize: '9px', color: '#666', marginTop: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={{...modalStyles.card, borderColor: '#ff99dd'}}>
            <div style={modalStyles.header}>
              <h3 style={{...modalStyles.title, color: '#ff99dd'}}>{Icons.gear} Ajustes</h3>
              <button onClick={() => setShowInfoModal(false)} style={modalStyles.closeBtn}>{Icons.close}</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button onClick={() => handleLanguageChange('es')} style={modalStyles.langBtn(lang === 'es', '#ff1493')}>Español</button>
              <button onClick={() => handleLanguageChange('en')} style={modalStyles.langBtn(lang === 'en', '#00f0ff')}>English</button>
            </div>

            <div style={modalStyles.tabContainer}>
              <button onClick={() => setInfoTab('support')} style={modalStyles.tab(infoTab === 'support')}>{t('support_tab')}</button>
              <button onClick={() => setInfoTab('about')} style={modalStyles.tab(infoTab === 'about')}>{t('about_tab')}</button>
              <button onClick={() => setInfoTab('terms')} style={modalStyles.tab(infoTab === 'terms')}>{t('terms_tab')}</button>
            </div>

            <div style={modalStyles.contentArea}>
              {infoTab === 'support' && (
                <div className="fade-in">
                  <h4 style={{ color: '#00f0ff', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>{t('support_title')}</h4>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={modalStyles.linkBox}>
                    <div style={{ background: 'rgba(0, 240, 255, 0.2)', padding: '10px', borderRadius: '12px' }}>{Icons.bulb}</div>
                    <div>
                      <div style={{ fontWeight: '900', color: '#00f0ff', fontSize: '14px' }}>{t('support_idea_title')}</div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>{t('support_idea_desc')} <b style={{color: '#fff'}}>@TheDannyWeb3</b>.</div>
                    </div>
                  </a>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={{ ...modalStyles.linkBox, borderColor: '#ff1493', background: 'rgba(255, 20, 147, 0.05)' }}>
                    <div style={{ background: 'rgba(255, 20, 147, 0.2)', padding: '10px', borderRadius: '12px' }}>{Icons.bug}</div>
                    <div>
                      <div style={{ fontWeight: '900', color: '#ff41b4', fontSize: '14px' }}>{t('support_bug_title')}</div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>{t('support_bug_desc')} <b style={{color: '#fff'}}>@TheDannyWeb3</b>.</div>
                    </div>
                  </a>
                </div>
              )}
              {infoTab === 'about' && (
                <div className="fade-in">
                  <h4 style={{ color: '#ffe600', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>{t('about_title')}</h4>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 230, 0, 0.3)' }}>
                    <p style={{ marginBottom: '10px', marginTop: 0 }}>{t('about_p1')}</p>
                    <p style={{ marginBottom: '10px' }}>{t('about_p2')}</p>
                    <p style={{ margin: 0 }}>{t('about_p3')}</p>
                  </div>
                  <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#666', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    Versión 2.0.0 (Build MVP Gemas)
                  </div>
                </div>
              )}
              {infoTab === 'terms' && (
                <div className="fade-in">
                  <h4 style={{ color: '#00ffaa', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>{t('terms_title')}</h4>
                  <p style={{ fontSize: '12px', marginBottom: '12px', color: '#ff99dd', fontWeight: 'bold' }}>{t('terms_subtitle')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[t('terms_1'), t('terms_2'), t('terms_3'), t('terms_4')].map((term, i) => (
                      <div key={i} style={{ background: 'rgba(0, 255, 170, 0.05)', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #00ffaa' }}>
                        {term}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
