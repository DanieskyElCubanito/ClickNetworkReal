import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';

// --- ÍCONOS SVG PREMIUM (Sin Emojis) ---
const Icons = {
  verify: <svg width="14" height="14" viewBox="0 0 24 24" fill="#00ffaa" stroke="#000" strokeWidth="1" style={{ marginLeft: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  globe: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  lightning: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
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

  if (!userData) return null;

  const photoUrl = WebApp.initDataUnsafe?.user?.photo_url;
  const avatarLetter = userData?.username ? userData.username.charAt(0).toUpperCase() : 'U';

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('click_lang', newLang);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' },
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

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px', marginBottom: '16px',
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
          <p style={{ margin: '2px 0 8px 0', color: '#00f0ff', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>ID: {userData.id}</p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', padding: '4px 8px', fontSize: '9px', color: '#00f0ff', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Icons.globe} {userData.global_clicks || 0}
            </div>
            <div style={{ background: 'rgba(255, 20, 147, 0.1)', border: '1px solid rgba(255, 20, 147, 0.3)', borderRadius: '6px', padding: '4px 8px', fontSize: '9px', color: '#ff99dd', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Icons.lightning} {userData.received_clicks || 0}
            </div>
          </div>
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
                    // Convertimos la base de datos (USDT) a Gemas visuales (*1000)
                    const gemAmount = Math.floor(log.amount * 1000);
                    const isPositive = gemAmount >= 0;

                    return (
                      <div key={log.id} style={{...modalStyles.historyItem, borderColor: isPositive ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 20, 147, 0.2)'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff', flex: 1, paddingRight: '8px' }}>{log.title}</strong>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: isPositive ? '#00ffaa' : '#ff4b4b', whiteSpace: 'nowrap' }}>
                            {isPositive ? '+' : ''}{gemAmount} 💎
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>{log.description}</div>
                        <div style={{ fontSize: '9px', color: '#666', marginTop: '6px', textAlign: 'right' }}>
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
