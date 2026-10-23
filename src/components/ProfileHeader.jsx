import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

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
    card: { background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.95), rgba(20, 8, 38, 0.95))', border: '2px solid #00f0ff', borderRadius: '24px', padding: '20px', width: '100%', maxWidth: '360px', boxShadow: '0 8px 30px rgba(0, 240, 255, 0.2)', color: '#fff', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title: { margin: 0, fontSize: '18px', fontWeight: '900', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '1px' },
    closeBtn: { background: 'rgba(255, 255, 255, 0.1)', border: '1px solid #ff1493', borderRadius: '10px', padding: '6px 12px', color: '#ff99dd', fontWeight: '900', cursor: 'pointer' },
    tabContainer: { display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '14px' },
    tab: (active) => ({ flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: '900', textAlign: 'center', cursor: 'pointer', borderRadius: '10px', background: active ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: active ? '#fff' : '#aaa', border: 'none', transition: '0.2s' }),
    contentArea: { overflowY: 'auto', paddingRight: '4px', fontSize: '13px', lineHeight: '1.6', color: '#ddd' },
    linkBox: { background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', padding: '12px', borderRadius: '12px', marginBottom: '12px', display: 'block', textDecoration: 'none', color: '#fff' },
    langBtn: (active, color) => ({ padding: '8px 16px', borderRadius: '10px', background: active ? color : 'transparent', border: `1px solid ${color}`, color: active ? (color === '#00f0ff' ? '#000' : '#fff') : color, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', flex: 1 }),
    historyItem: { backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '14px', border: '1px solid #3d1b63', marginBottom: '8px' }
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 16px', marginBottom: '16px',
        background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))', border: '1.5px solid #8a2be2',
        borderRadius: '20px', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.2)', position: 'relative'
      }}>
        {photoUrl ? (
          <img src={photoUrl} alt="Avatar" style={{ width: '46px', height: '46px', borderRadius: '50%', marginRight: '14px', border: '2px solid #00f0ff', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f0ff, #ff1493)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#ffffff', marginRight: '14px', border: '2px solid #00f0ff', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
            {avatarLetter}
          </div>
        )}

        <div>
          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {userData.username || t('operator')}
            <span style={{ background: 'rgba(255, 20, 147, 0.2)', border: '1px solid #ff1493', color: '#ff99dd', padding: '2px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>
              {t('verified')}
            </span>
          </h3>
          <p style={{ margin: '2px 0 6px 0', color: '#00f0ff', fontSize: '11px', fontWeight: '900' }}>ID: {userData.id}</p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', padding: '2px 6px', fontSize: '9px', color: '#00f0ff', fontWeight: '900', textTransform: 'uppercase' }}>
              🌍 {t('profile_global') || 'Globales'}: {userData.global_clicks || 0}
            </div>
            <div style={{ background: 'rgba(255, 20, 147, 0.1)', border: '1px solid rgba(255, 20, 147, 0.3)', borderRadius: '6px', padding: '2px 6px', fontSize: '9px', color: '#ff99dd', fontWeight: '900', textTransform: 'uppercase' }}>
              ⚡ {t('profile_earned') || 'Recibidos'}: {userData.received_clicks || 0}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={openHistory} style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)', color: '#fff' }}>
            🕒
          </button>
          <button onClick={() => setShowInfoModal(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #8a2be2', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', boxShadow: '0 0 10px rgba(138, 43, 226, 0.3)', color: '#fff' }}>
            ⚙️
          </button>
        </div>
      </div>

      {showHistoryModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={{...modalStyles.card, borderColor: '#ffe600'}}>
            <div style={modalStyles.header}>
              <h3 style={{...modalStyles.title, color: '#ffe600'}}>🕒 Historial Global</h3>
              <button onClick={() => setShowHistoryModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>
            
            <div style={modalStyles.contentArea}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#ffe600', fontWeight: 'bold' }}>Cargando...</div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#ff99dd' }}>No hay registros recientes.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historyLogs.map((log) => (
                    <div key={log.id} style={modalStyles.historyItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: '#fff' }}>{log.title}</strong>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: log.amount >= 0 ? '#00ffaa' : '#ff1493' }}>
                          {log.amount > 0 ? `+${log.amount}` : log.amount} CLICK
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#ff99dd' }}>{log.description}</div>
                      <div style={{ fontSize: '9px', color: '#888', marginTop: '6px', textAlign: 'right' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div style={modalStyles.overlay}>
          <div className="fade-in" style={modalStyles.card}>
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>Click Network</h3>
              <button onClick={() => setShowInfoModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button onClick={() => handleLanguageChange('es')} style={modalStyles.langBtn(lang === 'es', '#ff1493')}>🇪🇸 Español</button>
              <button onClick={() => handleLanguageChange('en')} style={modalStyles.langBtn(lang === 'en', '#00f0ff')}>🇬🇧 English</button>
            </div>

            <div style={modalStyles.tabContainer}>
              <button onClick={() => setInfoTab('support')} style={modalStyles.tab(infoTab === 'support')}>{t('support_tab')}</button>
              <button onClick={() => setInfoTab('about')} style={modalStyles.tab(infoTab === 'about')}>{t('about_tab')}</button>
              <button onClick={() => setInfoTab('terms')} style={modalStyles.tab(infoTab === 'terms')}>{t('terms_tab')}</button>
            </div>

            <div style={modalStyles.contentArea}>
              {infoTab === 'support' && (
                <div>
                  <h4 style={{ color: '#00f0ff', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900' }}>{t('support_title')}</h4>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={modalStyles.linkBox}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>💡</div>
                    <div style={{ fontWeight: '900', color: '#00f0ff', fontSize: '14px' }}>{t('support_idea_title')}</div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>{t('support_idea_desc')} <b>@TheDannyWeb3</b>.</div>
                  </a>
                  <a href="https://t.me/TheDannyWeb3" target="_blank" rel="noopener noreferrer" style={{ ...modalStyles.linkBox, borderColor: '#ff1493', background: 'rgba(255, 20, 147, 0.1)' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🐛</div>
                    <div style={{ fontWeight: '900', color: '#ff41b4', fontSize: '14px' }}>{t('support_bug_title')}</div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>{t('support_bug_desc')} <b>@TheDannyWeb3</b>.</div>
                  </a>
                </div>
              )}
              {infoTab === 'about' && (
                <div>
                  <h4 style={{ color: '#ffe600', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900' }}>{t('about_title')}</h4>
                  <p style={{ marginBottom: '10px' }}>{t('about_p1')}</p>
                  <p style={{ marginBottom: '10px' }}>{t('about_p2')}</p>
                  <p>{t('about_p3')}</p>
                  <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#888' }}>Versión 1.0.0 (Build 2026)</div>
                </div>
              )}
              {infoTab === 'terms' && (
                <div>
                  <h4 style={{ color: '#00ffaa', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '900' }}>{t('terms_title')}</h4>
                  <p style={{ fontSize: '11px', marginBottom: '10px' }}>{t('terms_subtitle')}</p>
                  <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>{t('terms_1')}</li>
                    <li>{t('terms_2')}</li>
                    <li>{t('terms_3')}</li>
                    <li>{t('terms_4')}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
