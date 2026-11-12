import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Trazo fino: 1.8) ---
const Icons = {
  verify: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  lightning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  gem: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  gear: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 6 8c0 1 .25 1.99.72 2.87l.2.35c.75.98 1.08 2.05 1.08 2.78"/></svg>,
  bug: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="1.8"><path d="M22.32 10.25l-2.43-2.43"/><path d="M1.68 10.25l2.43-2.43"/><path d="M16 18l3 3"/><path d="M8 18l-3 3"/><path d="M12 2v4"/><path d="M20 14H4"/><path d="M8 14v4a4 4 0 0 0 8 0v-4"/><path d="M6 10h12a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2z"/></svg>
};

export default function ProfileHeader({ userData, t, lang, setLang }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [infoTab, setInfoTab] = useState('support'); 
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ESTADOS PARA ESTADÍSTICAS GLOBALES
  const [globalStats, setGlobalStats] = useState({ users: 0, withdrawn: 0, deposited: 0, daysOnline: 1 });
  const [loadingStats, setLoadingStats] = useState(true); 

  const photoUrl = WebApp.initDataUnsafe?.user?.photo_url;
  const avatarLetter = userData?.username ? userData.username.charAt(0).toUpperCase() : 'U';
  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    let isMounted = true;
    const fetchGlobalStats = async () => {
      try {
        const res = await fetch('/api', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ action: 'get-global-stats' })
        });
        const data = await res.json();
        if (isMounted && data.success && data.stats) {
          setGlobalStats(data.stats);
        }
      } catch (e) {
        console.error("Error cargando stats globales");
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };
    fetchGlobalStats();
    return () => { isMounted = false; };
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
        body: JSON.stringify({ action: 'get-history' }) // ID verificado en Backend
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

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const modalStyles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 7, 10, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(10px)' },
    card: { background: 'linear-gradient(145deg, #171923, #11131a)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', color: '#F3F4F6', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { margin: 0, fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' },
    closeBtn: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
    tabContainer: { display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' },
    tab: (active) => ({ flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', borderRadius: '12px', background: active ? '#ffffff' : 'transparent', color: active ? '#111827' : '#9CA3AF', border: 'none', transition: 'all 0.3s', textTransform: 'uppercase', letterSpacing: '0.5px' }),
    contentArea: { overflowY: 'auto', paddingRight: '4px', fontSize: '13px', lineHeight: '1.6', color: '#D1D5DB' },
    linkBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'center', textDecoration: 'none', color: '#F3F4F6', transition: 'background 0.2s' },
    langBtn: (active, color) => ({ padding: '14px', borderRadius: '16px', background: active ? `${color}20` : 'rgba(255,255,255,0.02)', border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.05)', color: active ? color : '#9CA3AF', fontWeight: '800', fontSize: '12px', cursor: 'pointer', flex: 1, textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }),
    historyItem: { backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }
  };

  if (!userData) return null;

  return (
    <>
      {/* 🛡️ PERFIL PRINCIPAL */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px', marginBottom: '16px',
        background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', position: 'relative',
        backdropFilter: 'blur(10px)'
      }}>
        {photoUrl ? (
          <img src={photoUrl} alt="Avatar" style={{ width: '52px', height: '52px', borderRadius: '50%', marginRight: '16px', border: '2px solid rgba(255,255,255,0.1)', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', color: '#ffffff', marginRight: '16px', border: '2px solid rgba(255,255,255,0.2)' }}>
            {avatarLetter}
          </div>
        )}

        <div>
          <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
            {userData.username || t('operator')}
            {userData.is_human && Icons.verify}
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '12px', fontWeight: '600', fontFamily: 'monospace' }}>ID: {userData.id}</p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={openHistory} style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}>
            {Icons.history}
          </button>
          <button onClick={() => setShowInfoModal(true)} style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '14px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}>
            {Icons.gear}
          </button>
        </div>
      </div>

      {/* 🚀 MINI DASHBOARD DE ESTADÍSTICAS GLOBALES */}
      {loadingStats ? (
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px dashed rgba(255, 255, 255, 0.1)', color: '#06B6D4', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '20px' }}>
          <style>{`@keyframes pulseStats { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }`}</style>
          <div style={{ animation: 'pulseStats 1.5s infinite' }}>Sincronizando Métrica...</div>
        </div>
      ) : (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {/* Tarjeta 1: Usuarios */}
          <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#8B5CF6' }}>{Icons.users}</div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Usuarios</div>
              <div style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: '900' }}>{formatNumber(globalStats.users)}</div>
            </div>
          </div>

          {/* Tarjeta 2: Retiros */}
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#F59E0B' }}>{Icons.gem}</div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Retirado</div>
              <div style={{ color: '#F59E0B', fontSize: '14px', fontWeight: '900' }}>{formatNumber(globalStats.withdrawn)}</div>
            </div>
          </div>

          {/* Tarjeta 3: Depósitos USDT */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#10B981' }}>{Icons.lightning}</div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Fondos Bóveda</div>
              <div style={{ color: '#10B981', fontSize: '14px', fontWeight: '900' }}>${formatNumber(globalStats.deposited)}</div>
            </div>
          </div>

          {/* Tarjeta 4: Días en línea */}
          <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#06B6D4' }}>{Icons.calendar}</div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Días en Línea</div>
              <div style={{ color: '#06B6D4', fontSize: '14px', fontWeight: '900' }}>{globalStats.daysOnline}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL */}
      {showHistoryModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={{...modalStyles.card, borderColor: 'rgba(6, 182, 212, 0.3)'}}>
            <div style={modalStyles.header}>
              <h3 style={{...modalStyles.title, color: '#06B6D4'}}>{Icons.history} Historial Global</h3>
              <button onClick={() => setShowHistoryModal(false)} style={modalStyles.closeBtn}>{Icons.close}</button>
            </div>

            <div style={modalStyles.contentArea}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#06B6D4', fontWeight: '800' }}>Sincronizando registros...</div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>No hay registros recientes.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historyLogs.map((log) => {
                    const usdtAmount = Number(log.amount);
                    const gemAmount = Math.abs(usdtAmount * 1000).toFixed(2);
                    const isPositive = usdtAmount >= 0;

                    return (
                      <div key={log.id} style={{...modalStyles.historyItem, borderColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#F9FAFB', flex: 1, paddingRight: '12px' }}>{log.title}</strong>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: isPositive ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                            {isPositive ? '+' : '-'}{gemAmount} 💎
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '1.5', fontWeight: '500' }} dangerouslySetInnerHTML={{ __html: log.description }} />

                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '10px', textAlign: 'right', fontWeight: '700' }}>
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

      {/* MODAL DE AJUSTES */}
      {showInfoModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={{...modalStyles.card, borderColor: 'rgba(139, 92, 246, 0.3)'}}>
            <div style={modalStyles.header}>
              <h3 style={{...modalStyles.title, color: '#8B5CF6'}}>{Icons.gear} Ajustes</h3>
              <button onClick={() => setShowInfoModal(false)} style={modalStyles.closeBtn}>{Icons.close}</button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => handleLanguageChange('es')} style={modalStyles.langBtn(lang === 'es', '#3B82F6')}>Español</button>
              <button onClick={() => handleLanguageChange('en')} style={modalStyles.langBtn(lang === 'en', '#06B6D4')}>English</button>
            </div>

            <div style={modalStyles.tabContainer}>
              <button onClick={() => setInfoTab('support')} style={modalStyles.tab(infoTab === 'support')}>{t('support_tab')}</button>
              <button onClick={() => setInfoTab('about')} style={modalStyles.tab(infoTab === 'about')}>{t('about_tab')}</button>
              <button onClick={() => setInfoTab('terms')} style={modalStyles.tab(infoTab === 'terms')}>{t('terms_tab')}</button>
            </div>

            <div style={modalStyles.contentArea}>
              {infoTab === 'support' && (
                <div className="fade-in">
                  <h4 style={{ color: '#F3F4F6', marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('support_title')}</h4>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={{...modalStyles.linkBox, borderColor: 'rgba(245, 158, 11, 0.3)'}}>
                    <div style={{ color: '#F59E0B' }}>{Icons.bulb}</div>
                    <div>
                      <div style={{ fontWeight: '800', color: '#F59E0B', fontSize: '13px' }}>{t('support_idea_title')}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', fontWeight: '500' }}>{t('support_idea_desc')} <b style={{color: '#D1D5DB'}}>@TheDannyWeb3</b>.</div>
                    </div>
                  </a>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={{ ...modalStyles.linkBox, borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                    <div style={{ color: '#EC4899' }}>{Icons.bug}</div>
                    <div>
                      <div style={{ fontWeight: '800', color: '#EC4899', fontSize: '13px' }}>{t('support_bug_title')}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', fontWeight: '500' }}>{t('support_bug_desc')} <b style={{color: '#D1D5DB'}}>@TheDannyWeb3</b>.</div>
                    </div>
                  </a>
                </div>
              )}
              {infoTab === 'about' && (
                <div className="fade-in">
                  <h4 style={{ color: '#F3F4F6', marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('about_title')}</h4>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ marginBottom: '14px', marginTop: 0 }}>{t('about_p1')}</p>
                    <p style={{ marginBottom: '14px' }}>{t('about_p2')}</p>
                    <p style={{ margin: 0 }}>{t('about_p3')}</p>
                  </div>
                  <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#6B7280', fontWeight: '800', fontFamily: 'monospace' }}>
                    Versión 2.0.0 (Build MVP Web3)
                  </div>
                </div>
              )}
              {infoTab === 'terms' && (
                <div className="fade-in">
                  <h4 style={{ color: '#F3F4F6', marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('terms_title')}</h4>
                  <p style={{ fontSize: '12px', marginBottom: '16px', color: '#9CA3AF', fontWeight: '600' }}>{t('terms_subtitle')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[t('terms_1'), t('terms_2'), t('terms_3'), t('terms_4')].map((term, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', borderLeft: '3px solid #10B981', fontWeight: '500' }}>
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
